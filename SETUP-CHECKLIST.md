# SHUVRO launch checklist

- [ ] Create a LiveKit Cloud project (or self-host LiveKit).
- [ ] Copy the LiveKit WebSocket URL, API key, and secret.
- [ ] Create a Google Gemini API key in Google AI Studio.
- [ ] Add all four secrets plus `GEMINI_LIVE_MODEL` to Render Environment Variables.
- [ ] Push the project to GitHub without committing `.env` or `.env.local`.
- [ ] Deploy on Render with `npm install && npm run build` and `npm start`.
- [ ] Open `/health` and `/api/status` after deployment.
- [ ] Test Kore voice in Hands-free mode first.
- [ ] Test Push-to-talk.
- [ ] Test interruption: speak while SHUVRO is speaking.
- [ ] Test live subtitles.
- [ ] Test IELTS Part 1 → Part 2 → Part 3.
- [ ] Complete one session, reload the page, and confirm progress remains.
- [ ] Export the progress JSON and verify it can be imported.

## Security

Never paste the Gemini API key into source files or commit it to GitHub. The browser only receives a short-lived LiveKit participant token.
