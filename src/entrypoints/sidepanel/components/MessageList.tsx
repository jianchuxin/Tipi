import type { ReactNode } from "react";
import { useEffect, useRef } from "react";

type MessageListProps = {
  children: ReactNode;
};

export function MessageList({ children }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [children]);

  return (
    <div
      className="flex-1 overflow-y-auto px-4 py-4"
      style={{ fontSize: "14px", lineHeight: "1.6" }}
    >
      {children}
      <div ref={bottomRef} />
    </div>
  );
}
