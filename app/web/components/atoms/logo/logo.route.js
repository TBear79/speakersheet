import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 1. Serve rendered Handlebars markup
router.get('/components/atoms/logo/logo-markup', (req, res) => {
  res.render(path.join(__dirname, 'logo.hbs'), {
    layout: false,
    ...req.query
  });
});

// 2. Serve JS og CSS som statiske filer
router.get('/components/atoms/logo/logo-script', (req, res) => {
  res.type('application/javascript');
  res.sendFile(path.join(__dirname, `logo.js`));
});

router.get('/components/atoms/logo/logo-styles', (req, res) => {
  res.type('text/css');
  res.sendFile(path.join(__dirname, `logo.css`));
});

router.get('/components/atoms/logo/logo-image', (req, res) => {
  res.type('image/png');
  res.sendFile(path.join(__dirname, `logo.png`));
});

export default router;
