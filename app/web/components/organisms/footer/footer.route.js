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
router.get('/components/organisms/footer/footer-markup', (req, res) => {
  res.render(path.join(basePath, 'footer.hbs'), {
    layout: false,
    ...req.query
  });
});

// 2. Serve JS og CSS som statiske filer
router.get('/components/organisms/footer/footer-script', (req, res) => {
  res.type('application/javascript');
  res.sendFile(path.join(__dirname, `footer.js`));
});

router.get('/components/organisms/footer/footer-styles', (req, res) => {
  res.type('text/css');
  res.sendFile(path.join(__dirname, `footer.css`));
});

export default router;
