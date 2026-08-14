import { createAgent, createGeminiRealtimeModel } from './agent.js';

console.log('Initializing SHUVRO AI Engine...');

const model = createGeminiRealtimeModel({
  temperature: 0.7,
});

const agent = createAgent({
  model,
});

export { agent, model };
