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

app.get('/dev/token-info', async (req, res) => {
  try {
    const usageResponse = await fetch(
      'https://api.openai.com/v1/usage?start_date=2026-02-01&end_date=2026-02-13',
      {
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      },
    );
    const usageData = await usageResponse.json();

    const billingResponse = await fetch(
      'https://api.openai.com/v1/dashboard/billing/credit_grants',
      {
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      },
    );
    const billingData = await billingResponse.json();

    res.json({ usage: usageData, billing: billingData });
  } catch (e) {
    res
      .status(500)
      .json({ error: 'Cannot fetch token info', details: e.message });
  }
});

app.server = app.listen(port, () => {
  console.log(`Server is listening at http://localhost:${port}`);
});
