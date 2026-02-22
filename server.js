const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 8080;
const rootDir = __dirname;

app.use(express.static(rootDir, {
  extensions: ['html']
}));

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(rootDir, 'index.html'));
});

app.listen(port, () => {
  console.log(`AVA app running on port ${port}`);
});
