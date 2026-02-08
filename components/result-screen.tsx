"use client";

import { useState, useEffect, useRef } from "react";
import { RefreshCw, Trophy, Zap, Swords, BarChart3, X } from "lucide-react";
import type { SortImage } from "@/lib/use-image-sort";
import { getMatchProbability } from "@/lib/use-image-sort";

// Sound manager
const ResultSoundManager = {
  isMuted: false,
  audioInstances: new Map<string, HTMLAudioElement>(),

  init() {
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
    const sounds = [
      { key: "button", path: "/Image_sorter/assets/button.wav", volume: 0.5 },
      { key: "tap", path: "/Image_sorter/assets/tap_05.wav", volume: 0.5 },
      { key: "celebration", path: "/Image_sorter/assets/celebration.wav", volume: 0.1 },
      { key: "toggle_off", path: "/Image_sorter/assets/toggle_off.wav", volume: 0.2 },
      { key: "swipe", path: "/Image_sorter/assets/swipe.wav", volume: 0.2 },
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

interface ResultScreenProps {
  images: SortImage[];
  totalClicks: number;
  finishReasonText: string;
  onReset: () => void;
}

interface ProcessedImage extends SortImage {
  r_eff: number;
  raw_rating: number;
  raw_sigma: number;
  match_prob: number;
}

interface TierDef {
  id: string;
  name: string;
  desc: string;
  minReff: number;
  color: string;
  bgClass: string;
  badgeClass: string;
  gradientClass: string;
}

const TIERS: TierDef[] = [
  {
    id: "S",
    name: "S",
    desc: "決定的に好き",
    minReff: 1650,
    color: "text-purple-400",
    bgClass: "bg-purple-500/5 border-purple-500/20",
    badgeClass: "bg-purple-500/15 text-purple-400 border-purple-500/30",
    gradientClass: "gradient-bar-purple",
  },
  {
    id: "A",
    name: "A",
    desc: "安定的に好き",
    minReff: 1550,
    color: "text-blue-400",
    bgClass: "bg-blue-500/5 border-blue-500/20",
    badgeClass: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    gradientClass: "gradient-bar-blue",
  },
  {
    id: "B",
    name: "B",
    desc: "統計的に好き",
    minReff: 1450,
    color: "text-emerald-400",
    bgClass: "bg-emerald-500/5 border-emerald-500/20",
    badgeClass: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    gradientClass: "gradient-bar-emerald",
  },
  {
    id: "C",
    name: "C",
    desc: "判断保留",
    minReff: 1350,
    color: "text-muted-foreground",
    bgClass: "bg-muted/50 border-border",
    badgeClass: "bg-muted text-muted-foreground border-border",
    gradientClass: "gradient-bar-slate",
  },
  {
    id: "D",
    name: "D",
    desc: "選考外",
    minReff: -9999,
    color: "text-muted-foreground/60",
    bgClass: "bg-muted/30 border-border/50",
    badgeClass: "bg-muted/50 text-muted-foreground/60 border-border/50",
    gradientClass: "gradient-bar-gray",
  },
];

function EliteBadge({ type }: { type: string }) {
  if (type === "GOD")
    return (
      <span className="inline-flex items-center gap-0.5 bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 text-[8px] px-1 py-px rounded-full font-bold leading-none">
        <Zap className="w-2 h-2" /> 別格
      </span>
    );
  if (type === "STRONG")
    return (
      <span className="inline-flex items-center gap-0.5 bg-purple-500/20 text-purple-400 border border-purple-500/30 text-[8px] px-1 py-px rounded-full font-bold leading-none">
        <Swords className="w-2 h-2" /> 安定
      </span>
    );
  if (type === "STAT")
    return (
      <span className="inline-flex items-center gap-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[8px] px-1 py-px rounded-full font-bold leading-none">
        <BarChart3 className="w-2 h-2" /> 統計
      </span>
    );
  return null;
}

function ImageModal({
  image,
  onClose,
}: {
  image: ProcessedImage | null;
  onClose: () => void;
}) {
  if (!image) return null;
  return (
    <div
      className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in cursor-pointer"
      onClick={onClose}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
      role="button"
      tabIndex={0}
    >
      <div className="relative w-auto h-auto max-w-[95vw] max-h-[95vh] flex flex-col items-center justify-center">
        <button
          type="button"
          className="absolute -top-10 right-0 md:top-0 md:-right-12 z-50 w-8 h-8 rounded-full bg-secondary text-foreground hover:bg-secondary/80 flex items-center justify-center transition-colors shadow-lg border border-border"
          onClick={(e) => {
            e.stopPropagation();
            ResultSoundManager.play("toggle_off");
            onClose();
          }}
          aria-label="Close modal"
        >
          <X className="w-4 h-4" />
        </button>
        <img
          src={image.src || "/placeholder.svg"}
          alt={image.name}
          className="max-w-full max-h-[82vh] object-contain rounded-lg shadow-2xl"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={() => {}}
          role="presentation"
        />
        <div className="mt-2 text-center pointer-events-none">
          <div className="text-2xl font-bold text-[hsl(var(--primary))]">
            {image.match_prob}% Match
          </div>
          <div className="text-foreground text-sm font-medium">
            {image.name}
          </div>
        </div>
      </div>
    </div>
  );
}

/* Tier image sizing: S is biggest, progressively smaller */
const TIER_CONFIG: Record<
  string,
  { cols: string; h: string; showLabel: boolean; showBar: boolean }
> = {
  S: {
    cols: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4",
    h: "w-40 h-40 sm:w-48 sm:h-48 md:w-52 md:h-52",
    showLabel: true,
    showBar: true,
  },
  A: {
    cols: "grid-cols-3 sm:grid-cols-4 md:grid-cols-5",
    h: "w-28 h-28 sm:w-32 sm:h-32 md:w-40 md:h-40",
    showLabel: true,
    showBar: true,
  },
  B: {
    cols: "grid-cols-4 sm:grid-cols-5 md:grid-cols-7",
    h: "w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28",
    showLabel: true,
    showBar: false,
  },
  C: {
    cols: "grid-cols-6 sm:grid-cols-8 md:grid-cols-10",
    h: "w-14 h-14 sm:w-16 sm:h-16 md:w-18 md:h-18",
    showLabel: false,
    showBar: false,
  },
  D: {
    cols: "grid-cols-8 sm:grid-cols-10 md:grid-cols-12",
    h: "w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14",
    showLabel: false,
    showBar: false,
  },
};

export function ResultScreen({
  images,
  totalClicks,
  finishReasonText,
  onReset,
}: ResultScreenProps) {
  const [modalImage, setModalImage] = useState<ProcessedImage | null>(null);
  const initedRef = useRef(false);

  // Initialize sound manager on mount
  useEffect(() => {
    if (!initedRef.current) {
      ResultSoundManager.init();
      initedRef.current = true;
    }
  }, []);

  const k = 1.0;
  const processedImages: ProcessedImage[] = images
    .map((img) => ({
      ...img,
      r_eff: img.rating - k * img.sigma,
      raw_rating: Math.round(img.rating),
      raw_sigma: Math.round(img.sigma),
      match_prob: getMatchProbability(img.rating),
    }))
    .sort((a, b) => b.r_eff - a.r_eff);

  const avgFinalSigma =
    images.reduce((sum, i) => sum + i.sigma, 0) / images.length;

  let remainingImages = [...processedImages];
  const tierGroups: { tier: TierDef; items: ProcessedImage[] }[] = [];
  for (const tier of TIERS) {
    const tierImages = remainingImages.filter(
      (img) => img.r_eff >= tier.minReff
    );
    remainingImages = remainingImages.filter(
      (img) => img.r_eff < tier.minReff
    );
    if (tierImages.length > 0) {
      tierGroups.push({ tier, items: tierImages });
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="max-w-7xl mx-auto">
        {/* Centered title - compact */}
        <div className="text-center pt-1 mb-2">
          <div className="flex items-center justify-center gap-1.5">
            <Trophy className="w-6 h-6 text-emerald-500" />
            <h2 className="text-3xl md:text-4xl font-black text-emerald-500">
              測定完了
            </h2>
          </div>
          <p className="text-[12px] text-muted-foreground leading-tight">
            {finishReasonText}
          </p>
        </div>

        {/* Tier sections - compact card */}
        <div className="bg-card border border-border rounded-xl p-2 md:p-3 shadow-lg">
          <div className="space-y-2">
            {tierGroups.map(({ tier, items }) => {
              const cfg = TIER_CONFIG[tier.id] ?? TIER_CONFIG.D;

              return (
                <div key={tier.id}>
                  {/* Tier header - inline */}
                  <div className="flex items-center gap-1.5 mb-1">
                    <div
                      className={`shrink-0 rounded ${tier.badgeClass} border flex items-center justify-center font-black leading-none ${
                        tier.id === "S"
                          ? "w-6 h-6 text-[18px]"
                          : tier.id === "A"
                            ? "w-5 h-5 text-[15px]"
                            : "w-4 h-4 text-[13.5px]"
                      }`}
                    >
                      {tier.name}
                    </div>
                    <span
                      className={`text-[14px] font-semibold ${tier.color} leading-none`}
                    >
                      {tier.desc}
                    </span>
                    <span className="text-[9px] text-muted-foreground font-mono leading-none">
                      {items.length}
                    </span>
                    <div className="flex-1 h-px bg-border" />
                  </div>

                  {/* Image grid - minimal gap for C tier */}
                  <div className={`grid ${cfg.cols} ${tier.id === "C" ? "gap-0" : "gap-1"}`}>
                    {items.map((item) => {
                      const globalIndex = processedImages.indexOf(item);
                      const isGod = item.eliteType === "GOD";

                      return (
                        <button
                          type="button"
                          key={item.id}
                          onClick={() => {
                            ResultSoundManager.play("swipe");
                            setTimeout(() => ResultSoundManager.play("tap"), 100);
                            setModalImage(item);
                          }}
                          onMouseEnter={() => ResultSoundManager.play("tap")}
                          className={`group relative rounded-md overflow-hidden border ${tier.bgClass} transition-all hover:scale-[1.04] cursor-pointer text-left flex flex-col ${!cfg.showLabel ? cfg.h : ''} ${tier.id === "C" ? "p-0" : ""}`}
                        >
                          {/* Image container - centered */}
                          <div className="flex justify-center flex-1">
                            {/* Image */}
                          <div className={`relative ${cfg.h} flex items-center justify-center group-hover:scale-105 transition-transform`}>
                              <img
                                src={item.src || "/placeholder.svg"}
                                alt={item.name}
                                decoding="async"
                                className="w-full h-full object-cover"
                              />
                            {/* Rank number */}
                            <div
                              className={`absolute top-px left-px font-mono font-bold bg-card/70 backdrop-blur-sm rounded-sm text-foreground/70 ${
                                cfg.showLabel
                                  ? "text-[9px] px-1 py-px"
                                  : "text-[7px] px-0.5"
                              }`}
                            >
                              #{globalIndex + 1}
                            </div>
                            {/* God glow */}
                            {isGod && (
                              <div className="absolute inset-0 ring-1 ring-yellow-400/50 rounded-md pointer-events-none" />
                            )}
                            </div>
                          </div>

                          {/* Info - only S, A, B with label */}
                          {cfg.showLabel && (
                            <div className="px-2 py-1 bg-card/80">
                              <div className="flex items-center justify-between gap-1 mb-1">
                                <div className="truncate text-sm font-semibold text-foreground leading-tight flex-1">
                                  {item.name}
                                </div>
                              </div>
                              <div className="card-footer flex justify-between items-end">
                                <div className="flex items-center">
                                  {cfg.showLabel && item.eliteType && (
                                    <EliteBadge type={item.eliteType} />
                                  )}
                                </div>
                                <div className="score-container relative flex items-end">
                                  <span className="text-xs font-medium text-foreground/70">適合率</span>
                                  <span
                                    className={`text-2xl font-black leading-none ${isGod ? "text-yellow-400" : tier.color}`}
                                  >
                                    {item.match_prob}%
                                  </span>
                                  <div
                                    className={`progress-bar ${isGod ? "bg-yellow-400" : tier.gradientClass} absolute left-0 top-0 h-full rounded-full`}
                                    style={{
                                      width: `${item.match_prob}%`,
                                      zIndex: -1,
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                          {/* File name for C tier (判断保留) */}
                          {!cfg.showLabel && tier.id === "C" && (
                            <div className="absolute bottom-0 left-0 right-0 bg-card/80 border-t border-border px-1 py-0.5">
                              <div className="text-[8px] text-muted-foreground truncate text-center">
                                {item.name}
                              </div>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Centered bottom button */}
        <div className="flex justify-center mt-4 mb-2">
          <button
            type="button"
            onClick={() => {
              ResultSoundManager.play("button");
              setTimeout(() => ResultSoundManager.play("tap"), 80);
              setTimeout(() => ResultSoundManager.play("tap"), 160);
              setTimeout(() => ResultSoundManager.play("swipe"), 240);
              setTimeout(() => onReset(), 350);
            }}
            className="
              px-7 py-2.5 rounded-full text-sm font-bold
              bg-emerald-500 text-white
              hover:bg-emerald-600 hover:-translate-y-0.5
              transition-all shadow-lg flex items-center gap-2
              animate-pulse-glow
            "
          >
            もう一度ソートする
          </button>
        </div>
      </div>

      {/* Stats - bottom right floating badge */}
      <div className="fixed bottom-3 right-3 z-40 flex flex-col items-end gap-0.5 bg-card/80 backdrop-blur-sm border border-border rounded-lg px-2.5 py-1.5 shadow-md">
        {[
          { l: "画像", v: String(images.length) },
          { l: "選択", v: String(totalClicks) },
          { l: "不確実", v: avgFinalSigma.toFixed(1) },
          {
            l: "効率",
            v: (images.length / Math.max(totalClicks, 1)).toFixed(2),
          },
        ].map((s) => (
          <div
            key={s.l}
            className="flex items-center gap-1.5 text-[10px] leading-none"
          >
            <span className="text-muted-foreground">{s.l}</span>
            <span className="font-mono font-bold text-foreground">{s.v}</span>
          </div>
        ))}
      </div>

      <ImageModal image={modalImage} onClose={() => setModalImage(null)} />
    </div>
  );
}
