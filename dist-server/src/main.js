import { ServerOptions, cli, defineAgent, voice } from '@livekit/agents';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { createAgent, createGeminiRealtimeModel } from './agent.js';
dotenv.config();
dotenv.config({ path: '.env.local' });
const defaults = {
    userName: 'Learner',
    mode: 'Free Conversation',
    level: 'B1',
    goal: 'Speak English confidently and naturally',
    targetBand: 7,
    voice: 'Kore',
    voiceStyle: 'Firm, warm, confident and teacher-like.',
    interactionMode: 'hands-free',
    learnerMemory: '',
    streakDays: 0,
    totalSessions: 0,
    totalMinutes: 0,
    recentFocus: ['fluency', 'natural phrasing', 'confidence'],
};
function safeConfig(raw) {
    return {
        ...defaults,
        ...raw,
        userName: String(raw.userName || defaults.userName).slice(0, 80),
        goal: String(raw.goal || defaults.goal).slice(0, 180),
        voice: String(raw.voice || defaults.voice).slice(0, 40),
        voiceStyle: String(raw.voiceStyle || defaults.voiceStyle).slice(0, 220),
        learnerMemory: String(raw.learnerMemory || '').slice(0, 3500),
        totalSessions: Math.max(0, Number(raw.totalSessions || 0)),
        totalMinutes: Math.max(0, Number(raw.totalMinutes || 0)),
        streakDays: Math.max(0, Number(raw.streakDays || 0)),
        recentFocus: Array.isArray(raw.recentFocus) ? raw.recentFocus.slice(0, 6).map(String) : defaults.recentFocus,
    };
}
export default defineAgent({
    entry: async (ctx) => {
        let config = defaults;
        try {
            const metadata = JSON.parse(ctx.job.metadata || '{}');
            config = safeConfig(metadata);
        }
        catch {
            console.warn('Invalid job metadata; using defaults.');
        }
        if (!process.env.GOOGLE_API_KEY) {
            throw new Error('GOOGLE_API_KEY is not configured.');
        }
        const agent = createAgent(config);
        const session = new voice.AgentSession({
            llm: createGeminiRealtimeModel(config),
            turnHandling: {
                preemptiveGeneration: { enabled: true },
            },
        });
        await session.start({ agent, room: ctx.room });
        await ctx.connect();
        await session.generateReply({
            instructions: `Greet ${config.userName} by name. Start the ${config.mode} session naturally. Ask one short, level-appropriate question that makes the learner speak. Do not explain the app or system.`,
            allowInterruptions: true,
        });
    },
});
cli.runApp(new ServerOptions({
    agent: fileURLToPath(import.meta.url),
    agentName: 'shuvro-tutor',
}));
