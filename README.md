# Sequencer.js
Use this application to run a sequence of [Adobe Acrobat Services](https://developer.adobe.com/document-services/ "Reimagine document experiences with PDF APIs designed for developers") operations on a folder full of input files. Files will be processed using the operations in the order they are in the sequence array and with the parameters you set in each sequence object in the file.

## Prerequisites
Developing with the [Adobe Acrobat Services API](https://developer.adobe.com/document-services/ "Reimagine document experiences with PDF APIs designed for developers") requires an Adobe-provided credential. If you don't already have credentials, Adobe offers a free tier. Click [here](https://acrobatservices.adobe.com/dc-integration-creation-app-cdn/main.html?api=pdf-services-api), and complete the workflow. Be sure to copy and save the credential values to a secure location.

## Install
From the root directory, run ``npm install``. All dependencies should install automatically.

For convenience, the application uses ```dotenv``` to set the environment variables if you are not using another method. If you choose to leverage ```dotenv```, create a file named ".env" in the roort directory of the application and add your client id and secret from the credentials you recieved from Adobe. The application will run using either the free or the paid credentials.

<pre>
CLIENT_ID="YOUR_CLIENT_ID"
CLIENT_SECRET="YOUR_CLIENT_SECRET"
</pre>

## Use

``
node sequencer.js INPUT_FOLDER OUTPUT_FOLDER SEQUENCE_FILENAME
``

#### Examples
``
node sequencer.js input output sequences/create-from-office.json
``

``
node sequencer.js "~in" "~out" sequences/extract.json

node sequencer.js "~in" "~out" sequences/extract.json moveCompletedToOutput=true

node sequencer.js "~in" "~out" sequences/create-from-office.json

node sequencer.js "~in" "~out" sequences/properties.json

node sequencer.js "~in" "~out" sequences/ocr.json

node sequencer.js "~in" "~out" sequences/html_zip.json

node sequencer.js "~in" "~out" sequences/autotag.json


### Document Generation - JSON sets
node generate-documents.js "dg_templates/DocumentGenerationSimpleTemplate.docx" "mergedata/shortTest" "~out" emptyOutputFirst=true

node generate-documents.js "dg_templates/STACK.aero/Forte/CQ_SA-Modern_A4_R2_01.01.docx" "mergedata/STACK.aero" "~out" emptyOutputFirst=true


### Document Generation - Individual JSON
node generate-documents.js "dg_templates/STACK.aero/Forte/CA_SA-Modern_eSign_A4_01.01.docx" "mergedata/STACK.aero/individual/CA-22010133.json" "~out" emptyOutputFirst=false

node generate-documents.js "dg_templates/STACK.aero/Forte/CQ_SA-Modern_A4_R2_01.01.docx" "mergedata/STACK.aero/individual/CQ-22010133.json" "~out" "emptyOutputFirst=false"

node generate-documents.js "dg_templates/STACK.aero/Forte/CQ_SA-Modern_A4_R2_01.01.docx" "mergedata/STACK.aero/individual/CQ-22010133.json" "~out" "emptyOutputFirst=false"

node generate-documents.js "dg_templates/STACK.aero/Forte/FB_SA-Modern_A4_01.01.docx" "mergedata/STACK.aero/individual/FB-22010133.json" "~out" "emptyOutputFirst=false"

node generate-documents.js "dg_templates/STACK.aero/Forte/II_SA-Modern_A4-new_01.01.docx" "mergedata/STACK.aero/individual/II-2200084.json" "~out" "emptyOutputFirst=false"

node generate-documents.js "dg_templates/STACK.aero/Forte/IS_SA-Modern_A4-new_01.01.docx" "mergedata/STACK.aero/individual/IS-2200084.json" "~out" "emptyOutputFirst=false"

node generate-documents.js "dg_templates/STACK.aero/Forte/OM_SA-Modern_A4_01.01.docx" "mergedata/STACK.aero/individual/OM-22010133.json" "~out" "emptyOutputFirst=false"

### All
node generate-documents.js "dg_templates/STACK.aero/Forte/CA_SA-Modern_eSign_A4_01.02.docx" "mergedata/STACK.aero/individual/CA-22010133.json" "~out" emptyOutputFirst=false;
node generate-documents.js "dg_templates/STACK.aero/Forte/CQ_SA-Modern_A4_R2_01.02.docx" "mergedata/STACK.aero/individual/CQ-22010133.json" "~out" "emptyOutputFirst=false";
node generate-documents.js "dg_templates/STACK.aero/Forte/FB_SA-Modern_A4_01.02.docx" "mergedata/STACK.aero/individual/FB-22010133.json" "~out" "emptyOutputFirst=false";
node generate-documents.js "dg_templates/STACK.aero/Forte/II_SA-Modern_A4-new_01.02.docx" "mergedata/STACK.aero/individual/II-2200084.json" "~out" "emptyOutputFirst=false";
node generate-documents.js "dg_templates/STACK.aero/Forte/IS_SA-Modern_A4-new_01.02.docx" "mergedata/STACK.aero/individual/IS-2200084.json" "~out" "emptyOutputFirst=false"








``

## Sequence Files

A "sequence file" is an array of JSON objects where each object has two properties, "operation" and "parameters". Several examle sequence files are included in the "sequences" folder.

The operation values are identical to the last word of the corresponding [Adobe Acrobat Services REST API](https://developer.adobe.com/document-services/docs/apis/ "Adobe Acrobat Services REST API Documentation") endpoint.

### Supported operations are:
| Operation | Description | Operation Id |
| - | - | - |
| PDF Accessibility Auto-Tag | Operation to create the tagged pdf and excel report for accessibility auto-tag use case. | autotag |
| Extract PDF | Extract content from PDF documents and output it in a structured JSON format, along with tables and figures | extractpdf |
| Create PDF | Create PDF document from Microsoft Office documents (Word, Excel and PowerPoint) and Image file formats. | createpdf |
| Export PDF | Convert a PDF File to a non-PDF File | exportpdf |
| OCR | Perform OCR on a PDF File | ocr |
| HTML to PDF | Convert HTML Resources to a PDF File | htmltopdf |
| Protect PDF | Add encryption and/or restrict permissions on a PDF File | protectpdf |
| Compress PDF | Compress a PDF File | compresspdf |
| PDF To Images | Convert a PDF File to image files | pdftoimages |
| Linearize PDF | Convert a PDF File to a Linearized or Web Optimized PDF File | linearizepdf |
| PDF Properties | Extract basic information about a PDF document | pdfproperties |
| Remove Protection | Remove password protection from a PDF File | removeprotection |

### Unsupported operations are:
- splitpdf
- documentgeneration
- electronicseal
- combinepdf
- pagemanipulation'

The parameters are also identical to the parameters used in the REST API minus the assetID.

An example sequence file is below. This sequence will...
1. Convert Microsoft Office files to PDF
2. Compress them
3. Optimize them for "fast web view"
4. Apply a password to limit printing to low quality and prevent all changes to the document other than commenting.

<pre>
[
    {
        "operation": "createpdf",
        "parameters": {
            "documentLanguage": "en-US"
        }
    },
    {
        "operation": "compresspdf",
        "parameters": {
            "compressionLevel": "HIGH"
        }
    },
    {
        "operation": "linearizepdf"
    },
    {
        "operation": "protectpdf",
        "parameters": {
            "passwordProtection": {
                "ownerPassword": "1234567890"
            },
            "encryptionAlgorithm": "AES_256",
            "contentToEncrypt": "ALL_CONTENT",
            "permissions": [
                "PRINT_LOW_QUALITY",
                "EDIT_ANNOTATIONS"
            ]
        }
    }
]
</pre>

# License
<p xmlns:cc="http://creativecommons.org/ns#" xmlns:dct="http://purl.org/dc/terms/"><a property="dct:title" rel="cc:attributionURL" href="https://github.com/JoelGeraci/pdf-services-api-folder-processor.git">The practicalPDF Inc. Folder Processor for Adobe Acrobat Services</a> by <a rel="cc:attributionURL dct:creator" property="cc:attributionName" href="https://github.com/JoelGeraci/">Joel Geraci</a> is licensed under <a href="https://creativecommons.org/licenses/by-sa/4.0/?ref=chooser-v1" target="_blank" rel="license noopener noreferrer" style="display:inline-block;">CC BY-SA 4.0<img style="height:22px!important;margin-left:3px;vertical-align:text-bottom;" src="https://mirrors.creativecommons.org/presskit/icons/cc.svg?ref=chooser-v1" alt=""><img style="height:22px!important;margin-left:3px;vertical-align:text-bottom;" src="https://mirrors.creativecommons.org/presskit/icons/by.svg?ref=chooser-v1" alt=""><img style="height:22px!important;margin-left:3px;vertical-align:text-bottom;" src="https://mirrors.creativecommons.org/presskit/icons/sa.svg?ref=chooser-v1" alt=""></a></p>

This license requires that reusers give credit to the creator. It allows reusers to distribute, remix, adapt, and build upon the material in any medium or format, even for commercial purposes. If others remix, adapt, or build upon the material, they must license the modified material under identical terms.

node sequencer.js "DeepRes-Set-153a__pdf__Part_6_of_7" "DeepRes-Set-153a__meta__Part_6_of_7" sequences/properties.json

