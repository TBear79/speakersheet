import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

router.get('/components/hooks/route-view/route-view-script', (req, res) => {
  res.type('application/javascript');
  res.sendFile(path.join(__dirname, `route-view.js`));
});

export default router;
