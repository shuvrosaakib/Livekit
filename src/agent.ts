import { JobContext, WorkerOptions, cli, defineAgent } from '@livekit/agents';
import * as livekit from 'livekit-server-sdk';

export default defineAgent({
  entry: async (ctx: JobContext) => {
    await ctx.connect();
    console.log('Agent connected to room:', ctx.room.name);

    // Set WebRTC low latency parameters
    const room = ctx.room;
    
    // Subscribe to participant audio with high-priority audio processing
    room.on('trackSubscribed', (track, publication, participant) => {
      if (track.kind === 'audio') {
        console.log('Subscribed to user audio track');
      }
    });
  },
});

if (process.env.NODE_ENV !== 'test') {
  cli.runApp(new WorkerOptions({ agent: __filename }));
}
