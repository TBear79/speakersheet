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
router.get('/components/molecules/card', (req, res) => {
  res.render(path.join(basePath, 'card.hbs'), {
    layout: false,
    ...req.query
  });
});

// 2. Serve JS og CSS som statiske filer
router.get('/components/molecules/card/script', (req, res) => {
  res.type('application/javascript');
  res.sendFile(path.join(__dirname, `card.js`));
});

router.get('/components/molecules/card/styles', (req, res) => {
  res.type('text/css');
  res.sendFile(path.join(__dirname, `card.css`));
});

export default router;
