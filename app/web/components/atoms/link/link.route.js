import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 1. Serve rendered Handlebars markup
router.get('/components/atoms/link', (req, res) => {
  res.render(path.join(__dirname, 'link.hbs'), {
    layout: false,
    ...req.query
  });
});

// 2. Serve JS og CSS som statiske filer
router.get('/components/atoms/link/script', (req, res) => {
  res.type('application/javascript');
  res.sendFile(path.join(__dirname, `link.js`));
});

router.get('/components/atoms/link/styles', (req, res) => {
  res.type('text/css');
  res.sendFile(path.join(__dirname, `link.css`));
});

export default router;
