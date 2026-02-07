"use client";

import { useCallback, useRef, useState } from "react";

// === Types ===
export type ImageStatus = "active" | "frozen" | "eliminated";
export type EliteType = "GOD" | "STRONG" | "STAT" | null;
export type Phase = "exploration" | "precision";
export type Screen = "upload" | "battle" | "result";

export interface SortImage {
  id: number;
  name: string;
  src: string;
  rating: number;
  sigma: number;
  viewCount: number;
  passCount: number;
  wins: number;
  status: ImageStatus;
  eliteType: EliteType;
}

interface HistoryEntry {
  imagesCopy: SortImage[];
  actionLogCopy: ActionEntry[];
  phase: Phase;
  locked: boolean;
  streak: number;
  stalemate: number;
  lastWinner: number | null;
  clicks: number;
}

type ActionEntry = { type: "win"; id: number } | { type: "pass"; id: null };

// === Constants (unchanged from original) ===
const RATING_BASE = 1500;
const K_FACTOR_INITIAL = 100;
const MATCH_SCALE = 400;
const SIGMA_INIT = 150.0;
const SIGMA_MIN = 5.0;
const UNSTABLE_SIGMA_THRESHOLD = SIGMA_INIT * 0.6;
const UNSTABLE_RATIO_BORDER = 0.35;
const IMPACT_THRESHOLD = 30.0;
const PASS_ELIMINATION_THRESHOLD = 2;
const GLOBAL_PASS_LIMIT = 3;

export function getMatchProbability(rating: number) {
  const p = 1 / (1 + Math.pow(10, (RATING_BASE - rating) / MATCH_SCALE));
  return Math.round(p * 100);
}

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function useImageSort() {
  const [screen, setScreen] = useState<Screen>("upload");
  const [images, setImages] = useState<SortImage[]>([]);
  const [currentGroup, setCurrentGroup] = useState<SortImage[]>([]);
  const [currentPhase, setCurrentPhase] = useState<Phase>("exploration");
  const [globalPassStreak, setGlobalPassStreak] = useState(0);
  const [totalClicks, setTotalClicks] = useState(0);
  const [finishReasonText, setFinishReasonText] = useState("完走");
  const [shaking, setShaking] = useState(false);
  const [shutterState, setShutterState] = useState<
    "hidden" | "entering" | "leaving"
  >("hidden");

  // Mutable refs for imperative logic that doesn't need re-render
  const imagesRef = useRef<SortImage[]>([]);
  const historyStackRef = useRef<HistoryEntry[]>([]);
  const actionLogRef = useRef<ActionEntry[]>([]);
  const initialTotalSigmaRef = useRef(0);
  const globalPassStreakRef = useRef(0);
  const stalemateCounterRef = useRef(0);
  const lastWinnerIdRef = useRef<number | null>(null);
  const totalClicksRef = useRef(0);
  const precisionModeLockedRef = useRef(false);
  const currentPhaseRef = useRef<Phase>("exploration");
  const finishReasonRef = useRef("完走");
  const currentGroupRef = useRef<SortImage[]>([]);

  const syncState = useCallback(() => {
    setImages([...imagesRef.current]);
    setCurrentGroup([...currentGroupRef.current]);
    setCurrentPhase(currentPhaseRef.current);
    setGlobalPassStreak(globalPassStreakRef.current);
    setTotalClicks(totalClicksRef.current);
    setFinishReasonText(finishReasonRef.current);
  }, []);

  // === File handling ===
  const addImages = useCallback(
    (files: FileList) => {
      let added = 0;
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith("image/")) continue;
        const reader = new FileReader();
        reader.onload = (e) => {
          const newImg: SortImage = {
            id: Math.random(),
            name: file.name,
            src: e.target?.result as string,
            rating: RATING_BASE,
            sigma: SIGMA_INIT,
            viewCount: 0,
            passCount: 0,
            wins: 0,
            status: "active",
            eliteType: null,
          };
          imagesRef.current = [...imagesRef.current, newImg];
          added++;
          syncState();
        };
        reader.readAsDataURL(file);
      }
    },
    [syncState]
  );

  const deleteImage = useCallback(
    (id: number) => {
      imagesRef.current = imagesRef.current.filter((img) => img.id !== id);
      syncState();
    },
    [syncState]
  );

  const clearAllImages = useCallback(() => {
    imagesRef.current = [];
    syncState();
  }, [syncState]);

  // === Core battle logic ===
  const clampValues = () => {
    imagesRef.current.forEach((img) => {
      img.sigma = Math.max(img.sigma, SIGMA_MIN);
    });
  };

  const getProgressInfo = useCallback(() => {
    const activeCount = images.filter((i) => i.status === "active").length;
    const frozenCount = images.filter((i) => i.status === "frozen").length;
    let currentUncertaintyMass = 0;
    images.forEach((i) => {
      if (i.status === "active") currentUncertaintyMass += i.sigma;
    });
    const initSigma = initialTotalSigmaRef.current;
    const progress =
      initSigma > 0
        ? Math.min(
            100,
            Math.floor((1 - currentUncertaintyMass / initSigma) * 100)
          )
        : 0;
    const width = activeCount === 0 ? 100 : progress;
    return { activeCount, frozenCount, progress: width };
  }, [images]);

  const finishSort = useCallback(async () => {
    setShutterState("entering");
    await new Promise((r) => setTimeout(r, 600));
    setScreen("result");
    syncState();
    setShutterState("leaving");
    setTimeout(() => setShutterState("hidden"), 600);
  }, [syncState]);

  const nextMatch = useCallback(() => {
    const imgs = imagesRef.current;
    const activeImages = imgs.filter((i) => i.status === "active");

    if (activeImages.length < 2) {
      finishSort();
      return;
    }

    if (actionLogRef.current.length > 10) {
      const recent = actionLogRef.current.slice(-10);
      const passCount = recent.filter((r) => r.type === "pass").length;
      if (passCount >= 4) {
        finishReasonRef.current = "パス過多 (枯渇)";
        finishSort();
        return;
      }
    }

    let size = precisionModeLockedRef.current ? 4 : 6;
    if (activeImages.length < size) size = activeImages.length;

    let candidatePool = [...activeImages];

    if (
      lastWinnerIdRef.current !== null &&
      candidatePool.length > size
    ) {
      candidatePool = candidatePool.filter(
        (img) => img.id !== lastWinnerIdRef.current
      );
    }

    candidatePool.sort((a, b) => {
      const scoreA = a.rating * 1.5 + a.sigma;
      const scoreB = b.rating * 1.5 + b.sigma;
      return scoreB - scoreA;
    });

    const pivot = candidatePool[0];
    let selection = [pivot];
    let othersPool = candidatePool.slice(1);

    if (size === 6) {
      othersPool = shuffleArray(othersPool);
    } else {
      othersPool.sort((a, b) => {
        const distA = Math.abs(a.rating - pivot.rating);
        const distB = Math.abs(b.rating - pivot.rating);
        return distA - distB;
      });
    }

    for (let i = 0; i < size - 1 && i < othersPool.length; i++) {
      selection.push(othersPool[i]);
    }

    currentGroupRef.current = shuffleArray(selection);
    syncState();
  }, [finishSort, syncState]);

  const updateSystemState = useCallback(() => {
    const imgs = imagesRef.current;
    let activeImages = imgs.filter((i) => i.status === "active");
    activeImages.sort((a, b) => b.rating - a.rating);

    if (!precisionModeLockedRef.current) {
      const unstableItems = activeImages.filter(
        (i) => i.sigma > UNSTABLE_SIGMA_THRESHOLD
      );
      const unstableRatio =
        activeImages.length > 0
          ? unstableItems.length / activeImages.length
          : 0;
      if (unstableRatio <= UNSTABLE_RATIO_BORDER) {
        precisionModeLockedRef.current = true;
      }
    }
    currentPhaseRef.current = precisionModeLockedRef.current
      ? "precision"
      : "exploration";

    // Elite Freeze
    if (activeImages.length >= 2) {
      const top = activeImages[0],
        sec = activeImages[1];
      const isGod = top.rating > 1770 && top.viewCount >= 4;
      const isStrong =
        top.rating > 1600 &&
        top.viewCount >= 6 &&
        top.rating - 1.0 * top.sigma > sec.rating + 1.0 * sec.sigma;
      const isStat =
        top.rating > 1520 &&
        top.viewCount >= 7 &&
        top.rating - 1.62 * top.sigma > sec.rating + 1.62 * sec.sigma;

      const eType: EliteType = isGod
        ? "GOD"
        : isStrong
          ? "STRONG"
          : isStat
            ? "STAT"
            : null;
      if (eType) {
        top.status = "frozen";
        top.eliteType = eType;
        stalemateCounterRef.current = 0;
        updateSystemState();
        return;
      }
    }

    // Pruning
    activeImages.forEach((img) => {
      if (img.viewCount >= 5 && img.rating <= 1200) {
        img.status = "eliminated";
        stalemateCounterRef.current = 0;
      }
    });

    // Stagnation Breaker
    activeImages.forEach((img) => {
      if (img.viewCount >= 10) {
        if (img.rating >= 1500) {
          img.status = "frozen";
          img.eliteType = "STAT";
        } else {
          img.status = "eliminated";
        }
        stalemateCounterRef.current = 0;
      }
    });

    // Similarity Finish
    if (activeImages.length > 0 && activeImages.length <= 4) {
      const top = activeImages[0],
        bot = activeImages[activeImages.length - 1];
      const avgViews =
        activeImages.reduce((s, i) => s + i.viewCount, 0) /
        activeImages.length;
      if (avgViews >= 6 && top.rating - bot.rating < 50) {
        finishReasonRef.current = "好みの近似による自動終了";
        finishSort();
        return;
      }
    }

    // Convergence
    if (activeImages.length > 0) {
      const maxSigma = Math.max(...activeImages.map((i) => i.sigma));
      if (
        currentPhaseRef.current === "precision" &&
        maxSigma < IMPACT_THRESHOLD &&
        activeImages.length > 2
      ) {
        finishReasonRef.current = "収束完了";
        finishSort();
        return;
      }
    }

    syncState();
  }, [finishSort, syncState]);

  // === Public actions ===
  const startBattle = useCallback(() => {
    if (imagesRef.current.length < 2) return;
    imagesRef.current.forEach((i) => {
      i.rating = RATING_BASE;
      i.sigma = SIGMA_INIT;
      i.viewCount = 0;
      i.passCount = 0;
      i.wins = 0;
      i.status = "active";
      i.eliteType = null;
    });
    initialTotalSigmaRef.current = imagesRef.current.length * SIGMA_INIT;
    historyStackRef.current = [];
    actionLogRef.current = [];
    stalemateCounterRef.current = 0;
    lastWinnerIdRef.current = null;
    totalClicksRef.current = 0;
    precisionModeLockedRef.current = false;
    currentPhaseRef.current = "exploration";
    finishReasonRef.current = "完走";

    setScreen("battle");
    updateSystemState();
    nextMatch();
  }, [updateSystemState, nextMatch]);

  const pushHistory = () => {
    historyStackRef.current.push({
      imagesCopy: JSON.parse(JSON.stringify(imagesRef.current)),
      actionLogCopy: [...actionLogRef.current],
      phase: currentPhaseRef.current,
      locked: precisionModeLockedRef.current,
      streak: globalPassStreakRef.current,
      stalemate: stalemateCounterRef.current,
      lastWinner: lastWinnerIdRef.current,
      clicks: totalClicksRef.current,
    });
  };

  const choose = useCallback(
    (winnerId: number) => {
      pushHistory();
      globalPassStreakRef.current = 0;
      actionLogRef.current.push({ type: "win", id: winnerId });
      lastWinnerIdRef.current = winnerId;
      totalClicksRef.current++;

      if (currentPhaseRef.current === "precision") {
        stalemateCounterRef.current++;
        if (stalemateCounterRef.current > 5) {
          let weakest = currentGroupRef.current[0];
          currentGroupRef.current.forEach((img) => {
            const actual = imagesRef.current.find((i) => i.id === img.id);
            const weakActual = imagesRef.current.find(
              (i) => i.id === weakest.id
            );
            if (actual && weakActual && actual.rating < weakActual.rating)
              weakest = img;
          });
          if (weakest.id !== winnerId) {
            const target = imagesRef.current.find(
              (i) => i.id === weakest.id
            );
            if (target) {
              if (target.rating >= 1520) {
                target.status = "frozen";
                target.eliteType = "STAT";
              } else {
                target.status = "eliminated";
              }
              stalemateCounterRef.current = 0;
            }
          }
        }
      }

      const winner = imagesRef.current.find((i) => i.id === winnerId);
      const losers = currentGroupRef.current
        .filter((img) => img.id !== winnerId)
        .map((img) => imagesRef.current.find((i) => i.id === img.id)!);

      if (!winner) return;

      const annealingFactor = 1.0 / (1.0 + winner.viewCount * 0.15);

      losers.forEach((loser) => {
        if (!loser) return;
        const Ea =
          1 /
          (1 +
            Math.pow(10, (loser.rating - winner.rating) / MATCH_SCALE));
        const Eb =
          1 /
          (1 +
            Math.pow(10, (winner.rating - loser.rating) / MATCH_SCALE));

        const winnerK = K_FACTOR_INITIAL * annealingFactor;
        const loserK = K_FACTOR_INITIAL * annealingFactor;

        let loserModifier = 0.6;
        if (loser.wins === 0) loserModifier = 0.2;

        winner.rating += (winnerK * (1 - Ea)) / Math.sqrt(losers.length);
        loser.rating += loserK * (0 - Eb) * loserModifier;

        let sigmaDrop = 0.92;
        if (loser.viewCount > 8) sigmaDrop = 0.7;
        loser.sigma *= sigmaDrop;

        loser.viewCount++;
      });

      let winnerSigmaDrop = 0.85;
      if (winner.viewCount > 8) winnerSigmaDrop = 0.7;
      winner.sigma *= winnerSigmaDrop;

      winner.viewCount++;
      winner.wins++;

      clampValues();
      updateSystemState();
      nextMatch();
    },
    [updateSystemState, nextMatch]
  );

  const passMatch = useCallback(() => {
    pushHistory();
    globalPassStreakRef.current++;
    lastWinnerIdRef.current = null;
    totalClicksRef.current++;
    actionLogRef.current.push({ type: "pass", id: null });

    if (globalPassStreakRef.current >= GLOBAL_PASS_LIMIT) {
      finishReasonRef.current = "手動終了(連続パス)";
      finishSort();
      return;
    }

    currentGroupRef.current.forEach((img) => {
      const t = imagesRef.current.find((i) => i.id === img.id);
      if (!t) return;
      t.passCount++;
      t.viewCount++;
      t.rating -= 30;
      t.sigma *= 0.75;
      if (t.passCount >= PASS_ELIMINATION_THRESHOLD)
        t.status = "eliminated";
    });

    clampValues();
    updateSystemState();

    const active = imagesRef.current.filter((i) => i.status === "active");
    if (active.length < 2) {
      finishReasonRef.current = "枯渇";
      finishSort();
    } else {
      setShaking(true);
      setTimeout(() => setShaking(false), 400);
      nextMatch();
    }
  }, [updateSystemState, nextMatch, finishSort]);

  const undo = useCallback(() => {
    if (historyStackRef.current.length === 0) return;
    const state = historyStackRef.current.pop()!;
    imagesRef.current = state.imagesCopy;
    actionLogRef.current = state.actionLogCopy;
    currentPhaseRef.current = state.phase;
    precisionModeLockedRef.current = state.locked;
    globalPassStreakRef.current = state.streak;
    stalemateCounterRef.current = state.stalemate;
    lastWinnerIdRef.current = state.lastWinner;
    totalClicksRef.current = state.clicks;
    syncState();
    nextMatch();
  }, [syncState, nextMatch]);

  const finishEarly = useCallback(() => {
    if (imagesRef.current.every((i) => i.viewCount === 0)) return;
    if (confirm("現在の学習データで分析結果を表示しますか？")) {
      finishReasonRef.current = "手動終了";
      finishSort();
    }
  }, [finishSort]);

  const quitSort = useCallback(() => {
    if (confirm("最初に戻りますか？")) {
      resetToStartScreen();
    }
  }, []);

  const resetToStartScreen = useCallback(() => {
    setScreen("upload");
    historyStackRef.current = [];
    actionLogRef.current = [];
    currentGroupRef.current = [];
    totalClicksRef.current = 0;
    globalPassStreakRef.current = 0;
    stalemateCounterRef.current = 0;
    lastWinnerIdRef.current = null;
    precisionModeLockedRef.current = false;
    currentPhaseRef.current = "exploration";

    imagesRef.current.forEach((img) => {
      img.rating = RATING_BASE;
      img.sigma = SIGMA_INIT;
      img.viewCount = 0;
      img.wins = 0;
      img.passCount = 0;
      img.status = "active";
      img.eliteType = null;
    });
    syncState();
  }, [syncState]);

  const canUndo = historyStackRef.current.length > 0;

  return {
    screen,
    images,
    currentGroup,
    currentPhase,
    globalPassStreak,
    totalClicks,
    finishReasonText,
    shaking,
    shutterState,
    canUndo,

    addImages,
    deleteImage,
    clearAllImages,
    startBattle,
    choose,
    passMatch,
    undo,
    finishEarly,
    quitSort,
    resetToStartScreen,
    getProgressInfo,
  };
}
