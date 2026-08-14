import { createServer } from 'node:http';
import { createToken } from './token.js';
import dotenv from 'dotenv';

dotenv.config();
dotenv.config({ path: '.env.local' });

const port = 8787;
const server = createServer(async (req, res) => {
  if (req.method === 'POST' && req.url === '/api/token') {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    try {
      const config = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      const result = await createToken(config);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: String(e) }));
    }
    return;
  }
  res.writeHead(404); res.end('Not found');
});
server.listen(port, () => console.log(`Dev token API on ${port}`));
