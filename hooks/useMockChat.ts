'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import {
  type ChatMessage,
  type ToneId,
  getMockCheck,
  getMockTranslation,
} from '@/lib/mock';

export interface MessageGroup {
  title: string;
  messages: ChatMessage[];
  collapsed: boolean;
}

function groupByDate(messages: ChatMessage[], collapsed: Record<string, boolean>): MessageGroup[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());

  const sorted = [...messages].sort((a, b) => a.timestamp - b.timestamp);
  const groups: MessageGroup[] = [];
  let current: MessageGroup | null = null;

  for (const msg of sorted) {
    const d = new Date(msg.timestamp);
    d.setHours(0, 0, 0, 0);
    let title = 'Older';
    if (d.getTime() === today.getTime()) title = 'Today';
    else if (d.getTime() === yesterday.getTime()) title = 'Yesterday';
    else if (d >= weekStart) title = 'This Week';

    if (!current || current.title !== title) {
      current = { title, messages: [], collapsed: collapsed[title] ?? false };
      groups.push(current);
    }
    current.messages.push(msg);
  }
  return groups;
}

const TYPE_DELAY_MS = 18; // per-character typewriter cadence
const THINK_MS = 600; // initial fake "thinking" pause

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export function useMockChat(seed: ChatMessage[]) {
  const [messages, setMessages] = useState<ChatMessage[]>(seed);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);
  const idRef = useRef(0);

  const newId = () => `m_${Date.now()}_${idRef.current++}`;

  const groupedMessages = useMemo(
    () => groupByDate(messages, collapsed),
    [messages, collapsed],
  );

  const update = useCallback((id: string, patch: Partial<ChatMessage>) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }, []);

  // Shared send routine for both translate + check modes.
  const send = useCallback(
    async (text: string, tone: ToneId, mode: 'translate' | 'check') => {
      const trimmed = text.trim();
      if (!trimmed || isLoading) return;
      setIsLoading(true);

      const userMsg: ChatMessage = {
        id: newId(),
        role: 'user',
        text: trimmed,
        tone,
        kind: mode === 'check' ? 'check' : 'translation',
        timestamp: Date.now(),
      };
      const assistantId = newId();
      const assistantMsg: ChatMessage = {
        id: assistantId,
        role: 'assistant',
        text: '',
        tone,
        kind: mode === 'check' ? 'check' : 'translation',
        timestamp: Date.now() + 1,
        isStreaming: true,
      };
      setMessages((prev) => [...prev, userMsg, assistantMsg]);

      await sleep(THINK_MS);

      let fullText: string;
      let explanation = '';
      if (mode === 'check') {
        const c = getMockCheck();
        fullText = `${c.verdict}\n${c.body}`;
      } else {
        const r = getMockTranslation(trimmed, tone);
        fullText = r.translation;
        explanation = r.explanation;
      }

      // Typewriter stream the main text.
      let shown = '';
      for (const ch of fullText) {
        shown += ch;
        update(assistantId, { text: shown });
        await sleep(TYPE_DELAY_MS);
      }

      update(assistantId, { text: fullText, explanation, isStreaming: false });
      setIsLoading(false);
    },
    [isLoading, update],
  );

  const toggleGroup = useCallback((title: string) => {
    setCollapsed((prev) => ({ ...prev, [title]: !prev[title] }));
  }, []);

  const deleteMessage = useCallback((id: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const clearHistory = useCallback(() => setMessages([]), []);

  return {
    messages,
    groupedMessages,
    isLoading,
    send,
    toggleGroup,
    deleteMessage,
    clearHistory,
  };
}
