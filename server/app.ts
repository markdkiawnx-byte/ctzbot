import express from 'express';
import dotenv from 'dotenv';
import { apiRouter } from './routes.js';

dotenv.config();

export const app = express();

app.use(express.json());

// Mount API router
app.use('/api', apiRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'CTZ BOT API', time: Date.now() });
});
