import { browser } from "wxt/browser";
import type { ChatMessage, ChatSession } from "@/lib/agent/types";

const CHAT_SESSIONS_KEY = "tipi.chat-sessions";
const MAX_SESSIONS = 20;
const MAX_MESSAGES_PER_SESSION = 50;

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function getSessions(): Promise<ChatSession[]> {
  const stored = await browser.storage.local.get(CHAT_SESSIONS_KEY);
  const sessions = stored[CHAT_SESSIONS_KEY];
  if (!Array.isArray(sessions)) return [];
  return sessions;
}

export async function getLatestSession(): Promise<ChatSession | null> {
  const sessions = await getSessions();
  return sessions.length > 0 ? sessions[sessions.length - 1] : null;
}

export async function createSession(): Promise<ChatSession> {
  const session: ChatSession = {
    id: generateId(),
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const sessions = await getSessions();
  sessions.push(session);

  while (sessions.length > MAX_SESSIONS) {
    sessions.shift();
  }

  await browser.storage.local.set({ [CHAT_SESSIONS_KEY]: sessions });
  return session;
}

export async function saveMessageToSession(
  sessionId: string,
  message: ChatMessage
): Promise<void> {
  const sessions = await getSessions();
  const session = sessions.find((s) => s.id === sessionId);
  if (!session) return;

  session.messages.push(message);

  while (session.messages.length > MAX_MESSAGES_PER_SESSION) {
    session.messages.shift();
  }

  session.updatedAt = Date.now();
  await browser.storage.local.set({ [CHAT_SESSIONS_KEY]: sessions });
}

export async function clearAllSessions(): Promise<void> {
  await browser.storage.local.remove(CHAT_SESSIONS_KEY);
}

export async function deleteSession(sessionId: string): Promise<void> {
  const sessions = await getSessions();
  const filtered = sessions.filter((s) => s.id !== sessionId);
  await browser.storage.local.set({ [CHAT_SESSIONS_KEY]: filtered });
}
