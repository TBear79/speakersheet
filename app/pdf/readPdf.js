import { PDFDocument } from 'pdf-lib';
import fs from 'fs/promises';

export async function readPdfJsonFromFile(filePath) {
    const fileBuffer = await fs.readFile(filePath);
    return readPdfJson(fileBuffer);
}

export async function readPdfJson(pdfBytes) {
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();

    const metaField = form.getTextField('_meta');
    const jsonString = metaField.getText();

    try {
        return JSON.parse(jsonString);
    } catch (err) {
        throw new Error('Failed to parse JSON from PDF _meta field');
    }
}