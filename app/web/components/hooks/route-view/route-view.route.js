import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

router.get('/components/hooks/route-view/route-view-script', (req, res) => {
  res.type('application/javascript');
  res.sendFile(path.join(__dirname, `route-view.js`));
});

router.get('/components/hooks/route-view/route-view-styles', (req, res) => {
  res.type('text/css');
  res.sendFile(path.join(__dirname, 'route-view.css'));
});

export default router;
