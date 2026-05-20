/**
 * RoleCuratorModal — chat-style assistant for defining a role.
 *
 * Triggered from CreateInterview Step 0. Recruiter types a rough role
 * idea; the agent asks 2-3 clarifying questions; then proposes a
 * title + description + notes block. When the recruiter accepts the
 * proposal, onAccept fires with the proposed fields and the modal closes.
 */
import React, { useEffect, useRef, useState } from "react";
import { X, Sparkles, Send, Loader2, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  streamRoleCuratorChat,
  type RoleCuratorMessage,
  type RoleCuratorProposal,
} from "@/services/roleCuratorApi";

interface RoleCuratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: (proposal: RoleCuratorProposal) => void;
}

export const RoleCuratorModal: React.FC<RoleCuratorModalProps> = ({
  isOpen,
  onClose,
  onAccept,
}) => {
  const [messages, setMessages] = useState<RoleCuratorMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [pendingAssistantText, setPendingAssistantText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [proposal, setProposal] = useState<RoleCuratorProposal | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Reset when modal closes.
  useEffect(() => {
    if (isOpen) return;
    abortRef.current?.abort();
    setMessages([]);
    setDraft("");
    setStreaming(false);
    setPendingAssistantText("");
    setError(null);
    setProposal(null);
  }, [isOpen]);

  // Auto-scroll to bottom on new chunk.
  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, pendingAssistantText]);

  if (!isOpen) return null;

  const submit = async () => {
    const text = draft.trim();
    if (!text || streaming) return;
    const nextMessages: RoleCuratorMessage[] = [
      ...messages,
      { role: "user", content: text },
    ];
    setMessages(nextMessages);
    setDraft("");
    setPendingAssistantText("");
    setError(null);
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    let accumulated = "";
    let finalText = "";
    let receivedProposal: RoleCuratorProposal | null = null;

    try {
      await streamRoleCuratorChat(
        nextMessages,
        {
          onToken: (chunk) => {
            accumulated += chunk;
            setPendingAssistantText(accumulated);
          },
          onComplete: (text) => {
            finalText = text;
          },
          onProposal: (p) => {
            receivedProposal = p;
          },
          onError: (msg) => {
            setError(msg);
          },
        },
        controller.signal,
      );

      // After the stream completes, commit the assistant message to history.
      const visibleText = (finalText || accumulated).trim();
      if (visibleText) {
        setMessages((prev) => [...prev, { role: "assistant", content: visibleText }]);
      }
      setPendingAssistantText("");
      if (receivedProposal) {
        setProposal(receivedProposal);
      }
    } catch (err) {
      if ((err as any)?.name !== "AbortError") {
        setError((err as Error)?.message || "Curator stream failed.");
      }
    } finally {
      setStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/70 backdrop-blur-xs"
      onClick={() => !streaming && onClose()}
    >
      <div
        className="bg-paper rounded-xl shadow-3 w-full max-w-[720px] max-h-[85vh] overflow-hidden flex flex-col border-2 border-rule"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between px-6 py-4 border-b-2 border-rule bg-paper-2">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-gold-ink" />
              <h2 className="text-base font-semibold text-ink">Role curator</h2>
            </div>
            <p className="text-xs text-muted mt-0.5">
              Describe the role; I'll ask a couple of questions and draft the brief.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={streaming}
            aria-label="Close"
            className="p-2 hover:bg-paper-3 rounded transition-colors disabled:opacity-30"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {/* Transcript */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-auto px-6 py-4 space-y-3"
        >
          {messages.length === 0 && !streaming && (
            <div className="text-center py-12 text-xs text-muted max-w-md mx-auto">
              <p className="mb-2">
                Try something like:
              </p>
              <p className="font-mono text-ink-soft text-[11px]">
                "I need a Senior Direct Tax Manager, 5-8 yrs, MNC background, scrutiny experience"
              </p>
            </div>
          )}
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={cn(
                "flex",
                m.role === "user" ? "justify-end" : "justify-start",
              )}
            >
              <div
                className={cn(
                  "rounded-lg px-3 py-2 text-sm max-w-[85%] whitespace-pre-wrap",
                  m.role === "user"
                    ? "bg-ink text-paper"
                    : "bg-paper-2 text-ink border border-rule",
                )}
              >
                {m.content}
              </div>
            </div>
          ))}
          {pendingAssistantText && (
            <div className="flex justify-start">
              <div className="rounded-lg px-3 py-2 text-sm max-w-[85%] whitespace-pre-wrap bg-paper-2 text-ink border border-rule">
                {pendingAssistantText}
                <span className="inline-block animate-pulse text-muted ml-1">▍</span>
              </div>
            </div>
          )}
          {error && (
            <div className="text-xs text-danger bg-danger-soft p-2 rounded">
              {error}
            </div>
          )}
          {proposal && (
            <div className="rounded-lg border-2 border-gold bg-gold-soft p-4 mt-2">
              <div className="flex items-center gap-2 mb-2">
                <Wand2 className="h-4 w-4 text-gold-ink" />
                <span className="text-xs font-mono uppercase tracking-wider text-gold-ink">
                  Proposed draft
                </span>
              </div>
              {proposal.title && (
                <div className="mb-2">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-muted mb-0.5">
                    Title
                  </div>
                  <div className="text-sm font-semibold text-ink">{proposal.title}</div>
                </div>
              )}
              {proposal.description && (
                <div className="mb-2">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-muted mb-0.5">
                    Description
                  </div>
                  <div className="text-xs text-ink whitespace-pre-wrap">
                    {proposal.description}
                  </div>
                </div>
              )}
              {proposal.notes && (
                <div className="mb-3">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-muted mb-0.5">
                    Refinement notes
                  </div>
                  <div className="text-xs text-ink whitespace-pre-wrap">
                    {proposal.notes}
                  </div>
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setProposal(null)}
                  disabled={streaming}
                >
                  Keep refining
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="gold"
                  onClick={() => {
                    onAccept(proposal);
                    onClose();
                  }}
                  disabled={streaming}
                >
                  Use this draft
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <footer className="border-t-2 border-rule bg-paper-2 px-4 py-3">
          <div className="flex gap-2 items-end">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                messages.length === 0
                  ? "Describe the role…"
                  : "Reply or ask for changes…"
              }
              rows={2}
              disabled={streaming}
              className="resize-none text-sm flex-1"
            />
            <Button
              type="button"
              size="sm"
              variant="default"
              onClick={submit}
              disabled={!draft.trim() || streaming}
              className="h-10"
            >
              {streaming ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-[10px] text-muted mt-1.5">
            Enter to send, Shift+Enter for newline.
          </p>
        </footer>
      </div>
    </div>
  );
};
