# Render deployment — SHUVRO AI English Tutor

## Web Service

Build Command:

```bash
npm install && npm run build
```

Start Command:

```bash
npm start
```

## Required Render environment variables

```text
LIVEKIT_URL=wss://YOUR_PROJECT.livekit.cloud
LIVEKIT_API_KEY=YOUR_LIVEKIT_API_KEY
LIVEKIT_API_SECRET=YOUR_LIVEKIT_API_SECRET
GOOGLE_API_KEY=YOUR_GEMINI_API_KEY
GEMINI_LIVE_MODEL=gemini-2.5-flash-native-audio-preview-12-2025
```

`GOOGLE_API_KEY` is intentionally NOT included in this repository. Keep it as a Render secret.

## LiveKit choice

LiveKit Agents is open-source and can be self-hosted. LiveKit Cloud is a managed service with metered usage; its free project can be used for development, but verify the current quotas/limits on the LiveKit pricing page before production. SHUVRO's application does not embed LiveKit secrets in the browser.

## Gemini choice

The default model is `gemini-2.5-flash-native-audio-preview-12-2025`. Google currently lists a free tier for this Live API model and paid usage priced by tokens; native audio input/output is charged differently from text, and Live API context can accumulate across turns. Keep an eye on Google AI Studio/API billing and limits.

## Important

Voice changes are applied when the next LiveKit room/session is created. Stop the current session before changing voice or mode.
