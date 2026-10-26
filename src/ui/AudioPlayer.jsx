import React, { useEffect, useRef, useState } from "react";
import { Icon } from "./primitives";

export function AudioPlayer({ track, onStop }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(30);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!track || !track.preview) {
      setPlaying(false);
      return;
    }
    setError(null);
    setProgress(0);
    const audio = audioRef.current;
    if (audio) {
      audio.src = track.preview;
      audio.load();
      audio.play().then(() => {
        setPlaying(true);
      }).catch((e) => {
        console.warn("Playback prevented or failed:", e);
        setError("Preview audio unavailable or autoplay blocked. Click play to listen.");
        setPlaying(false);
      });
    }
  }, [track]);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) {
      a.pause();
      setPlaying(false);
    } else {
      a.play().then(() => {
        setPlaying(true);
        setError(null);
      }).catch((e) => {
        setError("Cannot play audio stream: " + e.message);
      });
    }
  };

  const onTimeUpdate = () => {
    const a = audioRef.current;
    if (a && a.duration) {
      setProgress((a.currentTime / a.duration) * 100);
      setDuration(a.duration);
    }
  };

  const onEnded = () => {
    setPlaying(false);
    setProgress(100);
  };

  if (!track) return null;

  return (
    <div className="audio-player-bar" role="region" aria-label="Audio Preview Player">
      <audio
        ref={audioRef}
        onTimeUpdate={onTimeUpdate}
        onEnded={onEnded}
        onError={() => setError("Could not load preview stream")}
      />
      <div className="player-inner">
        {track.artwork ? (
          <img src={track.artwork} alt={track.title} className="player-art" />
        ) : (
          <div className="player-art-ph">
            <Icon n="play" s={14} />
          </div>
        )}
        <div className="player-info">
          <div className="player-title">
            <b>{track.title || "Track Preview"}</b>
            {track.artistName && <span className="muted"> · {track.artistName}</span>}
          </div>
          <div className="player-sub">
            <span className="chip lime" style={{ fontSize: 10, padding: "1px 6px" }}>30s Master Preview</span>
            {error ? (
              <span className="player-error">{error}</span>
            ) : (
              <span className="muted" style={{ fontSize: 11 }}>
                {Math.floor((progress / 100) * duration)}s / {Math.round(duration)}s
              </span>
            )}
          </div>
        </div>

        <button className="btn sm primary player-btn" onClick={toggle} aria-label={playing ? "Pause" : "Play"}>
          <Icon n={playing ? "x" : "play"} s={16} />
          <span>{playing ? "Pause" : "Play"}</span>
        </button>

        <div className="player-progress-bar" onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const pos = (e.clientX - rect.left) / rect.width;
          if (audioRef.current && audioRef.current.duration) {
            audioRef.current.currentTime = pos * audioRef.current.duration;
          }
        }}>
          <div className="player-progress-fill" style={{ width: `${progress}%` }} />
        </div>

        {onStop && (
          <button className="btn sm ghost player-close" onClick={onStop} title="Close audio player">
            <Icon n="x" s={14} />
          </button>
        )}
      </div>
    </div>
  );
}
