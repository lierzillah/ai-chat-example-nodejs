require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];

const REQUIRED_ENV = [
  'OPENAI_API_KEY',
  'DB_NAME',
  'DB_USERNAME',
  'DB_PASSWORD',
];
REQUIRED_ENV.forEach((key) => {
  if (!process.env[key]) throw new Error(`Missing required env: ${key}`);
});

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin "${origin}" not allowed`));
    }
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
  credentials: false, 
  maxAge: 86400,      
};

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30, 
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));
app.set('view engine', 'ejs');
app.set('views', './views');
app.use(express.static('public'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const { chatRoutes } = require('./services/chatRoutes');

app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.get('/chat_1', (req, res) => res.render('chat_1'));
app.get('/chat_2', (req, res) => res.render('chat_2'));

chatRoutes(app, apiLimiter);

app.server = app.listen(port, () => {
  console.log(`Server is listening at http://localhost:${port}`);
});
