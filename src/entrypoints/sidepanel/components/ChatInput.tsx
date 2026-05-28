import type { KeyboardEvent, ChangeEvent } from "react";

type ChatInputProps = {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
};

export function ChatInput({ value, onChange, onSend, disabled }: ChatInputProps) {
  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (value.trim() && !disabled) {
        onSend();
      }
    }
  }

  return (
    <div
      className="px-4 py-3"
      style={{
        borderTop: "1px solid var(--color-line)",
        backgroundColor: "var(--color-surface)",
      }}
    >
      <div className="flex items-end gap-2">
        <textarea
          className="min-h-[40px] max-h-[120px] flex-1 resize-none rounded-xl border px-3 py-2 text-[14px] outline-none transition"
          disabled={disabled}
          onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
            onChange(event.target.value)
          }
          onKeyDown={handleKeyDown}
          placeholder="问 Tipi 关于你浏览历史的任何问题..."
          rows={1}
          style={{
            borderColor: "var(--color-line)",
            backgroundColor: "rgba(255,255,255,0.7)",
            color: "var(--color-ink)",
            fontSize: "14px",
            lineHeight: "1.5",
          }}
          value={value}
        />
        <button
          className="shrink-0 rounded-xl px-4 py-2 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!value.trim() || disabled}
          onClick={onSend}
          style={{
            backgroundColor: "var(--color-primary)",
            color: "#fff",
          }}
          type="button"
        >
          发送
        </button>
      </div>
    </div>
  );
}
