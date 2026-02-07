"use client";

import { useEffect, useCallback } from "react";
import { useImageSort } from "@/lib/use-image-sort";
import { TopControls } from "@/components/top-controls";
import { UploadScreen } from "@/components/upload-screen";
import { BattleScreen } from "@/components/battle-screen";
import { ResultScreen } from "@/components/result-screen";

export default function Page() {
  const sort = useImageSort();

  // Keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (sort.screen === "battle") {
        for (let i = 1; i <= 6; i++) {
          if (
            e.key === String(i) &&
            sort.currentGroup[i - 1]
          ) {
            sort.choose(sort.currentGroup[i - 1].id);
          }
        }
        if (e.key === "Backspace") sort.undo();
        if (e.key === " " || e.key === "0" || e.key === "p") {
          e.preventDefault();
          sort.passMatch();
        }
        if (e.key === "Enter") sort.finishEarly();
      }
      if (sort.screen === "upload" && e.key === "Enter") {
        sort.startBattle();
      }
    },
    [sort]
  );

  // Hide arrows before sorting starts
  useEffect(() => {
    if (sort.screen === "battle" && sort.currentGroup.length > 0) {
      // Hide all arrow indicators before the first match
      const hideArrows = () => {
        const buttons = document.querySelectorAll('button[aria-label*="arrow"]');
        buttons.forEach((button) => {
          (button as HTMLElement).style.display = 'none';
        });
      };
      hideArrows();
    }
  }, [sort.screen, sort.currentGroup.length]);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <main className="relative min-h-screen overflow-x-hidden">
      {/* Top controls */}
      <TopControls />

      {/* Grid background */}
      <div
        className="fixed inset-0 z-0 pointer-events-none bg-grid-pattern opacity-80"
        style={{
          maskImage:
            "radial-gradient(ellipse at center, black 50%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at center, black 50%, transparent 100%)",
        }}
      />

      {/* Gradient overlay for top of screen */}
      <div className="gradient-overlay" />

      {/* Shutter transition */}
      <div
        className={`
          fixed top-0 left-0 w-full h-full z-[100] bg-teal-700 shutter-stripes
          flex items-center justify-center shadow-2xl
          ${
            sort.shutterState === "hidden"
              ? "opacity-0 pointer-events-none"
              : sort.shutterState === "entering"
                ? "opacity-100 pointer-events-auto"
                : "opacity-0 pointer-events-none"
          }
        `}
        style={{
          transform:
            sort.shutterState === "hidden"
              ? "translateX(-100%)"
              : sort.shutterState === "entering"
                ? "translateX(0)"
                : "translateX(100%)",
          transition:
            "transform 0.6s cubic-bezier(0.19, 1, 0.22, 1), opacity 0.6s cubic-bezier(0.19, 1, 0.22, 1)",
        }}
      />

      {/* Content */}
      <div className="relative z-10 p-4 md:p-6">
        {sort.screen === "upload" && (
          <UploadScreen
            images={sort.images}
            onAddImages={sort.addImages}
            onDeleteImage={sort.deleteImage}
            onClearAll={sort.clearAllImages}
            onStart={sort.startBattle}
          />
        )}

        {sort.screen === "battle" && (
          <BattleScreen
            currentGroup={sort.currentGroup}
            currentPhase={sort.currentPhase}
            globalPassStreak={sort.globalPassStreak}
            progressInfo={sort.getProgressInfo()}
            shaking={sort.shaking}
            canUndo={sort.canUndo}
            onChoose={sort.choose}
            onPass={sort.passMatch}
            onUndo={sort.undo}
            onFinishEarly={sort.finishEarly}
            onQuit={sort.quitSort}
          />
        )}

        {sort.screen === "result" && (
          <ResultScreen
            images={sort.images}
            totalClicks={sort.totalClicks}
            finishReasonText={sort.finishReasonText}
            onReset={sort.resetToStartScreen}
          />
        )}
      </div>
    </main>
  );
}
