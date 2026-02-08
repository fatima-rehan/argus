"use client";

import { HUDPanel } from "./HUDPanel";

export function LoginPanel() {
  return (
    <HUDPanel title="User Login" subtitle="Authorized personnel only">
      <div className="space-y-4">
        <label className="block text-xs text-cyber-cyan/70">
          Username
          <div className="mt-2 flex items-center gap-2 rounded border border-cyber-cyan/30 bg-black/40 px-3 py-2">
            <span className="text-cyber-cyan/60">👤</span>
            <input
              className="w-full bg-transparent text-sm text-white placeholder:text-white/40 focus:outline-none"
              placeholder="Enter username"
            />
          </div>
        </label>
        <label className="block text-xs text-cyber-cyan/70">
          Password
          <div className="mt-2 flex items-center gap-2 rounded border border-cyber-cyan/30 bg-black/40 px-3 py-2">
            <span className="text-cyber-cyan/60">🔒</span>
            <input
              type="password"
              className="w-full bg-transparent text-sm text-white placeholder:text-white/40 focus:outline-none"
              placeholder="Enter password"
            />
          </div>
        </label>
        <button className="w-full rounded border border-cyber-cyan/60 bg-cyber-cyan/20 px-4 py-2 text-xs uppercase tracking-[0.2em] text-cyber-cyan hover:bg-cyber-cyan/30">
          Login
        </button>
      </div>
    </HUDPanel>
  );
}
