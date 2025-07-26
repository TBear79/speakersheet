import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Render markup
router.get('/components/molecules/upload-area/upload-area-markup', (req, res) => {
  res.render(path.join(__dirname, 'upload-area.hbs'), {
    layout: false,
    isClickable: req.query.isClickable === 'true',
  });
});

router.get('/components/molecules/upload-area/upload-area-script', (req, res) => {
    res.type('application/javascript');
    res.sendFile(path.join(__dirname, `upload-area.js`));
  });

// Serve CSS
router.get('/components/molecules/upload-area/upload-area-styles', (req, res) => {
  res.type('text/css');
  res.sendFile(path.join(__dirname, 'upload-area.css'));
});

export default router;
