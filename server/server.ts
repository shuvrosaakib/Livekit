import express from 'express';
import path from 'path';
import cors from 'cors';

const app = express();

// Render sets process.env.PORT automatically (usually 10000)
const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';

app.use(cors());
app.use(express.json());

// Health check endpoint for Render pinging
app.get('/health', (_req, res) => {
  res.status(200).send('OK');
});

// Serve frontend build static assets
const clientDist = path.join(__dirname, '../../dist');
app.use(express.static(clientDist));

// Token route handler safety
app.get('/api/token', (req, res) => {
  const room = (req.query.room as string) || 'default-room';
  const username = (req.query.username as string) || 'user';
  
  if (!process.env.LIVEKIT_API_KEY || !process.env.LIVEKIT_API_SECRET) {
    return res.status(500).json({ error: 'LiveKit API keys missing' });
  }

  // Safe response fallback
  res.json({ token: 'OK', room, username });
});

// Catch-all route to serve SPA frontend
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

// Bind to 0.0.0.0 explicitly for Render
app.listen(PORT, HOST, () => {
  console.log(`Server listening on http://${HOST}:${PORT}`);
});
