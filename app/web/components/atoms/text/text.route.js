import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

router.get('/components/atoms/text/text-markup', (req, res) => {
  res.render(path.join(__dirname, 'text.hbs'), {
    layout: false,
    ...req.query
  });
});

router.get('/components/atoms/text/text-script', (req, res) => {
    res.type('application/javascript');
    res.sendFile(path.join(__dirname, 'text.js'));
  });

router.get('/components/atoms/text/text-styles', (req, res) => {
  res.type('text/css');
  res.sendFile(path.join(__dirname, 'text.css'));
});

export default router;
