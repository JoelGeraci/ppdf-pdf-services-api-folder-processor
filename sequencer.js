/*
The practicalPDF Inc. Folder Processor for Adobe Acrobat Services © 2025
by Joel Geraci is licensed under Creative Commons BY-NC-SA 4.0 
https://creativecommons.org/licenses/by-nc-sa/4.0/
See README.md for details.
*/

import "dotenv/config";
import fs from "fs";
import path from "path";
import mime from "mime-types";
import walk from "walk";
import { Readable } from "stream";
import { finished } from "stream/promises";

import { willFontsSubstitute } from "./preprocessors.js";

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const POLLING_DELAY = 1000;

const REST_API = "https://pdf-services-ue1.adobe.io/";
const UNSUPPORTED_OPERATIONS = ["splitpdf", "documentgeneration", "electronicseal", "combinepdf", "pagemanipulation"];
const ZERO_PAD_LENGTH = 5

let additionalParameters = {};

process.stdout.write("\u001b[3J\u001b[2J\u001b[1J");
console.clear();

async function getAccessToken(clientId, clientSecret) {
    const params = new URLSearchParams();
    params.append("client_secret", clientSecret);
    params.append("grant_type", "client_credentials");
    params.append("scope", "openid,AdobeID,read_organizations");
    let response = await fetch(`https://ims-na1.adobelogin.com/ims/token/v2?client_id=${clientId}`,
        {
            method: "POST",
            body: params
        }
    );
    let data = await response.json();
    if (data.hasOwnProperty("access_token")) {
        return data.access_token;
    }
    if (data.hasOwnProperty("error")) {
        console.log(`❗️ : getAccessToken : error:, ${error.code} - ${error.message}`);
    }
}

async function createJob(operation, callBody, clientId, token) {
    let response = await fetch(`${REST_API}operation/${operation}`, {
        method: "post",
        headers: {
            "X-API-Key": clientId,
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        body: callBody
    });
    if (response.status == 201) {
        return response.headers.get("location");
    }
    else {
        let error = await response.json();
        console.log("❗️ : createJob : error: " + JSON.stringify(error));
        process.exit();
    }
}

async function delay(x) {
    return new Promise(resolve => {
        setTimeout(() => resolve(), x);
    });
}

async function pollJob(url, clientId, token) {
    let status = null;
    let response;
    while (status !== "done") {
        let req = await fetch(url, {
            method: "GET",
            headers: {
                "X-API-Key": clientId,
                "Authorization": `Bearer ${token}`,
            }
        });
        let res = await req.json();
        status = res.status;
        if (status === "failed") {
            response = res.error;
            console.log("❗️ : pollJob Error : response:" + JSON.stringify(res));
            break;
        }
        else if (status === "done") {
            response = res;
        }
        else {
            await delay(POLLING_DELAY);
        }
    }
    return response;
}

async function getDocumentData(mediaType, clientId, token) {
    let body = {
        "mediaType": mediaType
    };
    body = JSON.stringify(body);

    let req = await fetch(REST_API + "/assets", {
        method: "post",
        headers: {
            "X-API-Key": clientId,
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        body: body
    });
    let data = await req.json();
    return data;
}

async function uploadAsset(url, filePath, mediaType) {
    let stream = fs.createReadStream(filePath);
    let stats = fs.statSync(filePath);
    let fileSizeInBytes = stats.size;

    let upload = await fetch(url, {
        method: "PUT",
        redirect: "follow",
        headers: {
            "Content-Type": mediaType,
            "Content-Length": fileSizeInBytes
        },
        duplex: "half",
        body: stream
    });
    stream.destroy();
    return upload;
}

async function createAsset(inputFileName) {
    let documentMediaType = mime.lookup(inputFileName);
    let documentData = await getDocumentData(documentMediaType, CLIENT_ID, accessToken);
    if (documentData.hasOwnProperty("assetID") && documentData.hasOwnProperty("uploadUri")) {
        let upload = await uploadAsset(documentData.uploadUri, inputFileName, documentMediaType);
        if (upload.status === 200) {
            return documentData.assetID;
        }
        else {
            let error = await upload.json();
            console.log(`❗️ : createJob : error: ${error.message} - ${error.reason}`);
        }

    }
    else {
        return null;
    }
}

async function performOperation(assetID, operation, parameters) {
    let body = {};
    body.assetID = assetID;
    for (let prop in parameters) (
        body[prop] = parameters[prop]
    )
    switch (operation) {
        case "protectpdf":
            if (additionalParameters.hasOwnProperty("ownerPassword")) {
                if (body.hasOwnProperty("passwordProtection") == false) {
                    body.passwordProtection = {};
                }
                body.passwordProtection.ownerPassword = additionalParameters.ownerPassword;
            }
            if (additionalParameters.hasOwnProperty("userPassword")) {
                if (body.hasOwnProperty("passwordProtection") == false) {
                    body.passwordProtection = {};
                }
                body.passwordProtection.userPassword = additionalParameters.userPassword;
            }
            if (additionalParameters.hasOwnProperty("permissions")) {
                let permissions = String(additionalParameters.permissions).split(",");
                body.permissions = permissions;
            }
            break;
        default:
    }
    let job = await createJob(operation, JSON.stringify(body), CLIENT_ID, accessToken);

    let response;
    try {
        response = await pollJob(job, CLIENT_ID, accessToken);
    } catch (e) {
        console.log("error in createJob", operation, e);
    }
    return response;
}

function isSupportedFormat(fileExtension) {
    return createPdfSupportedFormats.allFormats.includes(fileExtension);
}

function isSupportedForCheckingFontSubstitution(fileExtension) {
    return createPdfSupportedFormats.fontCheck.includes(fileExtension);
}

async function verifyInputs(args) {
    let inputFolderPath, outputFolderPath, sequence;
    if (fs.existsSync(args[0])) {
        inputFolderPath = args[0];
        console.log("❗️ : Input Folder Path:", inputFolderPath);
    } else {
        console.log(`❗️ : Input folder ${inputFolderPath} does not exist.`);
    }

    if (fs.existsSync(args[1])) {
        outputFolderPath = args[1];
        console.log("❗️ : Output Folder Path:", outputFolderPath);
    } else {
        fs.mkdirSync(outputFolderPath);
        console.log(`❗️ : Output folder ${outputFolderPath} created.`)
    }
    let sequenceFile;
    if (fs.existsSync(args[2])) {
        sequenceFile = args[2];
        try {
            sequence = JSON.parse(fs.readFileSync(sequenceFile, "utf8"));
            if (!isSequenceSupported(sequence)) {
                //Process should have ended already but just in case...
                process.exit();
            }
        }
        catch (e) {
            console.log(`❗️ : Sequence file ${sequenceFile} cannot be parsed.`);
            return;
        }
    } else {
        console.log(`❗️ : Sequence file ${sequenceFile} does not exist.`);
        return;
    }
    if (args.length > 3) {
        let additionalParams = args.slice(3);
        console.log("❗️​ : verifyInputs : additionalParams:", additionalParams)
        for (let i = 0; i < additionalParams.length; i++) {
            let param = additionalParams[i].split("=");
            additionalParameters[param[0]] = param[1];
            console.log(`❗️ : ${param[0]} =  ${param[1]}`);
        }
    }

    accessToken = await getAccessToken(CLIENT_ID, CLIENT_SECRET);

    let filesNames = [];
    let startsWithCreate = false;
    if (sequence[0].operation == "createpdf") {
        startsWithCreate = true;
        console.log("❗️ : verifyInputs : startsWithCreate:", startsWithCreate)
    }

    let walker = walk.walk(inputFolderPath, { followLinks: false });
    walker.on("file", async function (root, file, next) {
        if (!file.name.startsWith(".")) {
            let extension = path.extname(file.name).substring(1);
            if (startsWithCreate == true) {
                if (extension != "pdf") {
                    if (createPdfSupportedFormats.allFormats.includes(extension) == true) {
                        if (config.preventFontSubstitutionOnCreate == true) {
                            if (createPdfSupportedFormats.fontCheck.includes(extension) == true) {
                                let fontsWillSubstitute = await willFontsSubstitute(root + "/" + file.name);
                                if (fontsWillSubstitute == false) {
                                    filesNames.push(root + "/" + file.name);
                                }
                            }
                            else {
                                filesNames.push(root + "/" + file.name);
                            }
                        }
                        else {
                            filesNames.push(root + "/" + file.name);
                        }
                    }
                }
            }
            else {
                filesNames.push(root + "/" + file.name);
            }

        }
        next();
    });
    console.log("❗️​ : verifyInputs : inputFolderPath:", inputFolderPath)
    walker.on("end", async function () {
        filesNames.sort();
        console.log("❗️ : Input Files : ", filesNames);
        for (let i = 0; i < filesNames.length; i++) {
            await processFile(filesNames[i], inputFolderPath, outputFolderPath, sequence);
        }
    });
}

function isSequenceSupported(sequence) {
    if (Array.isArray(sequence)) {
        for (let i = 0; i < sequence.length; i++) {
            let operation = sequence[i];
            if (UNSUPPORTED_OPERATIONS.includes(operation.operation)) {
                console.log(`❗️ : An Unsupported Operation "${operation.operation}" is being used in this sequence.`);
                process.exit();
            }
            if (operation.operation == "htmltopdf" && operation.parameters.hasOwnProperty("inputUrl")) {
                console.log(`❗️ : An Unsupported Parameter "inputUrl" is being used in the operation "${operation.operation}".`);
                process.exit();
            }
        }
    }
    else {
        console.log(`❗️ : The sequence JSON is not an array`);
        process.exit();
    }
    return true;
}

function sequenceHasCombine(sequence) {
    for (let i = 0; i < sequence.length; i++) {
        let operation = sequence[i];
        if (operation.operation == "combinepdf") {
            return true;
        }
        else {
            return false;
        }
    }
}

async function processFile(inputFileName, inputFolderPath, outputFolderPath, sequence) {
    let assetID = await createAsset(inputFileName);
    console.log("❗️ : Processing : ",inputFileName);
    let response, step, totalMillis = 0;
    for (let i = 0; i < sequence.length; i++) {
        step = sequence[i];
        let start = Date.now();
        response = await performOperation(assetID, step.operation, step.parameters);
        let millis = Date.now() - start;
        totalMillis += millis;
        console.log(`❗️ : Processing Time : ${step.operation} : ${(millis / 1000).toFixed(2)} seconds`);
        if (response) {
            switch (step.operation) {
                case "extractpdf":
                case "pdfproperties":
                case "pdftoimages":
                    response.operation = step.operation
                    saveOutput(outputFolderPath, inputFolderPath, inputFileName, response);
                    break;
                default:
                    if (response.hasOwnProperty("asset") && response.asset.hasOwnProperty("assetID")) {
                        assetID = response.asset.assetID;
                    }
            }
        }

    }
    if (sequence.length > 1) {
        console.log(`❗️ : Total Processing Time : ${(totalMillis / 1000).toFixed(2)} seconds`);

    }
    saveOutput(outputFolderPath, inputFolderPath, inputFileName, response);
}


async function saveOutput(outputFolderPath, inputFolderPath, inputFileName, response) {
    if (response.hasOwnProperty("status") && response.status == "done") {
        delete response.status;
        let operation;
        let fileNumber;
        if (response.hasOwnProperty("operation")) {
            if (response.operation == "pdfproperties") {
                saveJSONOutput(outputFolderPath, inputFileName, response);
                return;
            }
            else {
                operation = "_" + response.operation;
                delete response.operation;
            }
        }
        for (let prop in response) {
            if (Array.isArray(response[prop])) {
                let assetList = response[prop];
                if (assetList.length == 1 && assetList[0].hasOwnProperty("metadata") && assetList[0].metadata.type == "application/zip") {
                    await downloadAndSaveAsset(assetList[0], operation, outputFolderPath, inputFileName, fileNumber);
                }
                else {
                    for (let i = 0; i < assetList.length; i++) {
                        let asset = assetList[i];
                        fileNumber = "_" + String(i + 1).padStart(ZERO_PAD_LENGTH, "0");
                        await downloadAndSaveAsset(asset, "", inputFolderPath, outputFolderPath, inputFileName, fileNumber);
                    }
                }
            }
            else {
                let asset = response[prop];
                await downloadAndSaveAsset(asset, operation, inputFolderPath, outputFolderPath, inputFileName, fileNumber);
            }
        }
    }
}

async function downloadAndSaveAsset(asset, operation, inputFolderPath, outputFolderPath, inputFileName, fileNumber) {
    if (typeof fileNumber === "undefined") {
        fileNumber = "";
    }
    if (typeof operation === "undefined") {
        operation = "";
    }
    if (asset.hasOwnProperty("metadata") && asset.hasOwnProperty("downloadUri")) {
        let extension = mime.extension(asset.metadata.type);
        let outputFileName = inputFileName.replace(inputFolderPath, outputFolderPath);
        let outputPath = path.parse(outputFileName).dir;
        let name = path.parse(outputFileName).name;
        outputFileName = outputPath + "/" + name + operation + fileNumber + "." + extension;
        await downloadFile(outputFileName, asset.downloadUri);
    }
    if (additionalParameters["moveCompletedToOutput"] == "true") {
        fs.renameSync(inputFileName, inputFileName.replace(inputFolderPath, outputFolderPath));
    }
}

function saveJSONOutput(outputFolderPath, inputFilePath, response) {
    if (response.hasOwnProperty("metadata")) {
        let json = JSON.stringify(response.metadata);
        let extension = path.extname(inputFilePath);
        let inputFileName = path.basename(inputFilePath, extension);
        let outputFileName = outputFolderPath + "/" + inputFileName + "_properties.json"
        fs.writeFileSync(outputFileName, json);
        console.log("❗️ : Saved : ", outputFileName)
    }
}

async function downloadFile(outputFile, url) {
    const response = await fetch(url);
    const body = Readable.fromWeb(response.body);
    fs.mkdirSync(path.parse(outputFile).dir, { recursive: true });
    const download_write_stream = fs.createWriteStream(outputFile);
    await finished(body.pipe(download_write_stream));
    console.log("❗️ : Output Saved To : ", outputFile);
    console.log("");
}

function getCreatePdfSupportedFormats() {
    return JSON.parse(fs.readFileSync("config/create-pdf-supported-formats.json").toString());
}

function loadConfig() {
    return JSON.parse(fs.readFileSync("config/config.json").toString());
}

async function main() {
    if (process.env.CLIENT_ID && process.env.CLIENT_SECRET) {
        let args = process.argv.slice(2);
        if (args.length >= 3) {
            verifyInputs(args);
        }
    }
    else {
        console.log("❗️ : main : Environment vairables not set")
    }
}

let config = loadConfig();
let createPdfSupportedFormats = getCreatePdfSupportedFormats();
//console.log("❗️ : createPdfSupportedFormats:", JSON.stringify(createPdfSupportedFormats, null, 4))
let accessToken;
main();



