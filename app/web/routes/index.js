import express from 'express';
const router = express.Router();

router.get('/', (req, res) => {
  res.render('home', { title: 'SpeakerSheet' });
});

router.post('/upload', (req, res) => {
  // parse uploaded PDF with pdf-lib
});

router.post('/generate', (req, res) => {
  // generate PDF and send as download
});

export default router;