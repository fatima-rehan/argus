"use client";

interface AIChatProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  loading?: boolean;
  error?: string | null;
}

export function AIChat({
  value,
  onChange,
  onSubmit,
  loading,
  error,
}: AIChatProps) {
  return (
    <div className="space-y-1">
      <div className="command-bar">
        <input
          type="text"
          placeholder="Describe your startup..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onSubmit();
            }
          }}
        />
        <button onClick={onSubmit} disabled={loading || value.trim().length === 0}>
          {loading ? "Analyzing..." : "Analyze"}
        </button>
      </div>
      {error ? (
        <div className="text-[10px] text-red-400 px-1">{error}</div>
      ) : null}
    </div>
  );
}
