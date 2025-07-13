import { PDFDocument } from 'pdf-lib';
import fs from 'fs/promises';

export async function readPdf(filePath) {
    const fileBuffer = await fs.readFile(filePath);
    const pdfDoc = await PDFDocument.load(fileBuffer);
    const form = pdfDoc.getForm();

    const metaField = form.getTextField('_meta');
    const jsonString = metaField.getText();

    try {
        return JSON.parse(jsonString);
    } catch (err) {
        throw new Error('Failed to parse JSON from PDF _meta field');
    }
}