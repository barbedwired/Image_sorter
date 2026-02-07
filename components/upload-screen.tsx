"use client";

import React from "react"

import { useCallback, useRef, useState } from "react";
import { Upload, X, Trash2, Play } from "lucide-react";
import type { SortImage } from "@/lib/use-image-sort";

interface UploadScreenProps {
  images: SortImage[];
  onAddImages: (files: FileList) => void;
  onDeleteImage: (id: number) => void;
  onClearAll: () => void;
  onStart: () => void;
}

export function UploadScreen({
  images,
  onAddImages,
  onDeleteImage,
  onClearAll,
  onStart,
}: UploadScreenProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
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
          <h1 className="text-3xl font-bold tracking-tight text-foreground mb-1">
            Image Sort{" "}
            <span className="text-[hsl(var(--primary))]">Lv.36</span>
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
            className={`
              relative border-2 border-dashed rounded-xl p-10 md:p-12 text-center cursor-pointer
              transition-all duration-200 group mb-6
              ${
                isDragging
                  ? "border-[hsl(var(--primary))] bg-accent scale-[1.01]"
                  : "border-border hover:border-[hsl(var(--primary))] hover:bg-accent/50"
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
                if (e.target.files) onAddImages(e.target.files);
                e.target.value = "";
              }}
            />

            <div className="flex flex-col items-center gap-3">
              <div
                className={`
                w-14 h-14 rounded-full flex items-center justify-center transition-colors
                ${isDragging ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]" : "bg-muted text-muted-foreground group-hover:bg-[hsl(var(--primary))] group-hover:text-[hsl(var(--primary-foreground))]"}
              `}
              >
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <p className="text-foreground font-medium">
                  画像をタップまたはドロップして追加
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  枚数が多いほど選別効果が高まります
                </p>
              </div>
              <div className="text-xs font-mono text-muted-foreground bg-muted px-3 py-1 rounded-full">
                {images.length > 0
                  ? `読み込み済み: ${images.length}枚`
                  : "画像数: 0"}
              </div>
            </div>
          </div>

          {/* Thumbnail area */}
          <div className="bg-muted/50 rounded-xl p-4 border border-border min-h-[100px]">
            {images.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-6">
                画像がありません
              </p>
            ) : (
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
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteImage(item.id);
                      }}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity shadow-md z-10"
                      aria-label={`Delete ${item.name}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="mt-8 flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={onStart}
              disabled={images.length < 2}
              className="
                px-10 py-3.5 rounded-full text-base font-bold
                bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]
                hover:opacity-90 hover:-translate-y-0.5 hover:shadow-xl
                active:translate-y-0 active:shadow-md
                disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none
                transition-all duration-200 shadow-lg
                animate-pulse-glow
              "
            >
              <span className="flex items-center gap-2">
                <Play className="w-4 h-4" />
                測定開始
                <span className="text-xs opacity-70 font-normal">(Enter)</span>
              </span>
            </button>

            {images.length >= 2 && (
              <button
                type="button"
                onClick={() => {
                  if (confirm("全削除しますか？")) onClearAll();
                }}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                全削除
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
