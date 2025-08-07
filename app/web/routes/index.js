import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = express.Router();

const componentsRoot = path.join(__dirname, '../components');

const atomicGroups = ['atoms', 'molecules', 'organisms', 'pages', 'hooks'];

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