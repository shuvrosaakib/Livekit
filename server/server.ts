import express, { Request, Response } from 'express';
import path from 'path';
import cors from 'cors';

const app = express();

const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).send('OK');
});

// Serve frontend build static assets
const clientDist = path.join(__dirname, '../../dist');
app.use(express.static(clientDist));

// Token route handler safety
app.get('/api/token', (req: Request, res: Response) => {
  const room = (req.query.room as string) || 'default-room';
  const username = (req.query.username as string) || 'user';
  
  if (!process.env.LIVEKIT_API_KEY || !process.env.LIVEKIT_API_SECRET) {
    return res.status(500).json({ error: 'LiveKit API keys missing' });
  }

  res.json({ token: 'OK', room, username });
});

// Catch-all route to serve SPA frontend
app.get('*', (_req: Request, res: Response) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

app.listen(PORT, HOST, () => {
  console.log(`Server listening on http://${HOST}:${PORT}`);
});
