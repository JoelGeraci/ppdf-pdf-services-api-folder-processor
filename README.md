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
node sequencer.js INPUT_FOLDER OUTPUT_FOLDER SEQUENCE_FILENAME [moveCompletedToOutput=true]
``

#### Examples
``
node sequencer.js "files/input" "files/output" sequences/create-from-office.json moveCompletedToOutput=true
``

``
node sequencer.js "files/input" "files/output" sequences/create-compress-linearize-protect.json moveCompletedToOutput=true
``

## Sequence Files

A "sequence file" is an array of JSON objects where each object has two properties, "operation" and "parameters". The parameters are identical to the parameters used in the REST API minus the assetID.

Several examle sequence files are included in the "sequences" folder. 

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
- pagemanipulation

An example sequence file is below. This sequence will...
1. Convert all of the Microsoft Office files in the inpout folder to PDF.
2. Compress the resulting PDF files.
3. Optimize the compressed files for "fast web view".
4. Apply the same password to the optimized files to limit printing to low quality and prevent all changes to the document other than commenting.

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
<a href="https://creativecommons.org">The practicalPDF Inc. Folder Processor for Adobe Acrobat Services</a> © 2025 by <a href="https://creativecommons.org">Joel Geraci</a> is licensed under <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/">CC BY-NC-SA 4.0</a><img src="https://mirrors.creativecommons.org/presskit/icons/cc.svg" alt="" style="max-width: 1em;max-height:1em;margin-left: .2em;"><img src="https://mirrors.creativecommons.org/presskit/icons/by.svg" alt="" style="max-width: 1em;max-height:1em;margin-left: .2em;"><img src="https://mirrors.creativecommons.org/presskit/icons/nc.svg" alt="" style="max-width: 1em;max-height:1em;margin-left: .2em;"><img src="https://mirrors.creativecommons.org/presskit/icons/sa.svg" alt="" style="max-width: 1em;max-height:1em;margin-left: .2em;">

This license requires that reusers give credit to the creator. It allows reusers to distribute, remix, adapt, and build upon the material in any medium or format, for noncommercial purposes only. If others modify or adapt the material, they must license the modified material under identical terms.
