export function ApiKeyGuide() {
  function handleOpenOptions() {
    const optionsUrl = chrome.runtime.getURL("options.html");
    chrome.tabs.create({ url: optionsUrl });
  }

  return (
    <div
      className="journal-canvas flex min-h-screen flex-col items-center justify-center px-6 text-center"
      style={{ fontSize: "16px", lineHeight: "1.5" }}
    >
      <svg
        fill="none"
        height="48"
        stroke="var(--color-primary)"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        viewBox="0 0 24 24"
        width="48"
      >
        <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z" />
        <path d="M8 9.5c.8-.8 3.2-2 5.5.5" />
        <path d="M8 13c.8.5 2.6 1 4-.5" />
        <circle cx="9" cy="9" fill="var(--color-primary)" r="1.2" stroke="none" />
        <circle cx="15" cy="9" fill="var(--color-primary)" r="1.2" stroke="none" />
      </svg>
      <h2
        className="mt-6 font-[var(--font-display)] text-[1.3rem] font-bold tracking-[-0.03em]"
        style={{ color: "var(--color-ink)" }}
      >
        欢迎使用 Tipi AI 助理
      </h2>
      <p className="mt-3 max-w-xs text-[14px] leading-6" style={{ color: "var(--color-muted)" }}>
        使用您的 DeepSeek API Key，让 AI 帮您智能检索浏览历史。
      </p>
      <button
        className="journal-button-primary mt-6 inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold"
        onClick={handleOpenOptions}
        type="button"
      >
        前往设置页配置 API Key
      </button>
    </div>
  );
}
