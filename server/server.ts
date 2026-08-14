import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { existsSync, createReadStream } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { createToken } from './token.js';
import type { TutorSessionConfig } from '../shared/types.js';

dotenv.config();
dotenv.config({ path: '.env.local' });

const root = fileURLToPath(new URL('../../dist', import.meta.url));
const port = Number(process.env.PORT || 10000);
const allowedModes = new Set(['Free Conversation', 'Fluency Coach', 'IELTS Speaking', 'Grammar Coach', 'Vocabulary Builder', 'Role Play']);
const allowedLevels = new Set(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']);
const allowedVoices = new Set(['Zephyr','Puck','Charon','Kore','Fenrir','Leda','Orus','Aoede','Callirrhoe','Autonoe','Enceladus','Iapetus','Umbriel','Algieba','Despina','Erinome','Algenib','Rasalgethi','Laomedeia','Achernar','Alnilam','Schedar','Gacrux','Pulcherrima','Achird','Zubenelgenubi','Vindemiatrix','Sadachbia','Sadaltager','Sulafat']);
const MAX_BODY_BYTES = 32_000;

function json(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  });
  res.end(JSON.stringify(body));
}

async function readBody(req: IncomingMessage) {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of req) {
    const buf = Buffer.from(chunk);
    total += buf.length;
    if (total > MAX_BODY_BYTES) throw new Error('Request body too large.');
    chunks.push(buf);
  }
  if (!chunks.length) return {};
  const raw = Buffer.concat(chunks).toString('utf8');
  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== 'object') throw new Error('Invalid JSON body.');
  return parsed as Record<string, unknown>;
}

function safeConfig(value: Record<string, unknown>): TutorSessionConfig {
  const voice = String(value.voice || 'Kore');
  return {
    userName: String(value.userName || 'Learner').slice(0, 80),
    mode: allowedModes.has(String(value.mode)) ? value.mode as TutorSessionConfig['mode'] : 'Free Conversation',
    level: allowedLevels.has(String(value.level)) ? value.level as TutorSessionConfig['level'] : 'B1',
    goal: String(value.goal || 'Speak English confidently and naturally').slice(0, 180),
    targetBand: Math.min(9, Math.max(4, Number(value.targetBand || 7))),
    voice: allowedVoices.has(voice) ? voice : 'Kore',
    voiceStyle: String(value.voiceStyle || 'Warm, clear, encouraging tutor').slice(0, 220),
    interactionMode: value.interactionMode === 'push-to-talk' ? 'push-to-talk' : 'hands-free',
    learnerMemory: String(value.learnerMemory || '').slice(0, 3500),
    streakDays: Math.max(0, Number(value.streakDays || 0)),
    totalSessions: Math.max(0, Number(value.totalSessions || 0)),
    totalMinutes: Math.max(0, Number(value.totalMinutes || 0)),
    recentFocus: Array.isArray(value.recentFocus) ? value.recentFocus.slice(0, 6).map((x) => String(x).slice(0, 60)) : ['fluency', 'natural phrasing', 'confidence'],
  };
}

function contentType(path: string) {
  return ({ '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.ico': 'image/x-icon', '.webp': 'image/webp' } as Record<string, string>)[extname(path)] || 'application/octet-stream';
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    if (req.method === 'GET' && url.pathname === '/health') return json(res, 200, { ok: true, service: 'shuvro-tutor' });
    if (req.method === 'GET' && url.pathname === '/api/status') {
      return json(res, 200, {
        ok: true,
        livekitConfigured: Boolean(process.env.LIVEKIT_URL && process.env.LIVEKIT_API_KEY && process.env.LIVEKIT_API_SECRET),
        geminiConfigured: Boolean(process.env.GOOGLE_API_KEY),
        model: process.env.GEMINI_LIVE_MODEL || 'gemini-2.5-flash-native-audio-preview-12-2025',
      });
    }
    if (req.method === 'POST' && url.pathname === '/api/token') {
      if (!process.env.LIVEKIT_URL || !process.env.LIVEKIT_API_KEY || !process.env.LIVEKIT_API_SECRET) return json(res, 500, { error: 'LiveKit credentials are not configured.' });
      if (!process.env.GOOGLE_API_KEY) return json(res, 500, { error: 'GOOGLE_API_KEY is not configured.' });
      if (!req.headers['content-type']?.includes('application/json')) return json(res, 415, { error: 'Content-Type must be application/json.' });
      const body = await readBody(req);
      const config = safeConfig(body);
      const token = await createToken(config);
      return json(res, 200, token);
    }

    const requested = url.pathname === '/' ? '/index.html' : url.pathname;
    const relative = normalize(requested).replace(/^([/\\])+/, '');
    let filePath = join(root, relative);
    if (!filePath.startsWith(root)) return json(res, 403, { error: 'Forbidden' });
    if (!existsSync(filePath)) filePath = join(root, 'index.html');
    res.writeHead(200, { 'Content-Type': contentType(filePath), 'Cache-Control': requested === '/index.html' ? 'no-cache' : 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff' });
    createReadStream(filePath).pipe(res);
  } catch (error) {
    console.error(error);
    if (!res.headersSent) json(res, 400, { error: error instanceof Error ? error.message : 'Internal server error' });
  }
});

server.listen(port, '0.0.0.0', () => console.log(`SHUVRO web server listening on ${port}`));
