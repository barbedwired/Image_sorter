"use client";

import { Undo2, XCircle, Eye, ArrowLeft } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { SortImage, Phase } from "@/lib/use-image-sort";

interface BattleScreenProps {
  currentGroup: SortImage[];
  currentPhase: Phase;
  globalPassStreak: number;
  progressInfo: { activeCount: number; frozenCount: number; progress: number };
  shaking: boolean;
  canUndo: boolean;
  onChoose: (id: number) => void;
  onPass: () => void;
  onUndo: () => void;
  onFinishEarly: () => void;
  onQuit: () => void;
}

// Sound manager
const SoundManager = {
  isMuted: false,
  audioInstances: new Map<string, HTMLAudioElement>(),

  init() {
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
    const sounds = [
      { key: "swipe", path: "/Image_sorter/assets/swipe.wav", volume: 0.2 },
      { key: "button", path: "/Image_sorter/assets/button.wav", volume: 0.5 },
      { key: "celebration", path: "/Image_sorter/assets/celebration.wav", volume: 0.1 },
      { key: "toggle_off", path: "/Image_sorter/assets/toggle_off.wav", volume: 0.2 },
      { key: "tap", path: "/Image_sorter/assets/tap_05.wav", volume: 0.5 },
      { key: "pass", path: "/Image_sorter/assets/toggle_off.wav", volume: 0.15 },
    ];

    sounds.forEach(({ key, path, volume }) => {
      const audio = new Audio(path);
      audio.volume = volume;
      this.audioInstances.set(key, audio);
    });
  },

  play(key: string) {
    if (this.isMuted) return;
    const audio = this.audioInstances.get(key);
    if (audio) {
      audio.currentTime = 0;
      audio.play().catch(() => {});
    }
  },

  toggleMute() {
    this.isMuted = !this.isMuted;
  },
};

export function BattleScreen({
  currentGroup,
  currentPhase,
  globalPassStreak,
  progressInfo,
  shaking,
  canUndo,
  onChoose,
  onPass,
  onUndo,
  onFinishEarly,
  onQuit,
}: BattleScreenProps) {
  const { activeCount, frozenCount, progress } = progressInfo;
  const isExploration = currentPhase === "exploration";
  const initedRef = useRef(false);

  // Initialize sound manager on mount
  useEffect(() => {
    if (!initedRef.current) {
      SoundManager.init();
      initedRef.current = true;
    }
  }, []);

  return (
    <div className="w-full max-w-6xl mx-auto text-center py-2 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col items-center mb-2">
        <h2 className="text-xl font-bold text-foreground tracking-tight">
          一番好きなのは？
        </h2>

        <div className="flex items-center gap-2 mt-1.5">
          <span
            className={`
              text-xs font-mono px-2.5 py-1 rounded-full border transition-colors duration-300
              ${
                isExploration
                  ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                  : "bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] border-[hsl(var(--primary))]/20"
              }
            `}
          >
            {isExploration ? "探索 (6択)" : "精密 (4択)"}
          </span>
          <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-muted text-muted-foreground border border-border">
            残り: {activeCount}
            {frozenCount > 0 && ` (殿堂: ${frozenCount})`}
          </span>
        </div>

        {globalPassStreak === 2 && (
          <div className="text-xs text-destructive mt-2 font-bold animate-pulse">
            選択停滞中: 次もパスで強制終了します
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-md mx-auto mb-3">
        <div className="flex justify-between text-[10px] text-muted-foreground mb-1.5 px-0.5">
          <span>分析進捗 (不確実性の減少)</span>
          <span className="font-mono">{progress}%</span>
        </div>
        <div className="bg-secondary rounded-full h-2 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-[hsl(var(--primary))] transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Double buffering: Current and Next groups */}
      <div className="relative">
        {/* Current group - visible */}
        <div
          className={`
            grid gap-1 w-full px-1 md:px-0 transition-all duration-300
            ${currentGroup.length > 4 ? "grid-cols-2 md:grid-cols-3" : "grid-cols-2 md:grid-cols-4"}
            ${shaking ? "animate-shake" : ""}
          `}
          style={{ minHeight: "50vh" }}
        >
          {currentGroup.map((img, index) => (
            <button
              type="button"
              key={img.id}
              onClick={() => {
                SoundManager.play("button");
                onChoose(img.id);
              }}
              onMouseEnter={() => SoundManager.play("tap")}
              className="
                relative group cursor-pointer bg-card rounded-xl border-2 border-transparent
                hover:border-[hsl(var(--primary))] overflow-hidden transition-all duration-200
                hover:-translate-y-1 hover:shadow-xl animate-pop flex flex-col
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
              "
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              {/* Number badge */}
              <div className="absolute top-2 left-2 z-10 w-6 h-6 rounded-md bg-foreground/70 backdrop-blur-sm text-background text-xs font-bold flex items-center justify-center shadow-sm">
                {index + 1}
              </div>

              {/* Image */}
              <div className="flex-1 w-full relative overflow-hidden bg-muted/30" style={{ minHeight: "320px" }}>
                <img
                  src={img.thumbnailUrl || img.src || "/placeholder.svg"}
                  alt={img.name}
                  decoding="async"
                  className="absolute inset-0 w-full h-full object-contain p-2 transition-transform duration-300 group-hover:scale-[1.03]"
                  onMouseEnter={() => SoundManager.play("tap")}
                  loading="eager"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = "/placeholder.svg";
                  }}
                />
              </div>

              {/* Name bar */}
              <div className="bg-card/95 backdrop-blur-sm p-2.5 text-center border-t border-border shrink-0">
                <div className="font-medium text-card-foreground text-xs md:text-sm truncate group-hover:text-[hsl(var(--primary))] transition-colors">
                  {img.name}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Next group - hidden but pre-rendered */}
        <div
          className={`
            grid gap-1 w-full px-1 md:px-0 absolute inset-0 transition-all duration-300
            ${currentGroup.length > 4 ? "grid-cols-2 md:grid-cols-3" : "grid-cols-2 md:grid-cols-4"}
            opacity-0 pointer-events-none
          `}
          style={{ minHeight: "50vh" }}
        >
          {currentGroup.map((img, index) => (
            <button
              type="button"
              key={img.id}
              onClick={() => {
                SoundManager.play("button");
                onChoose(img.id);
              }}
              onMouseEnter={() => SoundManager.play("tap")}
              className="
                relative group cursor-pointer bg-card rounded-xl border-2 border-transparent
                hover:border-[hsl(var(--primary))] overflow-hidden transition-all duration-200
                hover:-translate-y-1 hover:shadow-xl animate-pop flex flex-col
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
              "
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              {/* Number badge */}
              <div className="absolute top-2 left-2 z-10 w-6 h-6 rounded-md bg-foreground/70 backdrop-blur-sm text-background text-xs font-bold flex items-center justify-center shadow-sm">
                {index + 1}
              </div>

              {/* Image */}
              <div className="flex-1 w-full relative overflow-hidden bg-muted/30" style={{ minHeight: "320px" }}>
                <img
                  src={img.src || "/placeholder.svg"}
                  alt={img.name}
                  decoding="async"
                  className="absolute inset-0 w-full h-full object-contain p-2 transition-transform duration-300 group-hover:scale-[1.03]"
                  onMouseEnter={() => SoundManager.play("tap")}
                />
              </div>

              {/* Name bar */}
              <div className="bg-card/95 backdrop-blur-sm p-2.5 text-center border-t border-border shrink-0">
                <div className="font-medium text-card-foreground text-xs md:text-sm truncate group-hover:text-[hsl(var(--primary))] transition-colors">
                  {img.name}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div className="mt-6 flex flex-wrap justify-center items-center gap-3">
        <button
          type="button"
          onClick={() => {
            SoundManager.play("toggle_off");
            onUndo();
          }}
          disabled={!canUndo}
          className="
            px-7 py-2.5 rounded-full font-bold
            bg-secondary text-secondary-foreground
            hover:bg-secondary/80 transition-all
            disabled:opacity-40 disabled:cursor-not-allowed
            flex items-center gap-1.5
          "
        >
          <Undo2 className="w-4 h-4" />
          戻る
          <span className="text-[10px] opacity-60">(BS)</span>
        </button>

        <button
          type="button"
          onClick={() => {
            SoundManager.play("pass");
            onPass();
          }}
          className="
            px-7 py-2.5 rounded-full font-bold
            bg-destructive/10 text-destructive border border-destructive/20
            hover:bg-destructive/20 active:translate-y-0 transition-all
            flex items-center gap-1.5
          "
        >
          <XCircle className="w-4 h-4" />
          ピンとこない
          <span className="text-[10px] opacity-60 font-normal">(Space)</span>
        </button>

        <button
          type="button"
          onClick={() => {
            SoundManager.play("button");
            onFinishEarly();
          }}
          className="
            px-7 py-2.5 rounded-full font-bold
            border border-[hsl(var(--primary))] text-[hsl(var(--primary))]
            hover:bg-accent transition-all
            flex items-center gap-1.5
          "
        >
          <Eye className="w-4 h-4" />
          結果を見る
          <span className="text-[10px] opacity-60">(Enter)</span>
        </button>
      </div>

      <div className="mt-3">
        <button
          type="button"
          onClick={() => {
            SoundManager.play("toggle_off");
            onQuit();
          }}
          className="text-xs text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1 mx-auto"
        >
          <ArrowLeft className="w-3 h-3" />
          最初に戻る
        </button>
      </div>
    </div>
  );
}
