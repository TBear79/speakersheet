import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Path til denne komponentmappe
const basePath = __dirname;

// 1. Serve rendered Handlebars markup
router.get('/components/pages/new/new-markup', (req, res) => {
  res.render(path.join(basePath, 'new.hbs'), {
    layout: false,
    ...req.query
  });
});

// 2. Serve JS og CSS som statiske filer
router.get('/components/pages/new/new-script', (req, res) => {
  res.type('application/javascript');
  res.sendFile(path.join(__dirname, `new.js`));
});

router.get('/components/pages/new/new-styles', (req, res) => {
  res.type('text/css');
  res.sendFile(path.join(__dirname, `new.css`));
});

export default router;
