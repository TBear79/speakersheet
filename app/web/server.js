import express from 'express';
import { engine } from 'express-handlebars';
import path from 'path';
import routes from './routes/index.js';
import { fileURLToPath } from 'url';
import reload from 'reload';

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.engine('hbs', engine({ extname: '.hbs' }));
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use('/', routes);

reload(app);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.info(`SpeakerSheet running on http://localhost:${PORT}`));

