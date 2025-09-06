import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Path til denne komponentmappe
const basePath = __dirname;

// 1. Serve rendered Handlebars markup
router.get('/components/pages/home/home-markup', (req, res) => {
    res.render(path.join(basePath, 'home.hbs'), { layout: false, ...req.query });
});

// 2. Serve JS og CSS som statiske filer

router.get('/components/pages/home/home-components', (req, res) => {
  res.type('application/javascript');
  res.sendFile(path.join(__dirname, `home.components.js`));
});

router.get('/components/pages/home/home-script', (req, res) => {
  res.type('application/javascript');
  res.sendFile(path.join(__dirname, `home.js`));
});

router.get('/components/pages/home/home-styles', (req, res) => {
  res.type('text/css');
  res.sendFile(path.join(__dirname, `home.css`));
});

export default router;
