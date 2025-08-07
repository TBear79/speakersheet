import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

router.get('/components/atoms/card-section/card-section-markup', (req, res) => {
  res.render(path.join(__dirname, 'card-section.hbs'), {
    layout: false,
    ...req.query
  });
});

router.get('/components/atoms/card-section/card-section-script', (req, res) => {
    res.type('application/javascript');
    res.sendFile(path.join(__dirname, 'card-section.js'));
  });

router.get('/components/atoms/card-section/card-section-styles', (req, res) => {
  res.type('text/css');
  res.sendFile(path.join(__dirname, 'card-section.css'));
});

export default router;
