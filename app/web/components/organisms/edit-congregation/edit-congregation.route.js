import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

router.get('/components/organisms/edit-congregation/edit-congregation-markup', (req, res) => {
  res.render(path.join(__dirname, 'edit-congregation.hbs'), {
    layout: false,
    ...req.query
  });
});

router.get('/components/organisms/edit-congregation/edit-congregation-script', (req, res) => {
    res.type('application/javascript');
    res.sendFile(path.join(__dirname, 'edit-congregation.js'));
  });

router.get('/components/organisms/edit-congregation/edit-congregation-styles', (req, res) => {
  res.type('text/css');
  res.sendFile(path.join(__dirname, 'edit-congregation.css'));
});

export default router;
