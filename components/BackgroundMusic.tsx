"use client";
import {useEffect, useRef, useState} from "react";
import {Volume2, Volume1, VolumeX} from "lucide-react";

export default function BackgroundMusic() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.15);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.loop = true;
    audio.volume = volume;
    const playAudio = async () => {
      try {
        audio.muted = true;
        await audio.play();
        setTimeout(() => {
          if (audio && !isMuted) {
            audio.muted = false;
            audio.volume = volume;
          }
        }, 500);
      } catch (error) {
        console.log("Autoplay não permitido");
      }
    };
    playAudio();
    return () => {
      if (audio) audio.pause();
    };
  }, [isMuted, volume]);

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) audioRef.current.volume = newVolume;
  };

  return (
    <>
      <audio ref={audioRef} src="/aviao_es-e-mu_sicas.mp3" loop preload="auto" />
      <div className="fixed bottom-20 right-4 md:bottom-24 md:right-8 z-40">
        <div className="bg-[#1a1a1a] border border-[#333] rounded-lg p-3 shadow-lg backdrop-blur">
          <div className="flex items-center gap-3 mb-2">
            {isMuted ? <VolumeX className="w-4 h-4 text-gray-400" /> : volume < 0.3 ? <Volume1 className="w-4 h-4 text-[#4caf50]" /> : <Volume2 className="w-4 h-4 text-[#1f88ff]" />}
            <input type="range" min="0" max="1" step="0.05" value={volume} onChange={handleVolumeChange} className="w-20 h-1 bg-[#333] rounded-lg appearance-none cursor-pointer accent-[#1f88ff]" disabled={isMuted} />
          </div>
          <button onClick={toggleMute} className={`w-full px-3 py-2 rounded text-xs font-medium transition-all ${isMuted ? "bg-red-600 hover:bg-red-700 text-white" : "bg-[#1f88ff] hover:bg-blue-600 text-white"}`}>
            {isMuted ? "🔇 Muted" : "🔊 Music On"}
          </button>
          <p className="text-xs text-gray-500 mt-2 text-center">{Math.round(volume * 100)}% volume</p>
        </div>
      </div>
    </>
  );
}