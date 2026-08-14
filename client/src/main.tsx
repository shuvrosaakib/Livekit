import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Room, RoomEvent, Track, type Participant, type TranscriptionSegment } from 'livekit-client';
import type { CEFRLevel, ProgressState, TokenResponse, TranscriptItem, TutorMode, TutorSessionConfig } from '../../shared/types';
import './styles.css';

const modes: Array<{ id: TutorMode; label: string; desc: string; icon: string }> = [
  { id: 'Free Conversation', label: 'Free Talk', desc: 'Natural everyday conversation', icon: '✦' },
  { id: 'Fluency Coach', label: 'Fluency Coach', desc: 'Hesitation, flow & confidence', icon: '≈' },
  { id: 'IELTS Speaking', label: 'IELTS Speaking', desc: 'Part 1 • 2 • 3 mock test', icon: '◈' },
  { id: 'Grammar Coach', label: 'Grammar Coach', desc: 'Speak first, fix key patterns', icon: '⌁' },
  { id: 'Vocabulary Builder', label: 'Vocabulary', desc: 'Better words & collocations', icon: '◇' },
  { id: 'Role Play', label: 'Role Play', desc: 'Real-world situations', icon: '◉' },
];

const levels: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const goals = ['Speak confidently', 'IELTS Band 7+', 'Workplace English', 'Travel English', 'Daily conversation'];
const voices = [
  ['Zephyr', 'Bright'], ['Puck', 'Upbeat'], ['Charon', 'Informative'], ['Kore', 'Firm'], ['Fenrir', 'Excitable'], ['Leda', 'Youthful'],
  ['Orus', 'Firm'], ['Aoede', 'Breezy'], ['Callirrhoe', 'Easy-going'], ['Autonoe', 'Bright'], ['Enceladus', 'Breathy'], ['Iapetus', 'Clear'],
  ['Umbriel', 'Easy-going'], ['Algieba', 'Smooth'], ['Despina', 'Smooth'], ['Erinome', 'Clear'], ['Algenib', 'Gravelly'], ['Rasalgethi', 'Informative'],
  ['Laomedeia', 'Upbeat'], ['Achernar', 'Soft'], ['Alnilam', 'Firm'], ['Schedar', 'Even'], ['Gacrux', 'Mature'], ['Pulcherrima', 'Forward'],
  ['Achird', 'Friendly'], ['Zubenelgenubi', 'Casual'], ['Vindemiatrix', 'Gentle'], ['Sadachbia', 'Lively'], ['Sadaltager', 'Knowledgeable'], ['Sulafat', 'Warm'],
].map(([id, character]) => ({ id, label: id, character }));

const modeKeys = modes.map((m) => m.id);
const DEFAULT_PROGRESS: ProgressState = {
  version: 2,
  learner: { name: '', level: 'B1', goal: goals[0], targetBand: 7, streakDays: 0, lastPracticeDate: null, totalSessions: 0, totalMinutes: 0, totalWords: 0 },
  skills: { fluency: 62, grammar: 55, vocabulary: 58, confidence: 61, pronunciation: 57 },
  modeCounts: Object.fromEntries(modeKeys.map((mode) => [mode, 0])) as Record<TutorMode, number>,
  recentFocus: ['fluency', 'natural phrasing', 'confidence'],
  lastSummary: 'Your tutor will learn from every session you complete on this device.',
  recentSessions: [],
};

function cloneDefault(): ProgressState { return JSON.parse(JSON.stringify(DEFAULT_PROGRESS)) as ProgressState; }
function getSaved<T>(key: string, fallback: T): T { try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) as T : fallback; } catch { return fallback; } }
function todayKey() { return new Date().toISOString().slice(0, 10); }
function wordCount(text: string) { return text.trim() ? text.trim().split(/\s+/).length : 0; }
function summarizeSession(mode: TutorMode, minutes: number, words: number, turns: number) {
  const emphasis = mode === 'Fluency Coach' ? 'fluency, hesitation and natural phrasing' : mode === 'IELTS Speaking' ? 'IELTS speaking structure, fluency and lexical range' : mode === 'Grammar Coach' ? 'spoken grammar accuracy' : mode === 'Vocabulary Builder' ? 'spoken vocabulary and collocations' : 'natural conversation and confidence';
  return `${minutes} min of ${mode.toLowerCase()} practice • ${words} learner words • ${turns} speaking turns • focus: ${emphasis}.`;
}

function App() {
  const [name, setName] = useState(() => getSaved('shuvro.name', ''));
  const [mode, setMode] = useState<TutorMode>(() => getSaved('shuvro.mode', 'Free Conversation'));
  const [level, setLevel] = useState<CEFRLevel>(() => getSaved('shuvro.level', 'B1'));
  const [goal, setGoal] = useState(() => getSaved('shuvro.goal', goals[0]));
  const [targetBand, setTargetBand] = useState(() => getSaved('shuvro.band', 7));
  const [voice, setVoice] = useState(() => getSaved('shuvro.voice', 'Kore'));
  const [interactionMode, setInteractionMode] = useState<'hands-free' | 'push-to-talk'>(() => getSaved('shuvro.interaction', 'hands-free'));
  const [liveCaption, setLiveCaption] = useState('');
  const [captionRole, setCaptionRole] = useState<'user' | 'assistant' | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [room, setRoom] = useState<Room | null>(null);
  const roomRef = useRef<Room | null>(null);
  const sessionStart = useRef<number>(0);
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState<'idle' | 'connecting' | 'listening' | 'speaking' | 'thinking' | 'error'>('idle');
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  const [micOn, setMicOn] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<'studio' | 'progress'>('studio');
  const [progress, setProgress] = useState<ProgressState>(() => getSaved('shuvro.progress.v2', cloneDefault()));
  const [showMemory, setShowMemory] = useState(false);
  const audioElements = useRef<HTMLAudioElement[]>([]);
  const audioCtx = useRef<AudioContext | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);
  const animationFrame = useRef<number | null>(null);
  const sourceNodes = useRef<MediaElementAudioSourceNode[]>([]);

  const selectedVoice = voices.find((v) => v.id === voice) || voices.find((v) => v.id === 'Kore')!;
  const learnerMemory = useMemo(() => {
    const recent = progress.recentSessions.slice(0, 4).map((s) => `${s.date}: ${s.summary}`).join('\n');
    return `Current profile: ${progress.learner.level}, goal ${progress.learner.goal}, target IELTS ${progress.learner.targetBand}.\nRecent practice:\n${recent || 'No previous completed sessions yet.'}\nLast tutor note: ${progress.lastSummary}`;
  }, [progress]);
  const profile: TutorSessionConfig = useMemo(() => ({
    userName: name.trim() || 'Learner', mode, level, goal, targetBand,
    voice, voiceStyle: `${selectedVoice.character} voice character`, interactionMode,
    learnerMemory, streakDays: progress.learner.streakDays, totalSessions: progress.learner.totalSessions,
    totalMinutes: progress.learner.totalMinutes, recentFocus: progress.recentFocus,
  }), [name, mode, level, goal, targetBand, voice, selectedVoice.character, interactionMode, learnerMemory, progress]);

  useEffect(() => {
    localStorage.setItem('shuvro.name', name);
    localStorage.setItem('shuvro.mode', JSON.stringify(mode));
    localStorage.setItem('shuvro.level', JSON.stringify(level));
    localStorage.setItem('shuvro.goal', JSON.stringify(goal));
    localStorage.setItem('shuvro.band', JSON.stringify(targetBand));
    localStorage.setItem('shuvro.voice', JSON.stringify(voice));
    localStorage.setItem('shuvro.interaction', JSON.stringify(interactionMode));
    localStorage.setItem('shuvro.progress.v2', JSON.stringify({ ...progress, learner: { ...progress.learner, name, level, goal, targetBand } }));
  }, [name, mode, level, goal, targetBand, voice, interactionMode, progress]);

  useEffect(() => () => {
    roomRef.current?.disconnect();
    if (animationFrame.current) cancelAnimationFrame(animationFrame.current);
    void audioCtx.current?.close();
  }, []);

  const finishSession = () => {
    if (!sessionStart.current) return;
    const minutes = Math.max(1, Math.round((Date.now() - sessionStart.current) / 60000));
    const words = transcript.filter((t) => t.role === 'user').reduce((sum, t) => sum + (t.final ? wordCount(t.text) : 0), 0);
    const turns = transcript.filter((t) => t.role === 'user' && t.final).length;
    const key = todayKey();
    const wasYesterday = progress.learner.lastPracticeDate === new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const alreadyToday = progress.learner.lastPracticeDate === key;
    const nextStreak = alreadyToday ? progress.learner.streakDays : wasYesterday ? progress.learner.streakDays + 1 : 1;
    const next: ProgressState = {
      ...progress,
      learner: { ...progress.learner, name, level, goal, targetBand, lastPracticeDate: key, streakDays: nextStreak, totalSessions: progress.learner.totalSessions + 1, totalMinutes: progress.learner.totalMinutes + minutes, totalWords: progress.learner.totalWords + words },
      modeCounts: { ...progress.modeCounts, [mode]: (progress.modeCounts[mode] || 0) + 1 },
      recentFocus: mode === 'Fluency Coach' ? ['fluency', 'natural phrasing', 'linking'] : mode === 'IELTS Speaking' ? ['fluency', 'lexical range', 'grammar accuracy'] : progress.recentFocus,
      lastSummary: summarizeSession(mode, minutes, words, turns),
      recentSessions: [{ id: crypto.randomUUID(), date: key, mode, level, minutes, words, turns, summary: summarizeSession(mode, minutes, words, turns) }, ...progress.recentSessions].slice(0, 12),
    };
    setProgress(next);
    sessionStart.current = 0;
  };

  const cleanupAudio = () => {
    audioElements.current.forEach((el) => el.remove());
    audioElements.current = [];
    sourceNodes.current.forEach((node) => { try { node.disconnect(); } catch {} });
    sourceNodes.current = [];
    analyser.current = null;
    if (animationFrame.current) cancelAnimationFrame(animationFrame.current);
    animationFrame.current = null;
    setAudioLevel(0);
  };

  const disconnect = async () => {
    finishSession();
    if (roomRef.current) await roomRef.current.disconnect();
    cleanupAudio();
    roomRef.current = null;
    setRoom(null); setConnected(false); setStatus('idle'); setMicOn(false); setLiveCaption(''); setCaptionRole(null);
  };

  const startAudioReactive = (audio: HTMLAudioElement) => {
    // Keep LiveKit audio on the browser's native playback path.
    // Do not route the audio through Web Audio; this prevents
    // unnecessary buffering/glitches in mobile browsers.
    audio.autoplay = true;
    audio.setAttribute('playsinline', 'true');
    audio.volume = 1.0;

    audio.onplaying = () => setStatus('speaking');
    audio.onended = () => {
      if (connected) setStatus('listening');
    };
  };

  const connect = async () => {
    if (connected) return disconnect();
    setStatus('connecting'); setTranscript([]); setLiveCaption(''); sessionStart.current = Date.now();
    try {
      const res = await fetch('/api/token', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(profile) });
      const payload = await res.json() as TokenResponse & { error?: string };
      if (!res.ok) throw new Error(payload.error || 'Token request failed');
      const nextRoom = new Room({ adaptiveStream: true, dynacast: true, stopLocalTrackOnUnpublish: false });
      roomRef.current = nextRoom;
      nextRoom.on(RoomEvent.TrackSubscribed, (track) => {
        if (track.kind !== Track.Kind.Audio) return;
        const audio = track.attach(); audio.autoplay = true; audio.setAttribute('playsinline', 'true');
        audioElements.current.push(audio); void audio.play().catch(() => {}); startAudioReactive(audio); setStatus('speaking');
      });
      nextRoom.on(RoomEvent.TrackUnsubscribed, (track) => track.detach());
      nextRoom.on(RoomEvent.ActiveSpeakersChanged, (speakers: Participant[]) => {
        const agentActive = speakers.some((p) => !p.isLocal);
        const localActive = speakers.some((p) => p.isLocal);
        if (agentActive) setStatus('speaking'); else if (localActive) setStatus('listening'); else setStatus('thinking');
      });
      nextRoom.on(RoomEvent.TranscriptionReceived, (segments: TranscriptionSegment[], participant) => {
        const isLocal = participant?.isLocal ?? false;
        setTranscript((prev) => {
          const next = [...prev];
          for (const seg of segments) {
            const text = seg.text?.trim(); if (!text) continue;
            const item: TranscriptItem = { id: seg.id, role: isLocal ? 'user' : 'assistant', text, final: seg.final, timestamp: Date.now() };
            const index = next.findIndex((x) => x.id === seg.id);
            if (index >= 0) next[index] = item; else next.push(item);
            setLiveCaption(text); setCaptionRole(item.role);
          }
          return next.slice(-60);
        });
      });
      nextRoom.on(RoomEvent.Disconnected, () => { setConnected(false); setStatus('idle'); cleanupAudio(); });
      await nextRoom.prepareConnection(payload.server_url, payload.participant_token);
      await nextRoom.connect(payload.server_url, payload.participant_token);
      await nextRoom.localParticipant.setMicrophoneEnabled(
        interactionMode === 'hands-free',
        {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      );
      setRoom(nextRoom); setConnected(true); setMicOn(interactionMode === 'hands-free'); setStatus(interactionMode === 'hands-free' ? 'listening' : 'idle');
    } catch (error) {
      sessionStart.current = 0; console.error(error); setStatus('error'); setConnected(false);
    }
  };

  const toggleMic = async () => {
    if (!room) return;
    const next = !micOn; await room.localParticipant.setMicrophoneEnabled(next); setMicOn(next); setStatus(next ? 'listening' : 'idle');
  };
  const pushToTalkStart = async () => { if (!room || interactionMode !== 'push-to-talk') return; await room.localParticipant.setMicrophoneEnabled(true); setMicOn(true); setStatus('listening'); };
  const pushToTalkEnd = async () => { if (!room || interactionMode !== 'push-to-talk') return; await room.localParticipant.setMicrophoneEnabled(false); setMicOn(false); setStatus('thinking'); };

  const exportProgress = () => {
    const blob = new Blob([JSON.stringify({ ...progress, learner: { ...progress.learner, name, level, goal, targetBand } }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'shuvro-progress.json'; a.click(); URL.revokeObjectURL(url);
  };
  const importProgress = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => { try { const parsed = JSON.parse(String(reader.result)) as ProgressState; if (parsed.version !== 2) throw new Error('Unsupported progress file'); setProgress(parsed); setName(parsed.learner.name); setLevel(parsed.learner.level); setGoal(parsed.learner.goal); setTargetBand(parsed.learner.targetBand); alert('Progress restored.'); } catch { alert('Could not read that progress file.'); } };
    reader.readAsText(file);
  };

  const hasProfile = Boolean(name.trim());
  const statusLabel = status === 'connecting' ? 'Connecting to your live tutor…' : status === 'speaking' ? 'SHUVRO is speaking' : status === 'listening' ? 'Your turn — speak naturally' : status === 'thinking' ? 'SHUVRO is thinking…' : status === 'error' ? 'Connection issue — check your Render environment variables' : 'Ready when you are';

  if (!hasProfile) return <Onboarding name={name} setName={setName} level={level} setLevel={setLevel} goal={goal} setGoal={setGoal} onContinue={() => setName(name.trim() || 'Learner')} />;

  return (
    <div className="app-shell">
      <div className="aurora aurora-a" /><div className="aurora aurora-b" /><div className="noise" />
      <header className="topbar">
        <div className="brand"><div className="logo-mark">S</div><div><div className="brand-name">SHUVRO</div><div className="brand-sub">AI ENGLISH TUTOR</div></div></div>
        <div className="top-actions"><button className={activeTab === 'studio' ? 'tab active' : 'tab'} onClick={() => setActiveTab('studio')}>Studio</button><button className={activeTab === 'progress' ? 'tab active' : 'tab'} onClick={() => setActiveTab('progress')}>Progress</button><button className="icon-btn" onClick={() => setShowSettings((v) => !v)}>⚙</button></div>
      </header>

      {activeTab === 'progress' ? <Progress progress={progress} exportProgress={exportProgress} onImport={importProgress} /> : (
        <main className="workspace">
          <aside className="left-panel glass">
            <div className="eyebrow">YOUR SESSION</div>
            <div className="profile-row"><div className="avatar">{name.slice(0,1).toUpperCase()}</div><div><div className="profile-name">{name}</div><div className="muted">{level} • {goal}</div></div></div>
            <div className="divider" /><div className="section-head"><span>Learning mode</span><span className="tiny-pill">LIVE</span></div>
            <div className="mode-grid">{modes.map((item) => <button key={item.id} className={mode === item.id ? 'mode-card selected' : 'mode-card'} onClick={() => setMode(item.id)} disabled={connected}><span className="mode-icon">{item.icon}</span><span className="mode-text"><strong>{item.label}</strong><small>{item.desc}</small></span></button>)}</div>
            <div className="divider" /><div className="session-meta"><div><span>Level</span><strong>{level}</strong></div><div><span>Streak</span><strong>{progress.learner.streakDays}d</strong></div></div>
          </aside>

          <section className="studio glass">
            <div className="studio-head"><div><div className="eyebrow">LIVE VOICE STUDIO</div><h1>{mode === 'IELTS Speaking' ? 'IELTS Speaking Mock' : 'Speak with SHUVRO'}</h1><p>{statusLabel}</p></div><div className="connection-dot"><span className={connected ? 'dot on' : 'dot'} />{connected ? 'LIVE' : 'OFFLINE'}</div></div>
            <div className={`orb-stage state-${status}`} style={{ '--audio-level': audioLevel } as React.CSSProperties}>
              <div className="halo h1" /><div className="halo h2" /><div className="halo h3" /><div className="audio-ripple r1" /><div className="audio-ripple r2" /><div className="audio-ripple r3" />
              <div className="orb-core"><div className="orb-spark s1" /><div className="orb-spark s2" /><div className="orb-spark s3" /><div className="orb-letter">S</div></div>
              <div className="orb-caption">{connected ? (status === 'speaking' ? `${selectedVoice.label} • SHUVRO` : status === 'listening' ? 'YOUR TURN' : 'ONE SECOND') : 'SHUVRO'}</div>
              {liveCaption && <div className={`live-caption ${captionRole || ''}`}><span>{captionRole === 'user' ? 'YOU' : 'SHUVRO'}</span>{liveCaption}</div>}
            </div>
            <div className="transcript-wrap"><div className="transcript-head"><span>Live subtitles & conversation</span><span>{transcript.length ? `${transcript.filter(x=>x.final).length} final lines` : 'Your conversation appears here'}</span></div><div className="transcript-scroll">{transcript.length === 0 ? <div className="empty-chat"><span>🎙</span><p>Start speaking naturally. SHUVRO will listen, respond in Gemini Live voice, and coach you according to the selected mode.</p></div> : transcript.map((item) => <div key={item.id} className={`line ${item.role}`}><span className="speaker">{item.role === 'user' ? 'YOU' : 'SHUVRO'}</span><span>{item.text}</span></div>)}</div></div>
            <div className="voice-controls"><button className={connected ? 'secondary-btn' : 'primary-btn'} onClick={connect}>{connected ? 'End session' : 'Start live voice'}</button><button className={connected && micOn ? 'mic-btn on' : 'mic-btn'} onClick={interactionMode === 'hands-free' ? toggleMic : undefined} onPointerDown={interactionMode === 'push-to-talk' ? pushToTalkStart : undefined} onPointerUp={interactionMode === 'push-to-talk' ? pushToTalkEnd : undefined} onPointerCancel={interactionMode === 'push-to-talk' ? pushToTalkEnd : undefined} disabled={!connected} aria-label={interactionMode === 'push-to-talk' ? 'Hold to speak' : 'Toggle microphone'}>{interactionMode === 'push-to-talk' ? '🎙 Hold' : (micOn ? '◉' : '◌')}</button></div>
            <div className="footer-note"><span>Gemini Live • {selectedVoice.label} • WebRTC • live subtitles</span><span>{interactionMode === 'push-to-talk' ? 'Push to talk' : 'Hands-free'} • {mode === 'IELTS Speaking' ? 'Exam flow protected' : 'Speak freely'}</span></div>
          </section>

          <aside className="right-panel"><div className="mini-card glass"><div className="mini-label">STREAK</div><div className="big-stat">{progress.learner.streakDays}</div><div className="muted">days of practice</div></div><div className="mini-card glass"><div className="mini-label">PRACTICE</div><div className="big-stat">{progress.learner.totalMinutes}</div><div className="muted">total minutes</div></div><div className="mini-card glass"><div className="mini-label">AI VOICE</div><div className="big-stat">{selectedVoice.label}</div><div className="muted">{selectedVoice.character}</div></div><div className="mini-card glass"><div className="mini-label">NEXT FOCUS</div><div className="focus-list">{progress.recentFocus.slice(0,4).map((x) => <span key={x}>{x}</span>)}</div></div></aside>
        </main>
      )}

      {showSettings && <div className="settings-panel glass"><div className="settings-title">Tutor settings</div><label>CEFR level<select disabled={connected} value={level} onChange={(e) => setLevel(e.target.value as CEFRLevel)}>{levels.map((x) => <option key={x}>{x}</option>)}</select></label><label>Main goal<select disabled={connected} value={goal} onChange={(e) => setGoal(e.target.value)}>{goals.map((x) => <option key={x}>{x}</option>)}</select></label><label>AI voice character<select disabled={connected} value={voice} onChange={(e) => setVoice(e.target.value)}>{voices.map((v) => <option key={v.id} value={v.id}>{v.label} — {v.character}</option>)}</select></label><div className="settings-hint">Voice changes apply to the next live session. Gemini Live exposes 30 built-in voice characters.</div><label>Voice interaction<select disabled={connected} value={interactionMode} onChange={(e) => setInteractionMode(e.target.value as 'hands-free' | 'push-to-talk')}><option value="hands-free">Hands-free conversation</option><option value="push-to-talk">Push to talk</option></select></label><label>IELTS target band<input disabled={connected} type="range" min="5" max="9" step="0.5" value={targetBand} onChange={(e) => setTargetBand(Number(e.target.value))} /><span className="range-value">{targetBand}</span></label><button className="secondary-btn full" onClick={() => setShowMemory((v) => !v)}>{showMemory ? 'Hide learning memory' : 'View learning memory'}</button>{showMemory && <div className="memory-box">{learnerMemory}</div>}<button className="secondary-btn full" onClick={() => setName('')}>Reset profile</button></div>}
    </div>
  );
}

function Onboarding(props: any) {
  const validName = props.name.trim().length >= 2;

  const handleContinue = () => {
    const name = props.name.trim();
    if (name.length < 2) return;
    props.setName(name);
    props.onContinue();
  };

  return <div className="onboarding"><div className="aurora aurora-a" /><div className="aurora aurora-b" /><div className="onboard-card glass"><div className="onboard-logo">S</div><div className="eyebrow">WELCOME TO SHUVRO</div><h1>Your English, but <em>more natural.</em></h1><p>Real-time Gemini voice practice with an adaptive tutor that remembers your progress, builds fluency habits, and gives you focused speaking practice.</p><div className="field"><span>Your name</span><input autoFocus value={props.name} onChange={(e) => props.setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && validName) handleContinue(); }} placeholder="e.g. Shuvro" /></div><div className="onboard-row"><div className="field"><span>Level</span><select value={props.level} onChange={(e) => props.setLevel(e.target.value)}>{levels.map((x) => <option key={x}>{x}</option>)}</select></div><div className="field"><span>Goal</span><select value={props.goal} onChange={(e) => props.setGoal(e.target.value)}>{goals.map((x) => <option key={x}>{x}</option>)}</select></div></div><button className="primary-btn wide" disabled={!validName} onClick={handleContinue}>Enter SHUVRO →</button><small className="muted">Enter at least 2 characters for your name. Progress is stored locally in this browser.</small></div></div>;
}
function Progress({ progress, exportProgress, onImport }: { progress: ProgressState; exportProgress: () => void; onImport: (file: File) => void }) {
  const skillEntries = Object.entries(progress.skills) as Array<[keyof ProgressState['skills'], number]>;
  return <main className="progress-page"><div className="progress-hero glass"><div><div className="eyebrow">YOUR LEARNING PATH</div><h1>Practice that <em>remembers you.</em></h1><p>{progress.lastSummary}</p></div><div className="progress-ring"><strong>{progress.learner.streakDays}</strong><span>day streak</span></div></div><div className="progress-grid"><div className="mini-card glass"><div className="mini-label">CURRENT LEVEL</div><div className="big-stat">{progress.learner.level}</div><div className="muted">Target band {progress.learner.targetBand}</div></div><div className="mini-card glass"><div className="mini-label">PRACTICE</div><div className="big-stat">{progress.learner.totalMinutes}m</div><div className="muted">{progress.learner.totalSessions} sessions • {progress.learner.totalWords} words</div></div><div className="mini-card glass"><div className="mini-label">HABIT</div><div className="big-stat">10 min</div><div className="muted">speak out loud today</div></div></div><div className="progress-timeline glass"><div className="mini-label">SKILL MAP</div><div className="bars">{skillEntries.map(([label, value]) => <div key={label}><span>{label}</span><i style={{ width: `${value}%` }} /></div>)}</div></div><div className="progress-timeline glass"><div className="mini-label">RECENT SESSIONS</div><div className="session-history">{progress.recentSessions.length ? progress.recentSessions.map((s) => <div className="history-row" key={s.id}><div><strong>{s.mode}</strong><small>{s.date} • {s.minutes}m • {s.words} words</small></div><span>{s.level}</span></div>) : <div className="muted">Complete a live session and SHUVRO will start building your learning history.</div>}</div></div><div className="progress-actions"><button className="secondary-btn" onClick={exportProgress}>Export my progress</button><label className="secondary-btn import-btn">Import progress<input type="file" accept="application/json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) onImport(f); e.currentTarget.value = ''; }} /></label></div></main>
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
