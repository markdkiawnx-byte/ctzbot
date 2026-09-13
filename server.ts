import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import dotenv from 'dotenv';
import { app } from './server/app.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

// Serve static assets in production
app.use(express.static(path.join(__dirname, 'dist')));

// SPA fallback for non-API routes
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(__dirname, 'dist', 'index.html'), (err) => {
    if (err) {
      next();
    }
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[CTZ BOT] Server is running on port ${PORT}`);
});
