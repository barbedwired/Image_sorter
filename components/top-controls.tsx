"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Sun, Moon, Volume2, VolumeX } from "lucide-react";

export function TopControls() {
  const [isDark, setIsDark] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const html = document.documentElement;
    setIsDark(html.classList.contains("dark"));
  }, []);

  const toggleTheme = useCallback(() => {
    const html = document.documentElement;
    if (html.classList.contains("dark")) {
      html.classList.remove("dark");
      setIsDark(false);
    } else {
      html.classList.add("dark");
      setIsDark(true);
    }
  }, []);

  const playClick = useCallback(() => {
    if (isMuted) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContext();
      }
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 600;
      gain.gain.value = 0.08;
      osc.start(ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      osc.stop(ctx.currentTime + 0.1);
    } catch {
      // ignore audio errors
    }
  }, [isMuted]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  // Expose playClick globally for other components
  useEffect(() => {
    (window as unknown as Record<string, unknown>).__playClick = playClick;
    (window as unknown as Record<string, unknown>).__isMuted = isMuted;
  }, [playClick, isMuted]);

  return (
    <div className="fixed top-4 right-4 z-50 flex gap-2">
      <button
        type="button"
        onClick={toggleMute}
        className="
          p-2.5 rounded-full shadow-lg transition-all hover:scale-110
          bg-card text-muted-foreground border border-border
          hover:text-foreground hover:border-[hsl(var(--primary))]
        "
        aria-label={isMuted ? "Unmute" : "Mute"}
      >
        {isMuted ? (
          <VolumeX className="w-5 h-5 text-destructive" />
        ) : (
          <Volume2 className="w-5 h-5" />
        )}
      </button>
      <button
        type="button"
        onClick={toggleTheme}
        className="
          p-2.5 rounded-full shadow-lg transition-all hover:scale-110
          bg-card text-muted-foreground border border-border
          hover:text-foreground hover:border-[hsl(var(--primary))]
        "
        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      >
        {isDark ? (
          <Moon className="w-5 h-5 text-yellow-400" />
        ) : (
          <Sun className="w-5 h-5 text-orange-400" />
        )}
      </button>
    </div>
  );
}
