import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

router.get('/components/atoms/link-button', (req, res) => {
  res.render(path.join(__dirname, 'link-button.hbs'), {
    layout: false,
    ...req.query
  });
});


router.get('/components/atoms/link-button/script', (req, res) => {
  res.type('application/javascript');
  res.sendFile(path.join(__dirname, 'link-button.js'));
});

router.get('/components/atoms/link-button/styles', (req, res) => {
    res.type('text/css');
    res.sendFile(path.join(__dirname, 'link-button.css'));
});

export default router;
