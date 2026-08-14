import { AccessToken } from 'livekit-server-sdk';
import { RoomAgentDispatch, RoomConfiguration } from '@livekit/protocol';
import { randomUUID } from 'node:crypto';
export async function createToken(config) {
    const roomName = `shuvro-${randomUUID()}`;
    const identity = `learner-${randomUUID().slice(0, 8)}`;
    const token = new AccessToken(process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET, {
        identity,
        name: config.userName || 'Learner',
        ttl: '2h',
        metadata: JSON.stringify(config),
    });
    token.addGrant({ roomJoin: true, room: roomName, canPublish: true, canSubscribe: true, canPublishData: true });
    token.roomConfig = new RoomConfiguration({
        agents: [new RoomAgentDispatch({ agentName: 'shuvro-tutor', metadata: JSON.stringify(config) })],
    });
    return {
        server_url: process.env.LIVEKIT_URL,
        participant_token: await token.toJwt(),
        room_name: roomName,
        expires_in_seconds: 7200,
    };
}
