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
router.get('/components/organisms/header/header-markup', (req, res) => {
  res.render(path.join(basePath, 'header.hbs'), {
    layout: false,
    ...req.query
  });
});

// 2. Serve JS og CSS som statiske filer
router.get('/components/organisms/header/header-script', (req, res) => {
  res.type('application/javascript');
  res.sendFile(path.join(__dirname, `header.js`));
});

router.get('/components/organisms/header/header-styles', (req, res) => {
  res.type('text/css');
  res.sendFile(path.join(__dirname, `header.css`));
});

export default router;
