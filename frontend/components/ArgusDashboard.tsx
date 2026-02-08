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

/* ─── Helpers ───────────────────────────────────────────────── */

function SegmentBar({
  value,
  max,
  segments = 20,
  color = "filled",
}: {
  value: number;
  max: number;
  segments?: number;
  color?: "filled" | "filled-blue" | "filled-orange";
}) {
  const filled = max > 0 ? Math.round((value / max) * segments) : 0;
  return (
    <div className="segment-bar">
      {Array.from({ length: segments }, (_, i) => (
        <div
          key={i}
          className={`segment-bar-item ${i < filled ? color : ""}`}
        />
      ))}
    </div>
  );
}

function MetricBox({
  label,
  value,
  active,
}: {
  label: string;
  value: number;
  active?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center border px-3 py-2 ${
        active ? "border-gray-600 bg-gray-900/50" : "border-gray-800"
      }`}
    >
      <div className="text-sm font-semibold text-white panel-value">
        ({value})
      </div>
      <div className="mt-0.5 text-[10px] uppercase tracking-wider text-gray-500">
        {label}
      </div>
    </div>
  );
}

/* ─── Main Dashboard ────────────────────────────────────────── */

export function ArgusDashboard() {
  const [startupDescription, setStartupDescription] = useState("");
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [activeMatch, setActiveMatch] = useState<MatchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchHistory, setSearchHistory] = useState<
    { query: string; date: string }[]
  >([]);
  const [searchPhase, setSearchPhase] = useState("");

  const signals = useMemo(
    () => matches.map((m) => m.signal),
    [matches],
  );

  const matchDistribution = useMemo(() => {
    const high = matches.filter((m) => m.score >= 0.8).length;
    const medium = matches.filter(
      (m) => m.score >= 0.5 && m.score < 0.8,
    ).length;
    const low = matches.filter((m) => m.score < 0.5).length;
    return { high, medium, low };
  }, [matches]);

  const avgScore = useMemo(() => {
    if (matches.length === 0) return 0;
    return Math.round(
      (matches.reduce((sum, m) => sum + m.score, 0) / matches.length) * 100,
    );
  }, [matches]);

  // Clear stale data from previous sessions
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem("argus.matches");
    window.localStorage.removeItem("argus.startup");
    window.localStorage.removeItem("argus.history");
  }, []);

  // Animated search phase text
  useEffect(() => {
    if (!isLoading) {
      setSearchPhase("");
      return;
    }
    const phases = [
      "Initializing search protocol...",
      "Scanning government databases...",
      "Analyzing procurement signals...",
      "Matching signal patterns...",
      "Cross-referencing intelligence...",
      "Extracting opportunities...",
      "Compiling results...",
    ];
    let idx = 0;
    setSearchPhase(phases[0]);
    const timer = setInterval(() => {
      idx = (idx + 1) % phases.length;
      setSearchPhase(phases[idx]);
    }, 4000);
    return () => clearInterval(timer);
  }, [isLoading]);

  const handleSearch = async () => {
    if (!startupDescription.trim()) return;
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
        const entry = {
          query: startupDescription.trim(),
          date: new Date().toLocaleDateString(),
        };
        const existing = prev.filter((h) => h.query !== entry.query);
        return [entry, ...existing].slice(0, 10);
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

  const handleNewSearch = () => {
    setStartupDescription("");
    setMatches([]);
    setActiveMatch(null);
    setHasSearched(false);
    setError(null);
  };

  const handleSignalClick = (signal: Signal) => {
    const match = matches.find((item) => item.signal.id === signal.id);
    setActiveMatch(match ?? null);
  };

  return (
    <main
      className={`relative flex h-screen max-h-screen flex-col overflow-hidden ${isLoading ? "search-active" : ""}`}
    >
      {/* Data stream overlay */}
      <div className="data-stream" aria-hidden="true">
        {[...Array(6)].map((_, i) => (
          <span key={i} className="data-stream-col">
            {DATA_CHARS.repeat(8)}
          </span>
        ))}
      </div>

      {/* ─── Top Navigation Bar ─────────────────────────────────── */}
      <header className="relative z-10 flex items-center justify-between border-b border-gray-800 px-6 py-3">
        <div className="flex items-center gap-4">
          <span className="text-sm font-bold tracking-tight text-white">
            Argus
          </span>
          <span className="text-[10px] text-gray-600">v2.1</span>
        </div>

        <div className="flex items-center gap-3 text-[11px]">
          <span className="px-2 py-0.5 text-gray-400 uppercase tracking-wider">
            Search Mode
          </span>
          {isLoading ? (
            <span className="border border-blue-500/40 bg-blue-500/10 px-2.5 py-0.5 text-blue-400">
              Analyzing...
            </span>
          ) : hasSearched ? (
            <span className="border border-green-500/30 bg-green-500/10 px-2.5 py-0.5 text-green-400">
              Analysis Complete
            </span>
          ) : (
            <span className="border border-gray-700 px-2.5 py-0.5 text-gray-500">
              Idle
            </span>
          )}
          <span className="text-gray-600 uppercase tracking-wider">
            Global
          </span>
        </div>

        <div className="flex items-center gap-4 text-[11px] text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="dot-live" />
            {signals.length} Signals
          </span>
          <span>
            {isLoading ? (
              <span className="text-blue-400">Active</span>
            ) : (
              "Ready"
            )}
          </span>
        </div>
      </header>

      {/* ─── Loading progress line ──────────────────────────────── */}
      {isLoading && <div className="search-progress-line relative z-10" />}

      {/* ─── Three-Column Layout ────────────────────────────────── */}
      <div className="relative z-10 flex flex-1 min-h-0 overflow-hidden p-3">
        {/* ─── Left Sidebar ───────────────────────────────────── */}
        <aside className="flex w-[240px] flex-shrink-0 flex-col border-r border-gray-800 overflow-y-auto">
          <LoginPanel />

          {/* New Search Button */}
          <div className="panel-section">
            <button
              className="w-full border border-dashed border-gray-700 px-3 py-2 text-xs text-gray-400 hover:border-gray-500 hover:text-gray-300 transition-colors"
              onClick={handleNewSearch}
            >
              + New Search
            </button>
          </div>

          {/* Search History */}
          <div className="panel-section flex-1">
            <div className="panel-header">
              <span className="panel-indicator panel-indicator-blue" />
              Search Sessions
            </div>

            {startupDescription && hasSearched && (
              <>
                <div className="mb-2 text-[10px] text-gray-500">Current:</div>
                <div className="mb-3 border border-blue-500/30 bg-blue-500/5 p-2 text-xs text-gray-300 leading-relaxed">
                  {startupDescription.length > 80
                    ? startupDescription.slice(0, 80) + "..."
                    : startupDescription}
                </div>
              </>
            )}

            {searchHistory.length > 0 ? (
              <div className="space-y-2">
                {searchHistory.map((entry, i) => (
                  <button
                    key={i}
                    className="w-full text-left border border-gray-800 p-2 hover:border-gray-600 transition-colors"
                    onClick={() => {
                      setStartupDescription(entry.query);
                    }}
                  >
                    <div className="text-xs text-gray-400 truncate">
                      {entry.query}
                    </div>
                    <div className="mt-1 text-[10px] text-gray-600">
                      {entry.date}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-[10px] text-gray-600">
                No previous sessions
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-800 px-4 py-2 text-[10px] text-gray-600">
            Version 2.1
          </div>
        </aside>

        {/* ─── Center: Globe + Command Bar ────────────────────── */}
        <section className="relative flex flex-1 flex-col">
          <div className="flex-1 min-h-0">
            <Earth3D
              signals={signals}
              onSignalClick={handleSignalClick}
              isSearching={isLoading}
            />
          </div>

          {/* Search phase text during loading */}
          {isLoading && searchPhase && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 text-[10px] text-blue-400/70 panel-value">
              {searchPhase}
            </div>
          )}

          {/* Bottom Command Bar */}
          <div className="absolute bottom-6 left-1/2 z-20 w-[65%] -translate-x-1/2">
            <AIChat
              value={startupDescription}
              onChange={setStartupDescription}
              onSubmit={handleSearch}
              loading={isLoading}
              error={error}
            />
          </div>
        </section>

        {/* ─── Right Sidebar ──────────────────────────────────── */}
        <aside className="flex w-[280px] flex-shrink-0 flex-col border-l border-gray-800 overflow-y-auto overflow-x-hidden pb-4">
          {/* Search Status */}
          <HUDPanel
            title="Search Status"
            indicator="green"
            statusText={isLoading ? "ACTIVE" : hasSearched ? "COMPLETE" : "IDLE"}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Impact Score</span>
                <span className="text-white panel-value">{avgScore}</span>
              </div>
              <div>
                <SegmentBar value={avgScore} max={100} />
                <div className="mt-1 flex justify-between text-[9px] text-gray-600">
                  <span>0</span>
                  <span>100</span>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Status:</span>
                <span
                  className={
                    isLoading
                      ? "text-blue-400"
                      : avgScore > 70
                        ? "text-green-400"
                        : avgScore > 40
                          ? "text-yellow-400"
                          : "text-gray-400"
                  }
                >
                  {isLoading
                    ? "SCANNING"
                    : avgScore > 70
                      ? "STRONG"
                      : avgScore > 40
                        ? "MODERATE"
                        : hasSearched
                          ? "WEAK"
                          : "STANDBY"}
                </span>
              </div>
            </div>
          </HUDPanel>

          {/* Match Activity */}
          <HUDPanel title="Match Activity" indicator="blue">
            <div className="grid grid-cols-3 gap-2">
              <MetricBox
                label="High"
                value={matchDistribution.high}
                active={matchDistribution.high > 0}
              />
              <MetricBox
                label="Medium"
                value={matchDistribution.medium}
                active={matchDistribution.medium > 0}
              />
              <MetricBox
                label="Low"
                value={matchDistribution.low}
                active={matchDistribution.low > 0}
              />
            </div>
          </HUDPanel>

          {/* Signal Detail */}
          <HUDPanel
            title="Signal Detail"
            indicator="blue"
            statusText={activeMatch ? "SELECTED" : ""}
          >
            {activeMatch ? (
              <div className="space-y-3">
                <div className="text-sm font-semibold text-white leading-tight">
                  {activeMatch.signal.title}
                </div>
                <div className="text-[10px] text-gray-500">
                  {activeMatch.signal.city ||
                    activeMatch.signal.country ||
                    "Unknown"}
                  {activeMatch.signal.state
                    ? `, ${activeMatch.signal.state}`
                    : ""}{" "}
                  &middot; {activeMatch.signal.category}
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">
                  {activeMatch.signal.description}
                </p>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div className="border border-gray-800 p-2">
                    <div className="text-gray-600 uppercase tracking-wider">
                      Budget
                    </div>
                    <div className="mt-0.5 text-xs text-white panel-value">
                      {activeMatch.signal.budget
                        ? `$${(activeMatch.signal.budget / 1000000).toFixed(1)}M`
                        : "N/A"}
                    </div>
                  </div>
                  <div className="border border-gray-800 p-2">
                    <div className="text-gray-600 uppercase tracking-wider">
                      Timeline
                    </div>
                    <div className="mt-0.5 text-xs text-white">
                      {activeMatch.signal.timeline}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[10px]">
                  <span className="text-gray-600">Match:</span>
                  <div className="flex-1">
                    <SegmentBar
                      value={Math.round(activeMatch.score * 100)}
                      max={100}
                      color="filled-blue"
                      segments={15}
                    />
                  </div>
                  <span className="text-white panel-value">
                    {Math.round(activeMatch.score * 100)}%
                  </span>
                </div>
                {activeMatch.signal.stakeholders.length > 0 && (
                  <div>
                    <div className="mb-1 text-[10px] text-gray-600 uppercase tracking-wider">
                      Stakeholders
                    </div>
                    <ul className="space-y-0.5">
                      {activeMatch.signal.stakeholders.map((p) => (
                        <li key={p} className="text-[11px] text-gray-400">
                          {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {activeMatch.signal.source_url && (
                  <div>
                    <div className="mb-1 text-[10px] text-gray-600 uppercase tracking-wider">
                      Source
                    </div>
                    <a
                      href={activeMatch.signal.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-[11px] text-blue-400 hover:text-blue-300 transition-colors truncate"
                    >
                      {new URL(activeMatch.signal.source_url).hostname.replace(
                        /^www\./,
                        "",
                      )}
                      <span className="text-[9px] text-gray-600">&nearr;</span>
                    </a>
                  </div>
                )}
                <button
                  className="w-full border border-gray-800 px-3 py-1.5 text-[10px] text-gray-500 uppercase tracking-wider hover:bg-gray-900 transition-colors"
                  onClick={() => setActiveMatch(null)}
                >
                  Deselect
                </button>
              </div>
            ) : (
              <div className="text-xs text-gray-600">
                {isLoading
                  ? "Matching signals..."
                  : signals.length > 0
                    ? "Select a signal on the globe."
                    : hasSearched
                      ? "No matches found."
                      : "Awaiting analysis input."}
              </div>
            )}
          </HUDPanel>

          {/* Current Query */}
          <HUDPanel title="Analysis Input" indicator="orange">
            {startupDescription ? (
              <div className="border border-gray-800 p-2 text-xs text-gray-400 leading-relaxed">
                {startupDescription}
              </div>
            ) : (
              <div className="text-xs text-gray-600">
                No query submitted yet.
              </div>
            )}
          </HUDPanel>
        </aside>
      </div>
    </main>
  );
}
