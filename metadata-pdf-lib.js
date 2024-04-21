/*
node metadata-pdf-lib.js
*/
import fs from 'fs';
import readline from 'readline';
import { PDFDocument } from 'pdf-lib';

async function processLineByLine() {
    const fileStream = fs.createReadStream('inputList.txt');

    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });
    // Note: we use the crlfDelay option to recognize all instances of CR LF
    // ('\r\n') in input.txt as a single line break.

    for await (const filename of rl) {
        // Each line in input.txt will be successively available here as `line`.
        let filePath = "DeepRes/" + filename.trim();
        console.log(filePath);
        const arrayBuffer = fs.readFileSync(filePath);
        const pdf = await PDFDocument.load(arrayBuffer);

        let row = new Array(columns.length);
        row[columns.indexOf("Filename")] = filename;
        row[columns.indexOf("Title")] = pdf.getTitle();
        row[columns.indexOf("Author")] = pdf.getAuthor();
        row[columns.indexOf("Subject")] = pdf.getSubject();
        row[columns.indexOf("Keywords")] = pdf.getKeywords();
        if (pdf.getProducer() != "pdf-lib (https://github.com/Hopding/pdf-lib)") {
            row[columns.indexOf("Producer")] = pdf.getProducer();
        }
        if (pdf.getCreator() != "pdf-lib (https://github.com/Hopding/pdf-lib)") {
            row[columns.indexOf("Creator")] = pdf.getCreator();
        }
        
        try {
            row[columns.indexOf("CreationDate")] = pdf.getCreationDate();
        }
        catch (e) {
            //
        }
        try {
            row[columns.indexOf("ModDate")] = pdf.getModificationDate();
        }
        catch (e) {
            //
        }
        row[columns.indexOf("NumPages")] = pdf.getPageCount();

        let rowAsString = JSON.stringify(row).substring(1, JSON.stringify(row).length - 1);
        fs.appendFileSync("even-more-metadata.csv"
            , rowAsString + "\n");
    }
}

let columns = ["Filename", "Title", "Author", "Subject", "Keywords", "Producer", "Creator", "CreationDate", "ModDate", "NumPages"];
let columnsAsString = JSON.stringify(columns);
let columnHead = columnsAsString.substring(1, columnsAsString.length - 1);
fs.writeFileSync("even-more-metadata.csv", columnHead + "\n");
processLineByLine();