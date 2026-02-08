"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { HUDPanel } from "./HUDPanel";
import { LoginPanel } from "./LoginPanel";
import { AIChat } from "./AIChat";
import { matchStartup, type MatchResult, type Signal } from "../lib/api";

const Earth3D = dynamic(() => import("./Earth3D").then((mod) => mod.Earth3D), {
  ssr: false,
});

const DATA_CHARS = "01001 SIGNAL 10110 MATCH 00101 SCAN 11010 NODE 01100 DATA";

export function ArgusDashboard() {
  const [startupDescription, setStartupDescription] = useState("");
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [activeMatch, setActiveMatch] = useState<MatchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [searchPhase, setSearchPhase] = useState("");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const signals = useMemo(
    () => matches.map((match) => match.signal),
    [matches],
  );

  // Clear any stale data from previous sessions on mount
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.removeItem("argus.matches");
    window.localStorage.removeItem("argus.startup");
    window.localStorage.removeItem("argus.history");
  }, []);

  // Animated search phase text
  useEffect(() => {
    if (!isLoading) {
      setSearchPhase("");
      setElapsedSeconds(0);
      return;
    }

    const phases = [
      "Initializing search protocol...",
      "Scanning government databases...",
      "Analyzing procurement signals...",
      "Matching signal patterns...",
      "Cross-referencing intelligence...",
      "Extracting opportunities...",
      "Verifying signal coordinates...",
      "Compiling results...",
    ];

    let idx = 0;
    setSearchPhase(phases[0]);

    const phaseTimer = setInterval(() => {
      idx = (idx + 1) % phases.length;
      setSearchPhase(phases[idx]);
    }, 4000);

    const elapsed = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => {
      clearInterval(phaseTimer);
      clearInterval(elapsed);
    };
  }, [isLoading]);

  const handleSearch = async () => {
    if (!startupDescription.trim()) {
      return;
    }
    setIsLoading(true);
    setError(null);
    setHasSearched(true);
    try {
      const response = await matchStartup(startupDescription.trim());
      setMatches((prev) => {
        const merged = new Map<number, MatchResult>();
        prev.forEach((item) => merged.set(item.signal.id, item));
        response.matches.forEach((item) => merged.set(item.signal.id, item));
        return Array.from(merged.values());
      });
      setActiveMatch(response.matches[0] ?? null);
      setSearchHistory((prev) => {
        const next = [startupDescription.trim(), ...prev];
        return Array.from(new Set(next)).slice(0, 8);
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Match request failed";
      setError(message);
      setMatches([]);
      setActiveMatch(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignalClick = (signal: Signal) => {
    const match = matches.find((item) => item.signal.id === signal.id);
    setActiveMatch(match ?? null);
  };

  return (
    <main
      className={`relative min-h-screen text-white overflow-hidden ${isLoading ? "search-active" : ""}`}
    >
      <div className="absolute inset-0 hud-grid opacity-50" />
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute left-8 top-8 h-2 w-20 border-t border-cyber-cyan/50" />
        <div className="absolute right-10 top-10 h-2 w-24 border-t border-cyber-cyan/50" />
        <div className="absolute left-8 bottom-10 h-2 w-24 border-b border-cyber-cyan/50" />
        <div className="absolute right-10 bottom-8 h-2 w-20 border-b border-cyber-cyan/50" />
        <div className="glitch-line" />
      </div>
      <div className="absolute inset-x-0 top-0 h-full scanline opacity-35" />

      {/* Data stream overlay — visible only during search */}
      <div className="data-stream" aria-hidden="true">
        {[...Array(6)].map((_, i) => (
          <span key={i} className="data-stream-col">
            {DATA_CHARS.repeat(8)}
          </span>
        ))}
      </div>

      <header className="relative z-10 flex items-center justify-between px-10 py-6">
        <div>
          <div className="hud-title text-xs text-cyber-cyan hud-text-glow">
            ARGUS
          </div>
          <div className="text-[10px] text-white/50">
            {isLoading
              ? "Global intelligence scan in progress..."
              : "Matches startups to relevant government signals in real-time."}
          </div>
        </div>
        <div className="flex items-center gap-6 text-[10px] hud-mono text-white/60">
          <div className="flex items-center gap-2">
            <span className="hud-dot" />
            {isLoading ? (
              <span className="text-matrix-green">Scanning</span>
            ) : (
              "Tracking"
            )}
          </div>
          <div>Signals: {signals.length}</div>
          <div>
            Status:{" "}
            {isLoading ? (
              <span className="text-matrix-green">Active</span>
            ) : (
              "Stable"
            )}
          </div>
          {isLoading && (
            <div className="text-cyber-cyan/70">
              T+{elapsedSeconds}s
            </div>
          )}
        </div>
      </header>

      {/* Search progress bar */}
      {isLoading && (
        <div className="relative z-10 mx-10">
          <div className="search-progress" />
          <div className="mt-1 flex justify-between text-[9px] hud-mono text-cyber-cyan/60">
            <span className="typing-cursor">{searchPhase}</span>
            <span>LIVE</span>
          </div>
        </div>
      )}

      <div
        className={`relative z-10 grid ${isLoading ? "h-[calc(100vh-120px)]" : "h-[calc(100vh-96px)]"} grid-cols-[280px_minmax(0,1fr)_320px] gap-6 px-10 pb-10`}
      >
        <aside className="flex h-full flex-col gap-6">
          <LoginPanel />
          <AIChat
            value={startupDescription}
            onChange={setStartupDescription}
            onSubmit={handleSearch}
            loading={isLoading}
            error={error}
          />
        </aside>

        <section className="relative flex h-full flex-col items-center justify-center">
          <div className="h-full w-full">
            <Earth3D
              signals={signals}
              onSignalClick={handleSignalClick}
              isSearching={isLoading}
            />
          </div>
          <div className="absolute bottom-6 flex w-full items-center justify-between px-6 text-[10px] text-white/50 hud-mono">
            <div>LAT: 40.7128° N</div>
            <div>LONG: 74.0060° W</div>
            <div
              className={
                isLoading ? "text-matrix-green" : "text-cyber-cyan/70"
              }
            >
              {isLoading ? "SCANNING" : "STABLE"}
            </div>
          </div>
        </section>

        <aside className="flex h-full flex-col gap-6">
          {activeMatch ? (
            <HUDPanel
              title="Signal Detail"
              subtitle={`${activeMatch.signal.city || activeMatch.signal.country || "Unknown"}${activeMatch.signal.state ? `, ${activeMatch.signal.state}` : ""} · ${activeMatch.signal.category}`}
            >
              <div className="space-y-4 text-sm">
                <div className="text-lg font-semibold text-white">
                  {activeMatch.signal.title}
                </div>
                <p className="text-white/70">
                  {activeMatch.signal.description}
                </p>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <div className="text-white/40">Budget</div>
                    <div className="hud-mono text-white">
                      {activeMatch.signal.budget
                        ? `$${(activeMatch.signal.budget / 1000000).toFixed(1)}M`
                        : "N/A"}
                    </div>
                  </div>
                  <div>
                    <div className="text-white/40">Timeline</div>
                    <div className="text-white">
                      {activeMatch.signal.timeline}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-white/60">
                  Match Score: {Math.round(activeMatch.score * 100)}%
                </div>
                <div>
                  <div className="text-white/40 text-xs">Stakeholders</div>
                  <ul className="mt-2 space-y-1 text-xs text-white/80">
                    {activeMatch.signal.stakeholders.map((person) => (
                      <li key={person}>• {person}</li>
                    ))}
                  </ul>
                </div>
                <div className="flex justify-end">
                  <button
                    className="rounded border border-cyber-cyan/60 bg-cyber-cyan/20 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-cyber-cyan hover:bg-cyber-cyan/30"
                    onClick={() => setActiveMatch(null)}
                    aria-label="Close signal detail"
                  >
                    Back
                  </button>
                </div>
              </div>
            </HUDPanel>
          ) : (
            <HUDPanel title="Signal Detail" subtitle="Awaiting selection">
              <div className="text-sm text-white/60">
                {isLoading
                  ? "Matching signals..."
                  : signals.length > 0
                    ? "Select a signal pin to view government entities."
                    : hasSearched
                      ? "No matches found. Try another description."
                      : "Select a signal pin to view government entities."}
              </div>
            </HUDPanel>
          )}
        </aside>
      </div>
    </main>
  );
}
