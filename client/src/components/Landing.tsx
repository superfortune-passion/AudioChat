import { useEffect, useId, useState } from "react";
import {
  INTEREST_DISPLAY,
  MatchMode,
  MUSIC_INTERESTS,
} from "../constants/interests";
import { useMicrophone } from "../hooks/useMicrophone";
import { ServerStats, useServerStats } from "../hooks/useServerStats";
import { useWebRTC } from "../hooks/useWebRTC";
import "./Landing.css";

function Waveform({ active = false }: { active?: boolean }) {
  return (
    <div
      className={`waveform ${active ? "waveform--active" : ""}`}
      aria-hidden="true"
    >
      {Array.from({ length: 11 }).map((_, i) => (
        <span
          key={i}
          className="waveform__bar"
          style={{ animationDelay: `${i * 0.07}s` }}
        />
      ))}
    </div>
  );
}

function LogoWave() {
  const gradId = useId();
  return (
    <svg className="brand-wave" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect x="4" y="12" width="3" height="8" rx="1.5" fill={`url(#${gradId})`} />
      <rect x="10" y="8" width="3" height="16" rx="1.5" fill={`url(#${gradId})`} />
      <rect x="16" y="11" width="3" height="10" rx="1.5" fill={`url(#${gradId})`} />
      <rect x="22" y="6" width="3" height="20" rx="1.5" fill={`url(#${gradId})`} />
      <defs>
        <linearGradient id={gradId} x1="4" y1="6" x2="28" y2="26">
          <stop stopColor="#BD10E0" />
          <stop offset="1" stopColor="#FF007A" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function IconMic() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="9" y="2" width="6" height="11" rx="3" />
      <path d="M5 10v1a7 7 0 0 0 14 0v-1" />
      <line x1="12" y1="18" x2="12" y2="22" />
      <line x1="8" y1="22" x2="16" y2="22" />
    </svg>
  );
}

function IconMicMuted() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <line x1="1" y1="1" x2="23" y2="23" />
      <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V5a3 3 0 0 0-5.94-.6" />
      <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

function IconShuffle() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M16 3h5v5" />
      <path d="M4 20L21 3" />
      <path d="M21 16v5h-5" />
      <path d="M15 15l6 6" />
      <path d="M4 4l5 5" />
    </svg>
  );
}

function IconPhoneEnd() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91" />
      <line x1="23" y1="1" x2="1" y2="23" />
    </svg>
  );
}

function IconSkip() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="5" y="5" width="3" height="14" rx="1" />
      <path d="M10 12l9-6v12l-9-6z" />
    </svg>
  );
}

function IconShield() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

function IconMask() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="10" r="6" />
      <path d="M6 20c0-4 2.5-7 6-7s6 3 6 7" />
      <circle cx="9.5" cy="9.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="14.5" cy="9.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconBolt() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" />
    </svg>
  );
}

function HeroEqualizer({ side }: { side: "left" | "right" }) {
  const heights = side === "left" ? [12, 20, 10] : [10, 18, 12];
  return (
    <span className={`hero-eq hero-eq--${side}`} aria-hidden="true">
      {heights.map((h, i) => (
        <span
          key={i}
          className="hero-eq__bar"
          style={{ height: `${h}px`, animationDelay: `${i * 0.12}s` }}
        />
      ))}
    </span>
  );
}

function HeroElectricWaves() {
  const filterId = useId();
  return (
    <svg
      className="hero-electric"
      viewBox="0 0 520 240"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <filter id={filterId} x="0" y="0" width="100%" height="100%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient id={`${filterId}-blue`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0" />
          <stop offset="55%" stopColor="#38bdf8" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#818cf8" stopOpacity="0.35" />
        </linearGradient>
        <linearGradient id={`${filterId}-pink`} x1="100%" y1="0%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#ff007a" stopOpacity="1" />
          <stop offset="45%" stopColor="#ec4899" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#a855f7" stopOpacity="0.2" />
        </linearGradient>
      </defs>

      {/* Subtle blue wisps — left */}
      <g className="hero-electric__blue" filter={`url(#${filterId})`}>
        <path
          d="M0 118 C80 108, 140 128, 220 120 S340 112, 260 118"
          fill="none"
          stroke={`url(#${filterId}-blue)`}
          strokeWidth="1.2"
          opacity="0.55"
        />
        <path
          d="M0 132 C90 122, 150 142, 240 130 S320 124, 250 134"
          fill="none"
          stroke="#38bdf8"
          strokeWidth="0.8"
          opacity="0.35"
        />
        <path
          d="M20 104 C100 98, 160 110, 230 106"
          fill="none"
          stroke="#60a5fa"
          strokeWidth="0.6"
          opacity="0.3"
        />
      </g>

      {/* Electric pink threads — right */}
      <g className="hero-electric__pink" filter={`url(#${filterId})`}>
        <path
          className="hero-electric__strand"
          d="M300 108 C360 98, 400 118, 460 112 C490 108, 510 116, 520 110"
          fill="none"
          stroke={`url(#${filterId}-pink)`}
          strokeWidth="2"
        />
        <path
          className="hero-electric__strand hero-electric__strand--delay"
          d="M290 124 C350 116, 390 132, 450 126 C480 122, 505 130, 520 124"
          fill="none"
          stroke="#ff007a"
          strokeWidth="1.4"
          opacity="0.85"
        />
        <path
          className="hero-electric__strand"
          d="M310 92 C370 86, 410 100, 470 94 C500 90, 515 98, 520 94"
          fill="none"
          stroke="#f472b6"
          strokeWidth="1"
          opacity="0.7"
        />
        <path
          className="hero-electric__strand hero-electric__strand--delay2"
          d="M280 138 C340 130, 380 148, 440 140 C475 136, 505 144, 520 138"
          fill="none"
          stroke="#ec4899"
          strokeWidth="0.9"
          opacity="0.6"
        />
        <path
          className="hero-electric__strand"
          d="M320 100 C380 94, 420 108, 480 102"
          fill="none"
          stroke="#ff4d9d"
          strokeWidth="0.5"
          opacity="0.9"
        />
      </g>
    </svg>
  );
}

function HeroVisual() {
  return (
    <div className="dash__hero-visual" aria-hidden="true">
      <HeroElectricWaves />
      <div className="hero-ring">
        <span className="hero-ring__halo" />
        <div className="hero-ring__inner">
          <HeroEqualizer side="left" />
          <IconMic />
          <HeroEqualizer side="right" />
        </div>
      </div>
    </div>
  );
}

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

const INFO_CARDS = [
  {
    id: "secure",
    title: "Private & Secure",
    desc: "Your identity is always protected. We don't store any personal data.",
  },
  {
    id: "instant",
    title: "Instant Connection",
    desc: "Get matched in seconds and start talking right away.",
  },
  {
    id: "community",
    title: "Respectful Community",
    desc: "Be kind, be respectful. Help us keep JamLink a safe place for everyone.",
  },
] as const;

function InfoCardIcon({ type }: { type: (typeof INFO_CARDS)[number]["id"] }) {
  const svgProps = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };

  if (type === "secure") {
    return (
      <svg {...svgProps}>
        <rect x="5" y="11" width="14" height="10" rx="2" />
        <path d="M8 11V8a4 4 0 0 1 8 0v3" />
      </svg>
    );
  }
  if (type === "instant") {
    return (
      <svg {...svgProps}>
        <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" />
      </svg>
    );
  }
  return (
    <svg {...svgProps}>
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
    </svg>
  );
}

type MatchPhase = "idle" | "connecting" | "searching" | "matched" | "disconnected";

function TopBar({
  stats,
  connectionState,
  matchPhase,
  matchLabel,
}: {
  stats: ServerStats;
  connectionState: string;
  matchPhase: MatchPhase;
  matchLabel: string;
}) {
  return (
    <header className="top-bar" aria-label="JamLink header">
      <div className="top-bar__brand">
        <LogoWave />
        <div>
          <p className="top-bar__name">JamLink</p>
          <p className="top-bar__tag">Jam. Listen. Connect.</p>
        </div>
      </div>

      <div className="top-bar__meta">
        <div className="top-bar__pill top-bar__pill--server" role="status" aria-live="polite">
          <span className={`top-bar__dot top-bar__dot--${connectionState}`} aria-hidden="true" />
          <span>
            <strong>{stats.online}</strong> online
          </span>
        </div>

        <div className="top-bar__pill top-bar__pill--calling" role="status" aria-live="polite">
          <span className="top-bar__dot top-bar__dot--calling" aria-hidden="true" />
          <span>
            <strong>{stats.calling}</strong> calling
          </span>
        </div>

        <div className="top-bar__pill top-bar__pill--matching" role="status" aria-live="polite">
          <span className="top-bar__dot top-bar__dot--matching" aria-hidden="true" />
          <span>
            <strong>{stats.matching}</strong> matching
          </span>
        </div>

        <div
          className={`top-bar__pill top-bar__pill--status top-bar__pill--${matchPhase}`}
          role="status"
          aria-live="polite"
        >
          <span className={`top-bar__match-dot top-bar__match-dot--${matchPhase}`} aria-hidden="true" />
          <span>
            <span className="top-bar__status-label">You:</span> {matchLabel}
          </span>
        </div>
      </div>
    </header>
  );
}

export function Landing() {
  const [matchMode, setMatchMode] = useState<MatchMode>("random");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [joined, setJoined] = useState(false);
  const [callSeconds, setCallSeconds] = useState(0);

  const {
    permissionState,
    errorMessage,
    isMuted,
    audioTrack,
    requestMicrophone,
    toggleMute,
    stopMicrophone,
  } = useMicrophone();

  const { stats: idleServerStats, reachability: serverReachability } =
    useServerStats(!joined);

  const { status, statusMessage, serverStats, skip, rematch } = useWebRTC({
    audioTrack,
    interests: selectedInterests,
    matchMode,
    enabled: joined && permissionState === "granted",
  });

  const stats = joined ? serverStats : idleServerStats;

  const toggleInterest = (interest: string) => {
    setMatchMode("interest");
    setSelectedInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest]
    );
  };

  const handleJoin = async () => {
    const granted = await requestMicrophone();
    if (granted) setJoined(true);
  };

  const handleLucky = async () => {
    setMatchMode("random");
    setSelectedInterests([]);
    const granted = await requestMicrophone();
    if (granted) setJoined(true);
  };

  const handleLeave = () => {
    setJoined(false);
    stopMicrophone();
  };

  const isInCall = status === "matched";
  const isWaiting = joined && status === "lobby";
  const isConnecting = joined && status === "connecting";
  const isDisconnected = joined && !!statusMessage && !isInCall;
  const isSearching = isWaiting || isConnecting;

  const connectionState = joined
    ? isConnecting
      ? "connecting"
      : "online"
    : serverReachability;

  useEffect(() => {
    if (!isInCall) {
      setCallSeconds(0);
      return;
    }
    const id = window.setInterval(() => setCallSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [isInCall]);

  const ctaDisabled =
    matchMode === "interest" && selectedInterests.length === 0;

  const interestPreview =
    selectedInterests.length > 0
      ? selectedInterests.join(", ")
      : "";

  const matchModeLabel =
    matchMode === "random" ? "Random" : "By style";

  let matchPhase: MatchPhase = "idle";
  let matchLabel = "Ready to match";

  if (joined) {
    if (isConnecting) {
      matchPhase = "connecting";
      matchLabel = "Connecting…";
    } else if (isSearching) {
      matchPhase = "searching";
      matchLabel = "Matching…";
    } else if (isInCall) {
      matchPhase = "matched";
      matchLabel = "In call";
    } else if (isDisconnected) {
      matchPhase = "disconnected";
      matchLabel = statusMessage || "Disconnected";
    }
  }

  return (
    <div className="jamlink">
      <div className="jamlink__bg" aria-hidden="true" />

      <div className="jamlink__shell">
        <TopBar
          stats={stats}
          connectionState={connectionState}
          matchPhase={matchPhase}
          matchLabel={matchLabel}
        />

        {!joined ? (
          <main className="dash" aria-label="Dashboard">
            <header className="dash__hero">
              <div className="dash__hero-text">
                <h1 className="dash__title">
                  <span className="dash__title-word">Jam.</span>{" "}
                  <span className="dash__title-word dash__title-word--listen">
                    Listen.
                  </span>{" "}
                  <span className="dash__title-word dash__title-word--connect">
                    Connect.
                  </span>
                </h1>
                <p className="dash__sub">
                  Hop into a voice conversation with someone new, completely
                  anonymous.
                </p>
                <div className="dash__badges">
                  <span className="dash__badge">
                    <IconMask />
                    100% Anonymous
                  </span>
                  <span className="dash__badge">
                    <IconBolt />
                    No Sign-Up Required
                  </span>
                </div>
              </div>
              <HeroVisual />
            </header>

            <section className="match-panel" aria-label="Start matching">
              <div className="match-panel__grid">
                <div className="match-panel__interests">
                  <h2 className="match-panel__title">
                    Share your interests <span>(optional)</span>
                  </h2>
                  <p className="match-panel__hint">
                    Helps us match you with people who share similar vibes.
                  </p>
                  <div className="match-panel__input-wrap">
                    <input
                      className="match-panel__input"
                      type="text"
                      readOnly
                      value={interestPreview}
                      placeholder="e.g. music, gaming, movies..."
                      aria-label="Selected music styles"
                    />
                    <span className="match-panel__smiley" aria-hidden="true">☺</span>
                  </div>

                  <p className="match-panel__chips-label">Popular interests</p>
                  <div className="match-panel__chips" role="group" aria-label="Music interests">
                    {MUSIC_INTERESTS.map((interest) => {
                      const selected = selectedInterests.includes(interest);
                      return (
                        <button
                          key={interest}
                          type="button"
                          className={`tag-chip ${selected ? "tag-chip--on" : ""}`}
                          onClick={() => toggleInterest(interest)}
                          aria-pressed={selected}
                        >
                          {INTEREST_DISPLAY[interest]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="match-panel__match">
                  <button
                    type="button"
                    className="btn-start"
                    onClick={handleJoin}
                    disabled={ctaDisabled}
                    aria-label="Start Matching"
                  >
                    <IconMic />
                    <span className="btn-start__text">
                      <strong>Start Matching</strong>
                      <small>Find a random voice chat partner</small>
                    </span>
                  </button>
                  <button
                    type="button"
                    className="btn-lucky"
                    onClick={handleLucky}
                    aria-label="I'm Feeling Lucky"
                  >
                    <IconShuffle />
                    I&apos;m Feeling Lucky
                  </button>
                  <p className="match-panel__lucky-hint">
                    Instantly connect with a random user
                  </p>
                  <p className="match-panel__mic" role="status" aria-live="polite">
                    {permissionState === "granted"
                      ? "Microphone ready"
                      : permissionState === "denied" || permissionState === "error"
                        ? "Microphone blocked"
                        : "Microphone required when you start"}
                  </p>
                  {errorMessage && (
                    <p className="match-panel__mic match-panel__mic--err" role="alert">
                      {errorMessage}
                    </p>
                  )}
                </div>
              </div>
            </section>

            <footer className="dash__cards" aria-label="Platform features">
              {INFO_CARDS.map((card) => (
                <article
                  key={card.id}
                  className={`info-card info-card--${card.id}`}
                >
                  <span className="info-card__icon-wrap">
                    <InfoCardIcon type={card.id} />
                  </span>
                  <div className="info-card__body">
                    <h3 className="info-card__title">{card.title}</h3>
                    <p className="info-card__desc">{card.desc}</p>
                  </div>
                </article>
              ))}
            </footer>

            <p className="dash__legal">
              By using JamLink you agree to our community guidelines. Be kind and respectful.
            </p>
          </main>
        ) : (
          <div className="jamlink__call">
            <main className="call" aria-label="Active jam session">
            <div className="call__status">
              {isConnecting && (
                <>
                  <p className="call__heading">Connecting…</p>
                  <p className="call__sub">Linking to the server</p>
                </>
              )}
              {isSearching && (
                <>
                  <p className="call__heading call__heading--grad">Searching…</p>
                  <p className="call__sub">Finding your next jam partner</p>
                </>
              )}
              {isInCall && (
                <>
                  <p className="call__heading">
                    <span className="call__live-icon" aria-hidden="true">〰️</span>
                    Connected
                  </p>
                  <p className="call__sub">You&apos;re jamming with an anonymous musician</p>
                  <p className="call__timer" aria-label="Call duration">
                    {formatTimer(callSeconds)}
                  </p>
                </>
              )}
              {isDisconnected && (
                <>
                  <p className="call__heading call__heading--warn">Disconnected</p>
                  <p className="call__sub">{statusMessage}</p>
                </>
              )}
            </div>

            <div className="call__stage">
              <button
                type="button"
                className="call__side-btn"
                disabled
                title="Coming soon"
                aria-label="Leave feedback"
              >
                Leave Feedback
              </button>

              <div className="call__center">
                <div
                  className={`call-ring ${
                    isInCall ? "call-ring--live" : ""
                  } ${isSearching ? "call-ring--search" : ""} ${
                    isMuted ? "call-ring--muted" : ""
                  }`}
                >
                  <div className="call-ring__avatar" aria-hidden="true">🎤</div>
                </div>
                <Waveform active={isInCall || isSearching} />
                <span className="call__anon-badge">
                  <IconShield />
                  100% Anonymous
                </span>
              </div>

              <button
                type="button"
                className="call__side-btn call__side-btn--accent"
                onClick={skip}
                disabled={!isInCall && !isWaiting}
                aria-label="Next match"
              >
                Next Match
                <IconSkip />
              </button>
            </div>

            <div className="call__controls" role="group" aria-label="Call controls">
              <button
                type="button"
                className={`call-ctrl ${isMuted ? "call-ctrl--muted" : ""}`}
                onClick={toggleMute}
                aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
              >
                <span className="call-ctrl__icon">
                  {isMuted ? <IconMicMuted /> : <IconMic />}
                </span>
                Mute
              </button>
              <button
                type="button"
                className="call-ctrl call-ctrl--end"
                onClick={handleLeave}
                aria-label="End call"
              >
                <span className="call-ctrl__icon">
                  <IconPhoneEnd />
                </span>
                End Call
              </button>
              <button
                type="button"
                className="call-ctrl call-ctrl--skip"
                onClick={skip}
                disabled={!isInCall && !isWaiting}
                aria-label="Skip to next musician"
              >
                <span className="call-ctrl__icon">
                  <IconSkip />
                </span>
                Next Match
              </button>
            </div>

            {isDisconnected && (
              <button
                type="button"
                className="btn-rematch"
                onClick={rematch}
                aria-label="Find another musician"
              >
                Find another musician
              </button>
            )}

            <div className="call__meta">
              <div className="call__meta-item">
                <span className="call__meta-icon" aria-hidden="true">🎯</span>
                <div>
                  <p className="call__meta-label">Match Mode</p>
                  <p className="call__meta-value">{matchModeLabel}</p>
                </div>
              </div>
              <div className="call__meta-item">
                <span className="call__meta-icon" aria-hidden="true">⭐</span>
                <div>
                  <p className="call__meta-label">
                    Interests ({selectedInterests.length})
                  </p>
                  <p className="call__meta-value">
                    {selectedInterests.length > 0
                      ? selectedInterests.join(", ")
                      : "None"}
                  </p>
                </div>
              </div>
              <div className="call__meta-item">
                <span className="call__meta-icon" aria-hidden="true">⏱️</span>
                <div>
                  <p className="call__meta-label">Time Connected</p>
                  <p className="call__meta-value">{formatTimer(callSeconds)}</p>
                </div>
              </div>
            </div>

            <p className="call__tip">
              <span aria-hidden="true">✨</span>
              Tip: Be kind and respectful. Great jams start with good vibes.
            </p>
          </main>
        </div>
        )}
      </div>
    </div>
  );
}
