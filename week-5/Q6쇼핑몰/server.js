require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

const apiRouter = require('./api');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use('/api', apiRouter);
app.use('/api', (_req, res) => {
  res.status(404).json({ success: false, message: 'Not found' });
});

app.use(express.static(path.join(__dirname)));

app.get('/{*splat}', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

if (require.main === module) {
  app.listen(PORT, () => console.log(`GlassMarket server running on http://localhost:${PORT}`));
}
module.exports = app;
