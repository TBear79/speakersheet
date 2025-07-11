import { readPdf } from '../../app/pdf/readPdf.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const inputPath = path.join(__dirname, '../create-pdf-template/output/pdf-skabelon.pdf');

const run = async () => {
  try {
    const json = await readPdf(inputPath);
    console.log(JSON.stringify(json, null, 4));
  } catch (err) {
    console.error(`❌ Fejl: ${err.message}`);
  }
};

run();