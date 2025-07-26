import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 1. Serve rendered Handlebars markup
router.get('/components/molecules/logo', (req, res) => {
  res.render(path.join(__dirname, 'logo.hbs'), {
    layout: false,
    ...req.query
  });
});

// 2. Serve JS og CSS som statiske filer
router.get('/components/molecules/logo/logo.js', (req, res) => {
  res.type('application/javascript');
  res.sendFile(path.join(__dirname, `logo.js`));
});

router.get('/components/molecules/logo/logo.css', (req, res) => {
  res.type('text/css');
  res.sendFile(path.join(__dirname, `logo.css`));
});

router.get('/components/molecules/logo/logo.png', (req, res) => {
  res.type('image/png');
  res.sendFile(path.join(__dirname, `logo.png`));
});

export default router;
