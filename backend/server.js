const express = require('express');
const cors = require('cors');
const apiRoutes = require('./src/routes/api');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// API routes
app.use('/api', apiRoutes);

app.listen(PORT, () => {
  console.log(`[SCIS] Backend running on http://localhost:${PORT}`);
});
