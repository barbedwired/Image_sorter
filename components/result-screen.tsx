"use client";

import { useState } from "react";
import { RefreshCw, Trophy, Zap, Swords, BarChart3, X } from "lucide-react";
import type { SortImage } from "@/lib/use-image-sort";
import { getMatchProbability } from "@/lib/use-image-sort";

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
          <div className="text-2xl font-bold text-[hsl(var(--primary))] drop-shadow-md">
            {image.match_prob}% Match
          </div>
          <div className="text-foreground text-sm font-medium drop-shadow-md">
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
    cols: "grid-cols-3 sm:grid-cols-4 md:grid-cols-5",
    h: "h-28 sm:h-32 md:h-36",
    showLabel: true,
    showBar: true,
  },
  A: {
    cols: "grid-cols-4 sm:grid-cols-5 md:grid-cols-7",
    h: "h-20 sm:h-24 md:h-28",
    showLabel: true,
    showBar: true,
  },
  B: {
    cols: "grid-cols-5 sm:grid-cols-7 md:grid-cols-9",
    h: "h-16 sm:h-18 md:h-20",
    showLabel: true,
    showBar: false,
  },
  C: {
    cols: "grid-cols-8 sm:grid-cols-10 md:grid-cols-14",
    h: "h-10 sm:h-12",
    showLabel: false,
    showBar: false,
  },
  D: {
    cols: "grid-cols-10 sm:grid-cols-12 md:grid-cols-16",
    h: "h-8 sm:h-10",
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
            <Trophy className="w-5 h-5 text-[hsl(var(--primary))]" />
            <h2 className="text-xl md:text-2xl font-black text-[hsl(var(--primary))]">
              測定完了
            </h2>
          </div>
          <p className="text-[10px] text-muted-foreground leading-tight">
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
                          ? "w-6 h-6 text-xs"
                          : tier.id === "A"
                            ? "w-5 h-5 text-[10px]"
                            : "w-4 h-4 text-[9px]"
                      }`}
                    >
                      {tier.name}
                    </div>
                    <span
                      className={`text-[10px] font-semibold ${tier.color} leading-none`}
                    >
                      {tier.desc}
                    </span>
                    <span className="text-[9px] text-muted-foreground font-mono leading-none">
                      {items.length}
                    </span>
                    <div className="flex-1 h-px bg-border" />
                  </div>

                  {/* Image grid - tight gap */}
                  <div className={`grid ${cfg.cols} gap-1`}>
                    {items.map((item) => {
                      const globalIndex = processedImages.indexOf(item);
                      const isGod = item.eliteType === "GOD";

                      return (
                        <button
                          type="button"
                          key={item.id}
                          onClick={() => setModalImage(item)}
                          className={`group relative rounded-md overflow-hidden border ${tier.bgClass} transition-all hover:scale-[1.04] cursor-pointer text-left`}
                        >
                          {/* Image */}
                          <div className={`relative ${cfg.h} w-full`}>
                            <img
                              src={item.src || "/placeholder.svg"}
                              alt={item.name}
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
                            {/* Elite badge */}
                            {item.eliteType && cfg.showLabel && (
                              <div className="absolute top-px right-px">
                                <EliteBadge type={item.eliteType} />
                              </div>
                            )}
                            {/* God glow */}
                            {isGod && (
                              <div className="absolute inset-0 ring-1 ring-yellow-400/50 rounded-md pointer-events-none" />
                            )}
                          </div>

                          {/* Info - only S, A, B with label */}
                          {cfg.showLabel && (
                            <div className="px-1 py-0.5 bg-card/80">
                              <div className="truncate text-[8px] font-semibold text-foreground leading-tight">
                                {item.name}
                              </div>
                              <div className="flex items-center gap-0.5">
                                <span
                                  className={`text-[10px] font-black leading-none ${isGod ? "text-yellow-400" : tier.color}`}
                                >
                                  {item.match_prob}%
                                </span>
                                {cfg.showBar && (
                                  <div className="flex-1 bg-secondary rounded-full h-0.5 overflow-hidden">
                                    <div
                                      className={`${isGod ? "bg-yellow-400" : tier.gradientClass} h-full rounded-full`}
                                      style={{
                                        width: `${item.match_prob}%`,
                                      }}
                                    />
                                  </div>
                                )}
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
            onClick={onReset}
            className="
              px-7 py-2.5 rounded-full text-sm font-bold
              bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]
              hover:opacity-90 hover:-translate-y-0.5
              transition-all shadow-lg flex items-center gap-2
              animate-pulse-glow
            "
          >
            <RefreshCw className="w-4 h-4" />
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
