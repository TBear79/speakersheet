import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const mimeTypeMapping = {
    js: 'application/javascript',
    css: 'text/css'
};

// Path til denne komponentmappe
const basePath = __dirname;

// 1. Serve rendered Handlebars markup
router.get('/components/atoms/image', (req, res) => {
  res.render(path.join(basePath, 'image.hbs'), {
    layout: false,
    ...req.query
  });
});

// 2. Serve JS og CSS som statiske filer
router.get('/components/atoms/image/:fileExtension(js|css)', (req, res) => {
  const { fileExtension } = req.params;
  const fileName = `image.${fileExtension}`
  const filePath = path.join(basePath, fileName);

  const allowedFiles = ['image.js', 'image.css'];
  if (!allowedFiles.includes(fileName)) {
    return res.status(404).send('Not found');
  }

  res.type(mimeTypeMapping[fileExtension]);
  res.sendFile(filePath);
});

export default router;
