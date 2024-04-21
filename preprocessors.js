import { XMLParser } from 'fast-xml-parser';
import StreamZip from 'node-stream-zip';
import fs from 'fs';

const parser = new XMLParser({ ignoreAttributes: false });

export async function willFontsSubstitute(filePath) {
    const zip = new StreamZip.async({ file: filePath });
    const data = await zip.entryData('word/fontTable.xml');
    await zip.close();
    const json = parser.parse(data.toString());
    const fontList = json["w:fonts"]["w:font"];
    for (let i = 0; i < fontList.length; i++) {
        let font = fontList[i];
        if (font.hasOwnProperty("w:notTrueType")) {
            let fontName = font["@_w:name"];
            console.log("🚀 : Font Embedding Check :", filePath, "-", fontName, "does not contain TrueType outlines and was not embedded.");
            let fontOnServer = isFontOnServer(fontName);
            if (fontOnServer == true) {
                console.log("🚀 : Font Embedding Check :", filePath, "-", fontName, "may be available on the server.");
                return false;
            }
            else {
                console.log("🚀 : Font Embedding Check :", filePath, "-", fontName, "may be sustituted.");
                return true;
            }
        }
    }
    return false;
}

function getServerFonts() {
    let serverFontsFile = fs.readFileSync('config/create-pdf-fonts.txt');
    let serverFonts = serverFontsFile.toString().split("\r\n");
    return serverFonts;
}

function isFontOnServer(fontName) {
    let nameParts = fontName.split(' ');
    let filteredFonts = serverFonts;
    for (let i = 0; i < nameParts.length; i++) {
        let pattern = nameParts[i];
        filteredFonts = filteredFonts.filter(function (str) { return str.includes(pattern); });
    }
    if (filteredFonts.length > 0) {
        return true;
    }
    else {
        return false;
    }
}

let serverFonts = getServerFonts();



