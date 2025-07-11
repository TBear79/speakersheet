import { createPdf } from '../../app/pdf/createPdf.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import metaJson from './templateData.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.join(__dirname, './output/pdf-skabelon.pdf');

const run = async () => {
  const buffer = await createPdf(metaJson);
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, buffer);
  console.log(`✅ Skabelon skrevet til: ${outPath}`);
};

run();
