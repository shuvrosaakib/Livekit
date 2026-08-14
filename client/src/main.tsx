import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import './styles.css';

export function App() {
  const [name, setName] = useState(() => localStorage.getItem('shuvro_user_name') || '');
  const [level, setLevel] = useState(() => localStorage.getItem('shuvro_user_level') || 'A2');
  const [goal, setGoal] = useState(() => localStorage.getItem('shuvro_user_goal') || 'Workplace English');
  const [isJoined, setIsJoined] = useState(() => localStorage.getItem('shuvro_session_active') === 'true');

  useEffect(() => {
    localStorage.setItem('shuvro_user_name', name);
    localStorage.setItem('shuvro_user_level', level);
    localStorage.setItem('shuvro_user_goal', goal);
  }, [name, level, goal]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length >= 2) {
      localStorage.setItem('shuvro_session_active', 'true');
      setIsJoined(true);
    }
  };

  const handleEndSession = () => {
    localStorage.removeItem('shuvro_session_active');
    setIsJoined(false);
  };

  if (!isJoined) {
    return (
      <div className="onboarding-container">
        <h1>Welcome to SHUVRO</h1>
        <form onSubmit={handleSubmit}>
          <label>Your Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Shuvro"
            required
            minLength={2}
          />
          
          <label>Level</label>
          <select value={level} onChange={(e) => setLevel(e.target.value)}>
            <option value="A1">A1</option>
            <option value="A2">A2</option>
            <option value="B1">B1</option>
            <option value="B2">B2</option>
          </select>

          <label>Goal</label>
          <select value={goal} onChange={(e) => setGoal(e.target.value)}>
            <option value="Workplace English">Workplace English</option>
            <option value="General Conversation">General Conversation</option>
            <option value="IELTS Speaking">IELTS Speaking</option>
          </select>

          <button type="submit" disabled={name.trim().length < 2}>
            Enter SHUVRO &rarr;
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="studio-container">
      <h2>Speak with SHUVRO</h2>
      <p>User: {name} | Level: {level}</p>
      <button onClick={handleEndSession}>End Session</button>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
