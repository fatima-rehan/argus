"use client";

import { HUDPanel } from "./HUDPanel";

export function AIChat() {
  return (
    <HUDPanel title="AI Assistant" subtitle="Argus search system online">
      <div className="space-y-3">
        <div className="rounded border border-cyber-cyan/20 bg-black/40 p-3 text-xs text-white/80">
          How can I assist you?
          <div className="mt-2 text-[10px] text-white/40">10:16 PM</div>
        </div>
        <div className="rounded border border-cyber-cyan/20 bg-black/30 px-3 py-2 text-xs text-white/50">
          Type a message...
        </div>
        <div className="flex justify-end">
          <button className="rounded border border-cyber-cyan/40 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-cyber-cyan">
            Send
          </button>
        </div>
      </div>
    </HUDPanel>
  );
}
