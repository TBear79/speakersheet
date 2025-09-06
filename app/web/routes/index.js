import express from 'express';
import fs from 'fs';
import path from 'path';
import { readPdfJson } from '../../pdf/readPdf.js';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = express.Router();

const componentsRoot = path.join(__dirname, '../components');

const atomicGroups = ['organisms', 'pages', 'hooks'];

for (const group of atomicGroups) {
  const groupPath = path.join(componentsRoot, group);
  if (!fs.existsSync(groupPath)) continue;

  const components = fs.readdirSync(groupPath);
  for (const name of components) {
    const routeFile = path.join(groupPath, name, `${name}.route.js`);
    if (fs.existsSync(routeFile)) {
      const url = pathToFileURL(routeFile).href;
      const componentRouter = await import(url);
      router.use(componentRouter.default);
    }
  }
}

router.get('/components/:category(atoms|molecules)/:component/:type', (req, res, next) => {
  const { category, component, type } = req.params;

  if (!/^[a-z0-9-]+$/.test(component)) {
    return res.status(400).send('Invalid component name');
  }
  const typePattern = new RegExp(`^${component}-(script|styles|markup)$`);
  if (!typePattern.test(type)) {
    return res.status(400).send('Invalid type');
  }

  const typeFileMapping = {
    script: 'js',
    styles: 'css',
    markup: 'html', 
  };

  // udtræk suffix (script|styles|markup) fra type
  const suffix = type.match(/(script|styles|markup)$/)[1];
  const fileName = `${component}.${typeFileMapping[suffix]}`;

  const componentsRoot = path.join(__dirname, '../components');
  const absPath = path.join(componentsRoot, category, component, fileName);

  res.sendFile(absPath, (err) => {
    if (err) {
      if (err.code === 'ENOENT') return res.status(404).send('File not found');
      return next(err);
    }
  });
});

router.get('/', (req, res) => {
  const isSpa = req.headers['x-spa-request'] === 'true';
  res.render('home', { 
    title: 'SpeakerSheet',
    layout: isSpa ? false : 'main'
  });
});

router.get('/create-speakersheet', (req, res) => {
  const isSpa = req.headers['x-spa-request'] === 'true';
  res.render('view-speakersheet', { 
    title: 'Opret ny foredragsholderliste',
    layout: isSpa ? false : 'main',
    initialLoad: JSON.stringify({})
  });
});

router.post('/edit-speakersheet', express.raw({ type: 'application/pdf' }), async (req, res) => {
  const isSpa = req.headers['x-spa-request'] === 'true';

  const pdfData = await readPdfJson(req.body)

  res.render('view-speakersheet', { 
    title: 'Rediger foredragsholderliste',
    layout: isSpa ? false : 'main',
    initialLoad: JSON.stringify(pdfData)
  });
});

router.get('/edit-speakersheet', (req, res) => {
  const isSpa = req.headers['x-spa-request'] === 'true';
  res.render('view-speakersheet', { 
    title: 'Rediger ny foredragsholderliste',
    layout: isSpa ? false : 'main'
  });
});


router.post('/upload', (req, res) => {
  // parse uploaded PDF with pdf-lib
});

router.post('/generate', (req, res) => {
  // generate PDF and send as download
});

export default router;