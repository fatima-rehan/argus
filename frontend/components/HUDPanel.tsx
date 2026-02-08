"use client";

import type { ReactNode } from "react";

interface HUDPanelProps {
  title: string;
  subtitle?: string;
  className?: string;
  children: ReactNode;
}

export function HUDPanel({ title, subtitle, className, children }: HUDPanelProps) {
  return (
    <section className={`glass-panel hud-outline hud-corners ${className ?? ""}`}>
      <div className="border-b border-cyber-cyan/30 px-4 py-3">
        <div className="text-xs text-cyber-cyan/70 hud-title">{title}</div>
        {subtitle ? <div className="mt-1 text-[11px] text-white/60">{subtitle}</div> : null}
      </div>
      <div className="px-4 py-4">{children}</div>
    </section>
  );
}
