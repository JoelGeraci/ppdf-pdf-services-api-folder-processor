/*
node metadata-to-csv.js "meta" metadata_for_DeepRes.csv
*/

import fs from 'fs';
import path from 'path';
import mime from 'mime-types';
import walk from 'walk';

let inputFolderPath, outputFileName;
let args = process.argv.slice(2);
if (fs.existsSync(args[0])) {
    inputFolderPath = args[0];
    console.log('🚀 : Input Folder Path:', inputFolderPath);
}
else {
    console.log(`🚀 : Input folder ${inputFolderPath} does not exist.`);
}
if (args[1]) {
    outputFileName = args[1];
    console.log('🚀 : Output Filename:', outputFileName);
}
else {
    console.log(`🚀 : No output file specified`)
}
let columns = ["Filename", "Title", "Author", "Subject", "Keywords", "Producer", "Creator", "CreationDate", "ModDate", "NumPages"];
let columnsAsString = JSON.stringify(columns);
let columnHead = columnsAsString.substring(1, columnsAsString.length - 1);
fs.writeFileSync(outputFileName, columnHead + "\n");

let walker = walk.walk(inputFolderPath, { followLinks: false });
walker.on('file', async function (root, file, next) {
    if (!file.name.startsWith('.')) {
        let pdfFilename = file.name.replace("_properties.json", ".pdf");
        console.log("❗️​ : pdfFilename:", pdfFilename);
        let row = new Array(columns.length);
        row[columns.indexOf("Filename")] = pdfFilename;
        var json = JSON.parse(fs.readFileSync(inputFolderPath + "/" + file.name, 'utf8'));
        if (json.hasOwnProperty("document")) {
            if (json.document.hasOwnProperty("page_count")) {
                row[columns.indexOf("NumPages")] = json.document.page_count;
            }
            let documentMeta = json.document;
            if (documentMeta.hasOwnProperty("info_dict")) {
                let info_dict = documentMeta.info_dict;
                if (info_dict.hasOwnProperty("Title")) {
                    row[columns.indexOf("Title")] = info_dict.Title;
                }
                if (info_dict.hasOwnProperty("Author")) {
                    row[columns.indexOf("Author")] = info_dict.Author;
                }
                if (info_dict.hasOwnProperty("ModDate")) {
                    row[columns.indexOf("ModDate")] = info_dict.ModDate;
                }
                if (info_dict.hasOwnProperty("Creator")) {
                    row[columns.indexOf("Creator")] = info_dict.Creator;
                }
                if (info_dict.hasOwnProperty("Producer")) {
                    row[columns.indexOf("Producer")] = info_dict.Producer;
                }
                if (info_dict.hasOwnProperty("CreationDate")) {
                    row[columns.indexOf("CreationDate")] = info_dict.CreationDate;
                }
            }
        }
        let rowAsString = JSON.stringify(row).substring(1, JSON.stringify(row).length-1);
        fs.appendFileSync(outputFileName, rowAsString + "\n");
    }
    next();
});

