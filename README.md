# SHUVRO AI ENGLISH TUTOR

Premium realtime spoken-English tutor built around LiveKit Agents + Gemini Live Native Audio.

## What SHUVRO is optimized for

- Speak more, think in English, and become natural rather than merely grammatically correct.
- Adaptive CEFR coaching from A1–C2.
- Free Conversation, Fluency Coach, IELTS Speaking, Grammar Coach, Vocabulary Builder, and Role Play.
- IELTS Speaking Part 1 → Part 2 → Part 3 examiner flow with post-test estimated scoring.
- Gemini Live native-audio conversation over LiveKit WebRTC.
- 30 Gemini voice characters selectable for the next live session.
- Hands-free and push-to-talk interaction.
- Live subtitles/transcripts and an audio-reactive AI orb.
- Learner memory injected into each new session so SHUVRO can continue from prior practice.
- Progress, streak, practice minutes, word counts, mode history, skill map, session summaries, and export/import.

## Secrets

Never put a Gemini API key or LiveKit secret in source code. Configure them in Render Environment Variables. See `RENDER.md` and `.env.example`.

## Recommended runtime

Gemini Live model:

`gemini-2.5-flash-native-audio-preview-12-2025`

This is the default because the current LiveKit Google plugin supports it with programmatic session flows such as `generateReply()`. See `RENDER.md` for current deployment notes.
