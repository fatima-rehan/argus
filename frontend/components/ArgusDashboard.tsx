"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { HUDPanel } from "./HUDPanel";
import { LoginPanel } from "./LoginPanel";
import { AIChat } from "./AIChat";

const Earth3D = dynamic(() => import("./Earth3D").then((mod) => mod.Earth3D), {
  ssr: false
});

const signals = [
  {
    id: 1,
    lat: 30.2672,
    lng: -97.7431,
    city: "Austin",
    state: "TX",
    category: "Cybersecurity",
    title: "SOC Platform Modernization",
    description:
      "City council approved $1.5M for AI-driven threat detection and automated incident response.",
    budget: 1500000,
    timeline: "Q2 2024",
    stakeholders: ["John Smith (IT Director)", "Jane Doe (CISO)"]
  },
  {
    id: 2,
    lat: 29.7604,
    lng: -95.3698,
    city: "Houston",
    state: "TX",
    category: "Cloud Infrastructure",
    title: "Enterprise Cloud Migration",
    description:
      "Houston is launching a $3.2M hybrid cloud migration with strict security and compliance targets.",
    budget: 3200000,
    timeline: "Q3 2024",
    stakeholders: ["Mike Johnson (CTO)"]
  },
  {
    id: 3,
    lat: 37.7749,
    lng: -122.4194,
    city: "San Francisco",
    state: "CA",
    category: "AI/ML Solutions",
    title: "Citywide AI Analytics",
    description:
      "Deploy AI analytics to optimize public services, with a focus on real-time dashboards and alerts.",
    budget: 2200000,
    timeline: "Q1 2025",
    stakeholders: ["Priya Patel (Data Director)"]
  }
];

export function ArgusDashboard() {
  const [activeSignal, setActiveSignal] = useState<(typeof signals)[number] | null>(null);
  const [globeStatus, setGlobeStatus] = useState<"initializing" | "stable" | "offline">(
    "initializing"
  );

  return (
    <main className="relative min-h-screen bg-cyber-blue text-white overflow-hidden">
      <div className="absolute inset-0 hud-grid opacity-30" />
      <div className="absolute inset-x-0 top-0 h-full scanline opacity-40" />

      <header className="relative z-10 flex items-center justify-between px-10 py-6">
        <div>
          <div className="hud-title text-xs text-cyber-cyan">ARGUS</div>
          <div className="text-[10px] text-white/50">Matches startups to relevant government signals in real-time.</div>
        </div>
        <div className="flex items-center gap-6 text-[10px] hud-mono text-white/60">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-cyber-cyan shadow-[0_0_8px_rgba(0,217,255,0.8)]" />
            Tracking
          </div>
          <div>Signals: {signals.length}</div>
          <div>Status: {globeStatus === "initializing" ? "Initializing" : globeStatus}</div>
        </div>
      </header>

      <div className="relative z-10 grid h-[calc(100vh-96px)] grid-cols-[280px_minmax(0,1fr)_320px] gap-6 px-10 pb-10">
        <aside className="flex h-full flex-col gap-6">
          <LoginPanel />
          <AIChat />
        </aside>

        <section className="relative flex h-full flex-col items-center justify-center">
          <div className="absolute top-2 text-center">
            <div className="text-3xl font-semibold tracking-[0.2em] text-cyber-cyan hud-title">
              ARGUS
            </div>
          </div>
          <div className="h-full w-full">
            <Earth3D
              signals={signals}
              onSignalClick={setActiveSignal}
              onStatusChange={setGlobeStatus}
            />
          </div>
          <div className="absolute bottom-4 text-[10px] text-white/40 hud-mono">
            Click signal points for government details
          </div>
        </section>

        <aside className="flex h-full flex-col gap-6">
          {activeSignal ? (
            <HUDPanel
              title="Signal Detail"
              subtitle={`${activeSignal.city}, ${activeSignal.state} · ${activeSignal.category}`}
            >
              <div className="space-y-4 text-sm">
                <div className="text-lg font-semibold text-white">{activeSignal.title}</div>
                <p className="text-white/70">{activeSignal.description}</p>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <div className="text-white/40">Budget</div>
                    <div className="hud-mono text-white">
                      ${(activeSignal.budget / 1000000).toFixed(1)}M
                    </div>
                  </div>
                  <div>
                    <div className="text-white/40">Timeline</div>
                    <div className="text-white">{activeSignal.timeline}</div>
                  </div>
                </div>
                <div>
                  <div className="text-white/40 text-xs">Stakeholders</div>
                  <ul className="mt-2 space-y-1 text-xs text-white/80">
                    {activeSignal.stakeholders.map((person) => (
                      <li key={person}>• {person}</li>
                    ))}
                  </ul>
                </div>
                <div className="flex justify-end">
                  <button
                    className="rounded border border-cyber-cyan/40 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-cyber-cyan"
                    onClick={() => setActiveSignal(null)}
                    aria-label="Close signal detail"
                  >
                    back
                  </button>
                </div>
              </div>
            </HUDPanel>
          ) : (
            <HUDPanel title="Signal Detail" subtitle="Awaiting selection">
              <div className="text-sm text-white/60">
                Select a signal pin to view government entities.
              </div>
            </HUDPanel>
          )}
        </aside>
      </div>
    </main>
  );
}
