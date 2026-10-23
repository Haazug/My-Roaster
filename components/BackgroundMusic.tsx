"use client";
import { useEffect, useState } from "react";
import { Volume2, Volume1, VolumeX } from "lucide-react";
import { canStorePreferences } from "@/lib/consent";
import { useT } from "@/lib/i18n";
import * as sound from "@/lib/sound";

const save = (k: string, v: string) => {
  try {
    if (canStorePreferences()) localStorage.setItem(k, v);
  } catch {}
};

export default function BackgroundMusic() {
  const t = useT();
  const [s, setS] = useState<sound.SoundState>(sound.getState());

  useEffect(() => {
    try {
      const v = parseFloat(localStorage.getItem("myroster.music.volume") || "");
      if (!isNaN(v)) sound.setVolume(v);
      if (localStorage.getItem("myroster.music.muted") === "1") sound.setMuted(true);
    } catch {}

    const events = ["pointerup", "touchend", "click", "keydown"];
    const onGesture = () => sound.unlock();
    const removeGesture = () => events.forEach((e) => window.removeEventListener(e, onGesture));
    events.forEach((e) => window.addEventListener(e, onGesture));

    const off = sound.subscribe((st) => {
      setS(st);
      if (st.playing) removeGesture();
    });
    setS(sound.getState());
    sound.start();
    return () => {
      off();
      removeGesture();
    };
  }, []);

  const changeVolume = (v: number) => {
    sound.unlock();
    sound.setVolume(v);
    save("myroster.music.volume", String(v));
  };
  const toggleMute = () => {
    sound.unlock();
    const next = !s.muted;
    sound.setMuted(next);
    save("myroster.music.muted", next ? "1" : "0");
  };

  const label = s.muted ? "🔇 " + t("music.muted") : s.playing ? "🔊 " + t("music.on") : "▶ " + t("music.play");

  return (
    <div className="fixed bottom-20 right-4 md:bottom-24 md:right-8 z-40">
      <div className="bg-[#1a1a1a] border border-[#333] rounded-lg p-3 shadow-lg backdrop-blur">
        <div className="flex items-center gap-3 mb-2">
          {s.muted ? <VolumeX className="w-4 h-4 text-gray-400" /> : s.volume < 0.3 ? <Volume1 className="w-4 h-4 text-[#4caf50]" /> : <Volume2 className="w-4 h-4 text-[#1f88ff]" />}
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={s.volume}
            onChange={(e) => changeVolume(parseFloat(e.target.value))}
            className="w-24 h-1 bg-[#333] rounded-lg appearance-none cursor-pointer accent-[#1f88ff]"
            disabled={s.muted}
            aria-label="Volume"
          />
        </div>
        <button onClick={toggleMute} className={`w-full min-h-9 px-3 py-2 rounded text-xs font-medium transition-all ${s.muted ? "bg-red-600 hover:bg-red-700 text-white" : "bg-[#1f88ff] hover:bg-blue-600 text-white"}`}>
          {label}
        </button>
        <p className="text-xs text-gray-500 mt-2 text-center">{t("music.volume", { n: Math.round(s.volume * 100) })}</p>
      </div>
    </div>
  );
}
