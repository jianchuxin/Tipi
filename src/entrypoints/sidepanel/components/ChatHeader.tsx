type ChatHeaderProps = {
  onClear: () => void;
};

export function ChatHeader({ onClear }: ChatHeaderProps) {
  return (
    <header
      className="flex items-center justify-between px-4 py-3"
      style={{
        borderBottom: "1px solid var(--color-line)",
        backgroundColor: "var(--color-surface)",
      }}
    >
      <div className="flex items-center gap-2">
        <svg
          fill="none"
          height="18"
          stroke="var(--color-primary)"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          width="18"
        >
          <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z" />
          <path d="M8 9.5c.8-.8 3.2-2 5.5.5" />
          <path d="M8 13c.8.5 2.6 1 4-.5" />
          <circle cx="9" cy="9" fill="var(--color-primary)" r="1.2" stroke="none" />
          <circle cx="15" cy="9" fill="var(--color-primary)" r="1.2" stroke="none" />
        </svg>
        <span
          className="font-[var(--font-display)] text-[14px] font-bold tracking-[-0.03em]"
          style={{ color: "var(--color-ink)" }}
        >
          Tipi AI
        </span>
      </div>
      <button
        className="rounded-lg px-2 py-1 text-[12px] transition hover:bg-[color:var(--color-surface-low)]"
        onClick={onClear}
        style={{ color: "var(--color-muted)" }}
        type="button"
      >
        清除对话
      </button>
    </header>
  );
}
