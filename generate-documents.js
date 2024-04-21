import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import mime from 'mime-types';
import walk from 'walk';
import { Readable } from 'stream';
import { finished } from 'stream/promises';

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const POLLING_DELAY = 1000;

const REST_API = 'https://pdf-services-ue1.adobe.io/';

process.stdout.write('\u001b[3J\u001b[2J\u001b[1J');
console.clear();

let accessToken;
let mergeDataObjects = [];

async function getAccessToken() {
    const params = new URLSearchParams();
    params.append('client_secret', CLIENT_SECRET);
    params.append('grant_type', 'client_credentials');
    params.append('scope', 'openid,AdobeID,read_organizations');
    let response = await fetch(`https://ims-na1.adobelogin.com/ims/token/v2?client_id=${CLIENT_ID}`,
        {
            method: 'POST',
            body: params
        }
    );
    let data = await response.json();
    if (data.hasOwnProperty('access_token')) {
        return data.access_token;
    }
    if (data.hasOwnProperty('error')) {
        console.log(`🚀 : getAccessToken : error:, ${error.code} - ${error.message}`);
    }
}

async function createAsset(inputFileName) {
    let documentMediaType = mime.lookup(inputFileName);
    let documentData = await getDocumentData(documentMediaType, accessToken);
    if (documentData.hasOwnProperty('assetID') && documentData.hasOwnProperty('uploadUri')) {
        let start = Date.now();
        let upload = await uploadAsset(documentData.uploadUri, inputFileName, documentMediaType);
        let millis = Date.now() - start;
        //console.log('🚀 : Upload Time : ', (millis/1000).toFixed(2), "seconds");
        if (upload.status === 200) {
            return documentData.assetID;
        }
        else {
            let error = await upload.json();
            console.log(`🚀 : createJob : error: ${error.message} - ${error.reason}`);
        }

    }
    else {
        return null;
    }
}

async function getDocumentData(mediaType, token) {
    let body = {
        'mediaType': mediaType
    };
    body = JSON.stringify(body);

    let req = await fetch(REST_API + '/assets', {
        method: 'post',
        headers: {
            'X-API-Key': CLIENT_ID,
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
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
        method: 'PUT',
        redirect: 'follow',
        headers: {
            'Content-Type': mediaType,
            'Content-Length': fileSizeInBytes
        },
        duplex: 'half',
        body: stream
    });
    stream.destroy();
    return upload;
}

async function createJob(callBody, token) {
    let response = await fetch(`${REST_API}operation/documentgeneration`, {
        method: 'post',
        headers: {
            'X-API-Key': CLIENT_ID,
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: callBody
    });
    if (response.status == 201) {
        return response.headers.get('location');
    }
    else {
        let error = await response.json();
        console.log('🚀 : createJob : error: ' + JSON.stringify(error));
        process.exit();
    }
}

async function delay(x) {
    return new Promise(resolve => {
        setTimeout(() => resolve(), x);
    });
}

async function pollJob(url, token) {
    let status = null;
    let response;
    while (status !== 'done') {
        let req = await fetch(url, {
            method: 'GET',
            headers: {
                'X-API-Key': CLIENT_ID,
                'Authorization': `Bearer ${token}`,
            }
        });
        let res = await req.json();
        status = res.status;
        if (status === 'failed') {
            response = res.error;
            console.log('🚀 : pollJob Error : response:' + JSON.stringify(res));
            break;
        }
        else if (status === 'done') {
            response = res;
        }
        else {
            await delay(POLLING_DELAY);
        }
    }
    return response;
}

async function generateDocument(templateAssetID, dataForMerge) {
    let body = {
        "assetID": templateAssetID,
        "outputFormat": "pdf",
        "jsonDataForMerge": dataForMerge.data
    }
    let job = await createJob(JSON.stringify(body), accessToken);
    let response;
    try {
        response = await pollJob(job, accessToken);
        //console.log("❗️​ : generateDocument : response:", response)
    } catch (e) {
        console.log('error in createJob', e);
    }
    //console.log("❗️​ : generateDocument : response:", JSON.stringify(response, null, 4));

    if (response.hasOwnProperty('status') && response.status == 'done') {
        if (response.hasOwnProperty("asset") &&
            response.asset.hasOwnProperty("metadata") &&
            response.asset.metadata.hasOwnProperty("type") &&
            response.asset.metadata.type == "application/pdf" &&
            response.asset.hasOwnProperty("downloadUri")) {
            let downloadUri = response.asset.downloadUri;
            //console.log("❗️​ : generateDocument : downloadUri:", downloadUri);
            return downloadUri;
        }
    }
}

function verifyInputs(args) {
    let templateFile, mergedataFolderPath, outputFolderPath;
    // Verify Template File
    if (fs.existsSync(args[0])) {
        templateFile = args[0];
        console.log("❗️​ : verifyInputs : templateFile:", templateFile);

    } else {
        console.log(`🚀 : Template ${templateFile} does not exist.`);
        return false;
    }

    // Verify or Create Output Folder - Optionally Empty
    outputFolderPath = args[2];
    if (fs.existsSync(outputFolderPath)) {
        console.log("❗️​ : verifyInputs : outputFolderPath:", outputFolderPath)
        if (args[3].startsWith("emptyOutputFirst")) {
            let emptyOutputFirst = args[3].split("=")[1]
            console.log("❗️​ : verifyInputs : emptyOutputFirst:", emptyOutputFirst);
            if (emptyOutputFirst == "true") {
                fs.rmSync(outputFolderPath, { recursive: true, force: true });
                fs.mkdirSync(outputFolderPath);
            }
        }
    }
    else {
        fs.mkdirSync(outputFolderPath);
    }

    // Verify and load mergedata
    if (fs.existsSync(args[1])) {
        mergedataFolderPath = args[1];
        console.log("❗️​ : verifyInputs : mergedataFolderPath:", mergedataFolderPath);

        if (fs.lstatSync(mergedataFolderPath).isDirectory()) {
            fs.readdirSync(mergedataFolderPath).forEach(fileName => {
                let jsonString = fs.readFileSync(`${mergedataFolderPath}/${fileName}`, 'utf8');
                let valid = isValidJSON(jsonString);
                console.log("❗️​ : fs.readdirSync : valid:", fileName, ": ", valid);
                if (valid == true) {
                    let data = JSON.parse(jsonString);
                    let mergeObject = {
                        "fileName": fileName,
                        "data": data
                    }
                    mergeDataObjects.push(mergeObject);
                }
            });
        }
        else if (fs.lstatSync(mergedataFolderPath).isFile()) {
            let jsonString = fs.readFileSync(`${mergedataFolderPath}`, 'utf8');
            let valid = isValidJSON(jsonString);
            if (valid == true) {
                let data = JSON.parse(jsonString);
                let mergeObject = {
                    "fileName": path.basename(mergedataFolderPath),
                    "data": data
                }
                mergeDataObjects.push(mergeObject);
            }
        }
        else {
            return false;
        }
        //console.log("❗️​ : fs.readdirSync : mergeDataObjects:", JSON.stringify(mergeDataObjects, null, 4));
        //console.log("❗️​ : verifyInputs : mergeDataObjects.length:", mergeDataObjects.length)
        if (mergeDataObjects.length == 0) {
            return false;
        }
        else {
            //console.log("❗️​ : fs.readdirSync : mergeDataObjects:", JSON.stringify(mergeDataObjects, null, 4));
            return true;
        }
    }
    else {
        return false;
    }
}

const isValidJSON = str => {
    try {
        JSON.parse(str);
        return true;
    } catch (e) {
        return false;
    }
};

async function downloadFile(outputFile, url) {
    const response = await fetch(url);
    const body = Readable.fromWeb(response.body);
    const download_write_stream = fs.createWriteStream(outputFile);
    await finished(body.pipe(download_write_stream));
    console.log('🚀 : downloadFile : outputFile:', outputFile)
}

async function main() {
    if (process.env.CLIENT_ID && process.env.CLIENT_SECRET) {
        let args = process.argv.slice(2);
        if (args.length == 4) {
            let inputsVerified = verifyInputs(args);
            console.log("❗️​ : main : inputsVerified:", inputsVerified);

            // Get Access Token
            accessToken = await getAccessToken();
            console.log("❗️​ : main : accessToken:", accessToken);

            // Place Template (Good for 24 Hours)
            let templateAssetID = await createAsset(args[0]);
            console.log("❗️​ : main : templateAssetID:", templateAssetID);

            // Generate the documents
            for (let i = 0; i < mergeDataObjects.length; i++) {
                let dataForMerge = mergeDataObjects[i];
                let generatedDocumentURL = await generateDocument(templateAssetID, dataForMerge);
                //console.log("❗️​ : main : generatedDocumentURL:", generatedDocumentURL);
                downloadFile(`${args[2]}/${dataForMerge.fileName.replace(".json", ".pdf")}`, generatedDocumentURL)
            }
        }
    }
    else {
        console.log('🚀 : main : Environment vairables not set')
    }
}

main();