"use client";

import type { ReactNode } from "react";

type IndicatorColor = "green" | "blue" | "orange" | "red";

interface HUDPanelProps {
  title: string;
  indicator?: IndicatorColor;
  statusText?: string;
  children: ReactNode;
  className?: string;
}

export function HUDPanel({
  title,
  indicator = "blue",
  statusText,
  children,
  className,
}: HUDPanelProps) {
  return (
    <div className={`panel-section ${className ?? ""}`}>
      <div className="panel-header">
        <span className={`panel-indicator panel-indicator-${indicator}`} />
        {title}
        {statusText ? (
          <span className="ml-auto text-[10px] font-normal text-gray-400">
            {statusText}
          </span>
        ) : null}
      </div>
      {children}
    </div>
  );
}
