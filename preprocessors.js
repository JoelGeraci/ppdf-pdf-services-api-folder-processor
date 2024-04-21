import XMLParser from 'fast-xml-parser';
import JSZip from "jszip";
import fs from 'fs';

sequence = fs.readFileSync("input/Gotham Book.docx", 'utf8');

const parser = new XMLParser();
let jObj = parser.parse(XMLdata);