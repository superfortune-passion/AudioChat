import { useState } from "react";
import { MatchMode, MUSIC_INTERESTS } from "../constants/interests";
import { useMicrophone } from "../hooks/useMicrophone";
import { useWebRTC } from "../hooks/useWebRTC";
import "./Landing.css";

export function Landing() {
  const [matchMode, setMatchMode] = useState<MatchMode>("random");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [joined, setJoined] = useState(false);

  const {
    audioTrack,
    permissionState,
    errorMessage,
    isMuted,
    requestMicrophone,
    toggleMute,
    stopMicrophone,
  } = useMicrophone();

  const { status, statusMessage, skip, rematch } = useWebRTC({
    audioTrack,
    interests: selectedInterests,
    matchMode,
    enabled: joined && permissionState === "granted",
  });

  const toggleInterest = (interest: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest]
    );
  };

  const handleJoin = async () => {
    const granted = await requestMicrophone();
    if (granted) {
      setJoined(true);
    }
  };

  const handleLeave = () => {
    setJoined(false);
    stopMicrophone();
  };

  const isInCall = status === "matched";
  const isWaiting = joined && status === "lobby";

  return (
    <div className="app">
      <header className="header">
        <div className="logo">
          <span className="logo-icon">♪</span>
          <h1>JamLink</h1>
        </div>
        <p className="tagline">Anonymous audio jams for musicians</p>
      </header>

      {!joined ? (
        <main className="setup">
          <section className="card">
            <h2>How do you want to match?</h2>
            <div className="mode-toggle">
              <button
                className={`mode-btn ${matchMode === "random" ? "active" : ""}`}
                onClick={() => setMatchMode("random")}
              >
                Random
                <span>Match with any musician</span>
              </button>
              <button
                className={`mode-btn ${matchMode === "interest" ? "active" : ""}`}
                onClick={() => setMatchMode("interest")}
              >
                By Interest
                <span>Match by shared styles &amp; instruments</span>
              </button>
            </div>
          </section>

          {matchMode === "interest" && (
            <section className="card">
              <h2>Pick your interests</h2>
              <p className="hint">Select at least one to find like-minded jammers</p>
              <div className="interest-grid">
                {MUSIC_INTERESTS.map((interest) => (
                  <button
                    key={interest}
                    className={`interest-chip ${
                      selectedInterests.includes(interest) ? "selected" : ""
                    }`}
                    onClick={() => toggleInterest(interest)}
                  >
                    {interest}
                  </button>
                ))}
              </div>
            </section>
          )}

          <section className="card mic-card">
            <h2>Microphone</h2>
            {permissionState === "prompt" && (
              <p className="hint">
                JamLink is audio-only. You&apos;ll need mic access to join a session.
              </p>
            )}
            {permissionState === "granted" && (
              <p className="status-ok">Microphone ready</p>
            )}
            {errorMessage && <p className="status-error">{errorMessage}</p>}

            <button
              className="primary-btn"
              onClick={handleJoin}
              disabled={
                matchMode === "interest" && selectedInterests.length === 0
              }
            >
              Start Jamming
            </button>
          </section>
        </main>
      ) : (
        <main className="session">
          <section className="card session-card">
            <div className="visualizer">
              <div
                className={`pulse-ring ${isInCall ? "active" : ""} ${
                  isMuted ? "muted" : ""
                }`}
              >
                <span className="pulse-icon">{isMuted ? "🔇" : "🎤"}</span>
              </div>
              {isInCall && (
                <div className="remote-indicator">
                  <span className="remote-dot" />
                  Partner connected
                </div>
              )}
            </div>

            <div className="session-status">
              {status === "connecting" && (
                <p>Connecting to server...</p>
              )}
              {isWaiting && (
                <p>
                  {matchMode === "interest"
                    ? "Looking for a musician with shared interests..."
                    : "Looking for a random jam partner..."}
                </p>
              )}
              {isInCall && <p className="status-live">Live jam in progress</p>}
              {statusMessage && <p className="status-info">{statusMessage}</p>}
            </div>

            <div className="controls">
              <button
                className={`control-btn ${isMuted ? "active-danger" : ""}`}
                onClick={toggleMute}
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? "Unmute" : "Mute"}
              </button>
              <button
                className="control-btn skip-btn"
                onClick={skip}
                disabled={!isInCall && !isWaiting}
              >
                Skip
              </button>
              <button
                className="control-btn"
                onClick={rematch}
              >
                Rematch
              </button>
              <button className="control-btn leave-btn" onClick={handleLeave}>
                Leave
              </button>
            </div>
          </section>
        </main>
      )}

      <footer className="footer">
        <p>Anonymous · Audio-only · No video · No chat logs</p>
      </footer>
    </div>
  );
}
