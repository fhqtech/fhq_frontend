/**
 * Role curator SSE consumer.
 *
 * The backend route is POST /api/role-curator/chat with a JSON body
 * containing the message history. It streams Server-Sent Events:
 *   - token: incremental text
 *   - complete: full assistant turn (proposal markers stripped)
 *   - proposal: parsed proposal JSON (title/description/notes)
 *   - error
 *
 * This client uses fetch + ReadableStream rather than EventSource so
 * we can POST a body and forward the auth header.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8082";

export interface RoleCuratorMessage {
  role: "user" | "assistant";
  content: string;
}

export interface RoleCuratorProposal {
  title?: string;
  description?: string;
  notes?: string;
}

export interface RoleCuratorStreamCallbacks {
  onToken?: (chunk: string) => void;
  onComplete?: (text: string) => void;
  onProposal?: (proposal: RoleCuratorProposal) => void;
  onError?: (message: string) => void;
}

export async function streamRoleCuratorChat(
  messages: RoleCuratorMessage[],
  callbacks: RoleCuratorStreamCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  const token = localStorage.getItem("auth_token");
  const response = await fetch(`${API_BASE_URL}/api/role-curator/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ messages }),
    signal,
  });

  if (!response.ok || !response.body) {
    const txt = await response.text().catch(() => "");
    callbacks.onError?.(`Curator request failed: ${response.status} ${txt.slice(0, 200)}`);
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE frames are separated by a blank line (\n\n).
    let frameBoundary = buffer.indexOf("\n\n");
    while (frameBoundary !== -1) {
      const frame = buffer.slice(0, frameBoundary);
      buffer = buffer.slice(frameBoundary + 2);
      frameBoundary = buffer.indexOf("\n\n");

      let eventName = "message";
      let dataStr = "";
      for (const line of frame.split("\n")) {
        if (line.startsWith("event:")) {
          eventName = line.slice(6).trim();
        } else if (line.startsWith("data:")) {
          dataStr += line.slice(5).trim();
        }
      }
      if (!dataStr) continue;

      if (eventName === "token") {
        try {
          const chunk = JSON.parse(dataStr);
          callbacks.onToken?.(typeof chunk === "string" ? chunk : String(chunk));
        } catch {
          callbacks.onToken?.(dataStr);
        }
      } else if (eventName === "complete") {
        try {
          const parsed = JSON.parse(dataStr);
          callbacks.onComplete?.(parsed.text ?? "");
        } catch {
          callbacks.onComplete?.(dataStr);
        }
      } else if (eventName === "proposal") {
        try {
          callbacks.onProposal?.(JSON.parse(dataStr));
        } catch {
          callbacks.onError?.("Couldn't parse proposal payload.");
        }
      } else if (eventName === "error") {
        try {
          const parsed = JSON.parse(dataStr);
          callbacks.onError?.(parsed.message || "Curator error.");
        } catch {
          callbacks.onError?.(dataStr);
        }
      }
    }
  }
}
