require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const app = express();
const port = 3000;

const corsOptions = {
  origin: '*',
  optionsSuccessStatus: 200,
};

app.use(express.json());
app.use(cors(corsOptions));
app.use(bodyParser.json({ limit: '100mb' }));
app.use(bodyParser.urlencoded({ limit: '100mb', extended: true }));
app.set('view engine', 'ejs');
app.set('views', './views');
app.use(express.static('public'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const { chatRoutes } = require('./services/chatRoutes');

app.get('/chat_1', (req, res) => {
  res.render('chat_1');
});

app.get('/chat_2', (req, res) => {
  res.render('chat_2');
});

chatRoutes(app);

app.server = app.listen(port, () => {
  console.log(`Server is listening at http://localhost:${port}`);
});
