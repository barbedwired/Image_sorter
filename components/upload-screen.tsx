"use client";

import React from "react"

import { useCallback, useRef, useState, useEffect } from "react";
import { Upload, X, Trash2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SortImage } from "@/lib/use-image-sort";

// Sound manager for upload screen
const UploadSoundManager = {
  isMuted: false,
  audioInstances: new Map<string, HTMLAudioElement>(),

  init() {
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
    const sounds = [
      { key: "swipe", path: "/Image_sorter/assets/swipe.wav", volume: 0.2 },
      { key: "button", path: "/Image_sorter/assets/button.wav", volume: 0.2 },
      { key: "toggle_off", path: "/Image_sorter/assets/toggle_off.wav", volume: 0.2 },
      { key: "tap", path: "/Image_sorter/assets/tap_05.wav", volume: 0.2 },
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

interface UploadScreenProps {
  images: SortImage[];
  isProcessing?: boolean;
  processingCount?: number;
  onAddImages: (files: FileList) => void;
  onDeleteImage: (id: number) => void;
  onClearAll: () => void;
  onStart: () => void;
}

export function UploadScreen({
  images,
  isProcessing = false,
  processingCount = 0,
  onAddImages,
  onDeleteImage,
  onClearAll,
  onStart,
}: UploadScreenProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const initedRef = useRef(false);

  // Initialize sound manager on mount
  useEffect(() => {
    if (!initedRef.current) {
      UploadSoundManager.init();
      initedRef.current = true;
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      UploadSoundManager.play("swipe");
      onAddImages(e.dataTransfer.files);
    },
    [onAddImages]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  return (
    <div className="animate-fade-in">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-1 bg-gradient-to-r from-[#10b981] via-[#22c55e] to-[#84cc16] bg-clip-text text-transparent">
            Image Sort
          </h1>
          <p className="text-sm text-muted-foreground">
            統計的に好きな画像を推定
          </p>
        </div>

        {/* Main card */}
        <div className="bg-card rounded-2xl border border-border p-6 md:p-8 shadow-lg">
          {/* Drop zone */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click();
            }}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onMouseEnter={() => setIsDragging(true)}
            onMouseLeave={() => setIsDragging(false)}
            className={`
              relative border-2 border-dashed rounded-xl p-10 md:p-12 text-center cursor-pointer
              transition-all duration-200 group mb-6
              ${
                isDragging
                  ? "border-[hsl(var(--primary))] bg-accent/50 scale-[1.01]"
                  : "border-border hover:border-[hsl(var(--primary))] hover:bg-emerald-500/10"
              }
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files) {
                  UploadSoundManager.play("swipe");
                  onAddImages(e.target.files);
                }
                e.target.value = "";
              }}
            />

            <div className="flex flex-col items-center gap-3">
              <div
                className={`
                w-14 h-14 rounded-full flex items-center justify-center transition-colors
                ${isDragging ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]" : "bg-muted text-muted-foreground group-hover:bg-emerald-500 group-hover:text-emerald-50"}
              `}
              >
                <Upload className={`w-6 h-6 ${isDragging ? "text-[hsl(var(--primary-foreground))]" : "text-muted-foreground"} group-hover:text-emerald-50`} />
              </div>
              <div>
                <p className="text-foreground font-medium">
                  画像をタップまたはドロップして追加
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  枚数が多いほど選別効果が高まります
                </p>
              </div>
              <div className={`text-xs font-mono px-3 py-1 rounded-full ${images.length > 0 ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/30" : "text-muted-foreground bg-muted"}`}>
                {images.length > 0
                  ? `読み込み済み: ${images.length}枚`
                  : "画像数: 0"}
              </div>
            </div>
          </div>

          {/* Thumbnail area */}
          {images.length > 0 && (
            <div className="bg-muted/50 rounded-xl p-4 border border-border min-h-[100px] relative">
              {/* Clear all button - bottom right of thumbnail area */}
              {images.length >= 2 && (
                <div className="absolute bottom-2 right-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm("全削除しますか？")) {
                        UploadSoundManager.play("toggle_off");
                        onClearAll();
                      }
                    }}
                    className="w-6 h-6 bg-muted text-muted-foreground rounded-full flex items-center justify-center hover:bg-muted/80 hover:text-muted-foreground/80 transition-colors shadow-md"
                    aria-label="全削除"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              <div className="flex flex-wrap gap-2 justify-center">
                {images.map((item) => (
                  <div
                    key={item.id}
                    className="relative group/thumb animate-pop"
                  >
                    <div className="w-16 h-16 md:w-20 md:h-20 rounded-lg overflow-hidden bg-secondary border border-border shadow-sm">
                      <img
                        src={item.src || "/placeholder.svg"}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                      {/* Overlay with delete button */}
                      <div className="absolute inset-0 bg-black/30 rounded-lg opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            UploadSoundManager.play("toggle_off");
                            onDeleteImage(item.id);
                          }}
                          className="w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center hover:bg-destructive/90 transition-colors shadow-md"
                          aria-label={`Delete ${item.name}`}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="mt-8 flex flex-col items-center gap-3">
            <Button
              onClick={() => {
                UploadSoundManager.play("button");
                onStart();
              }}
              disabled={images.length < 2 || isProcessing}
              variant={images.length >= 2 ? "default" : "secondary"}
              className={`
                px-10 py-3.5 rounded-full text-base font-bold
                transition-all duration-500 ease-in-out
                shadow-lg
                ${
                  images.length >= 2 && !isProcessing
                    ? "bg-emerald-500 text-white hover:bg-emerald-600 hover:-translate-y-0.5 transition-all shadow-lg animate-pulse-glow"
                    : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-muted-foreground/80"
                }
              `}
            >
              <span className="flex items-center gap-2">
                <Play className="w-4 h-4" />
                測定開始
                <span className="text-xs opacity-70 font-normal">(Enter)</span>
              </span>
            </Button>

            {/* Processing indicator */}
            {isProcessing && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-4 h-4 border-2 border-muted-foreground border-t-primary rounded-full animate-spin" />
                <span>画像を最適化中... ({processingCount}枚処理中)</span>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
