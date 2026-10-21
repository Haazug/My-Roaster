"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Volume2, Volume1, VolumeX } from "lucide-react";

export default function BackgroundMusic() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const mutedRef = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(0.15);

  useEffect(() => {
    try {
      if (localStorage.getItem("myroster.music.muted") === "1") {
        mutedRef.current = true;
        setMuted(true);
      }
      const v = parseFloat(localStorage.getItem("myroster.music.volume") || "");
      if (!isNaN(v)) setVolume(v);
    } catch {}
  }, []);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
    try { localStorage.setItem("myroster.music.volume", String(volume)); } catch {}
  }, [volume]);

  const start = useCallback(async () => {
    const a = audioRef.current;
    if (!a || mutedRef.current) return false;
    try {
      await a.play();
      return true;
    } catch {
      return false;
    }
  }, []);

  // Try now; if the browser blocks it, start on the first click/touch/key
  useEffect(() => {
    start();
    const events = ["pointerdown", "keydown", "touchstart"];
    const cleanup = () => events.forEach((e) => window.removeEventListener(e, onGesture));
    const onGesture = async () => {
      if (await start()) cleanup();
    };
    events.forEach((e) => window.addEventListener(e, onGesture, { passive: true }));
    return cleanup;
  }, [start]);

  const toggleMute = async () => {
    const next = !muted;
    mutedRef.current = next;
    setMuted(next);
    try { localStorage.setItem("myroster.music.muted", next ? "1" : "0"); } catch {}
    const a = audioRef.current;
    if (!a) return;
    if (next) a.pause();
    else await start();
  };

  const onButton = async () => {
    if (!playing && !muted) {
      await start();
      return;
    }
    toggleMute();
  };

  const label = muted ? "🔇 Muted" : playing ? "🔊 Music On" : "▶ Play music";

  return (
    <>
      <audio
        ref={audioRef}
        src="/aviao_es-e-mu_sicas.mp3"
        loop
        preload="auto"
        onPlaying={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />
      <div className="fixed bottom-20 right-4 z-40 md:bottom-24 md:right-8">
        <div className="rounded-lg border border-[#333] bg-[#1a1a1a] p-3 shadow-lg backdrop-blur">
          <div className="mb-2 flex items-center gap-3">
            {muted ? <VolumeX className="h-4 w-4 text-gray-400" /> : volume < 0.3 ? <Volume1 className="h-4 w-4 text-[#4caf50]" /> : <Volume2 className="h-4 w-4 text-[#1f88ff]" />}
            <input type="range" min="0" max="1" step="0.05" value={volume} onChange={(e) => setVolume(parseFloat(e.target.value))} className="h-1 w-20 cursor-pointer appearance-none rounded-lg bg-[#333] accent-[#1f88ff]" disabled={muted} />
          </div>
          <button onClick={onButton} className={`w-full rounded px-3 py-2 text-xs font-medium transition-all ${muted ? "bg-red-600 text-white hover:bg-red-700" : "bg-[#1f88ff] text-white hover:bg-blue-600"}`}>
            {label}
          </button>
          <p className="mt-2 text-center text-xs text-gray-500">{Math.round(volume * 100)}% volume</p>
        </div>
      </div>
    </>
  );
}