import { JobContext, WorkerOptions, cli, defineAgent } from '@livekit/agents';

export function createGeminiRealtimeModel(options?: Record<string, any>) {
  return {
    model: 'gemini-2.0-flash-exp',
    ...options,
  };
}

export function createAgent(config?: Record<string, any>) {
  return defineAgent({
    entry: async (ctx: JobContext) => {
      await ctx.connect();
      console.log('Agent connected to room:', ctx.room.name);

      ctx.room.on('trackSubscribed', (track, _publication, _participant) => {
        // Safe string comparison to avoid TS2367 type mismatch
        if (String(track.kind).toLowerCase() === 'audio') {
          console.log('Subscribed to user audio track');
        }
      });
    },
    ...config,
  });
}

const defaultAgent = createAgent();
export default defaultAgent;

if (process.env.NODE_ENV !== 'test') {
  cli.runApp(new WorkerOptions({ agent: __filename }));
}
