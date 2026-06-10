'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useUser } from '@clerk/nextjs';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  tone?: string;
  explanation?: string;
  kind?: 'translation' | 'check';
  timestamp: number;
  isStreaming?: boolean;
}

export function groupMessagesByDate(messages: ChatMessage[]) {
  const groups: { title: string; messages: ChatMessage[]; collapsed?: boolean }[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const thisWeekStart = new Date(today);
  thisWeekStart.setDate(today.getDate() - today.getDay());

  let currentGroup: { title: string; messages: ChatMessage[] } | null = null;

  const sorted = [...messages].sort((a, b) => a.timestamp - b.timestamp);

  for (const msg of sorted) {
    const msgDate = new Date(msg.timestamp);
    msgDate.setHours(0, 0, 0, 0);

    let groupTitle = '';

    if (msgDate.getTime() === today.getTime()) {
      groupTitle = 'Today';
    } else if (msgDate.getTime() === yesterday.getTime()) {
      groupTitle = 'Yesterday';
    } else if (msgDate >= thisWeekStart) {
      groupTitle = 'This Week';
    } else {
      groupTitle = 'Older';
    }

    if (!currentGroup || currentGroup.title !== groupTitle) {
      if (currentGroup) groups.push(currentGroup);
      currentGroup = { title: groupTitle, messages: [] };
    }
    currentGroup.messages.push(msg);
  }

  if (currentGroup) groups.push(currentGroup);

  // Guard localStorage access for SSR
  const collapsedStates: Record<string, boolean> =
    typeof window !== 'undefined'
      ? JSON.parse(localStorage.getItem('collapsed_groups') || '{}')
      : {};

  return groups.map(group => ({
    ...group,
    collapsed: collapsedStates[group.title] || false,
  }));
}

export function useCloudStorage() {
  const { isSignedIn } = useUser();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // Bumped on every toggleGroup to invalidate the useMemo below without changing messages.
  const [collapsedVersion, setCollapsedVersion] = useState(0);

  // Derived — recomputed whenever messages or collapsed state changes.
  // Reading localStorage here (outside a setState updater) is safe and pure enough for useMemo.
  const groupedMessages = useMemo(
    () => groupMessagesByDate(messages),
    [messages, collapsedVersion], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const loadMessages = useCallback(async () => {
    if (!isSignedIn) return;
    setIsLoading(true);
    try {
      const response = await fetch('/api/translations');
      const result = await response.json();
      if (result.success && result.data) {
        const loadedMessages: ChatMessage[] = [];
        result.data.forEach((record: { id: string; user_text: string; assistant_text: string; tone: string; explanation: string; created_at: string; message_type?: string }) => {
          const kind: 'translation' | 'check' = record.message_type === 'check' ? 'check' : 'translation';
          loadedMessages.push({
            id: `${record.id}_user`,
            role: 'user',
            text: record.user_text,
            tone: record.tone,
            kind,
            timestamp: new Date(record.created_at).getTime(),
          });
          loadedMessages.push({
            id: `${record.id}_assistant`,
            role: 'assistant',
            text: record.assistant_text,
            tone: record.tone,
            explanation: record.explanation,
            kind,
            timestamp: new Date(record.created_at).getTime() + 1,
          });
        });
        setMessages(loadedMessages);
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isSignedIn]);

  // Auto-load when user signs in; sync user row in parallel.
  useEffect(() => {
    if (isSignedIn) {
      fetch('/api/user/sync', { method: 'POST' }).catch(console.error);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadMessages();
    } else {
      setMessages([]);
      setIsLoading(false);
    }
  }, [isSignedIn, loadMessages]);

  const addUserMessage = useCallback((text: string, tone: string, kind: 'translation' | 'check' = 'translation') => {
    const newMessage: ChatMessage = {
      id: `temp_${Date.now()}`,
      role: 'user',
      text,
      tone,
      kind,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, newMessage]);
    return newMessage;
  }, []);

  const addAssistantMessage = useCallback(async (text: string, tone: string, explanation: string, userText: string) => {
    if (!isSignedIn) {
      setMessages(prev => [...prev, {
        id: `guest_${Date.now()}_assistant`,
        role: 'assistant',
        text,
        tone,
        explanation,
        timestamp: Date.now() + 1,
      }]);
      return;
    }

    const response = await fetch('/api/translations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userText, assistantText: text, tone, explanation }),
    });
    const result = await response.json();
    if (result.success) {
      setMessages(prev => {
        const withoutTemp = prev.filter(m =>
          !(m.role === 'user' && m.text === userText && m.tone === tone && m.id.startsWith('temp_'))
        );
        return [
          ...withoutTemp,
          { id: `${result.data.id}_user`, role: 'user', text: userText, tone, timestamp: Date.now() },
          { id: `${result.data.id}_assistant`, role: 'assistant', text, tone, explanation, timestamp: Date.now() + 1 },
        ];
      });
    }
  }, [isSignedIn]);

  const finalizeStreamingMessage = useCallback(async (
    streamingId: string,
    text: string,
    tone: string,
    explanation: string,
    userText: string,
    kind: 'translation' | 'check' = 'translation',
  ) => {
    // Update the streaming message in-place — no remove+re-add flash
    setMessages(prev => prev.map(m =>
      m.id === streamingId ? { ...m, text, explanation, kind, isStreaming: false } : m
    ));

    if (!isSignedIn) return;

    try {
      const response = await fetch('/api/translations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userText, assistantText: text, tone, explanation, message_type: kind }),
      });
      const result = await response.json();
      if (result.success) {
        setMessages(prev => {
          const tempUser = prev.find(
            m => m.role === 'user' && m.text === userText && m.tone === tone && m.id.startsWith('temp_')
          );
          const userTimestamp = tempUser?.timestamp ?? Date.now();
          const withoutTempUser = prev.filter(m => m !== tempUser);
          const withRealAssistantId = withoutTempUser.map(m =>
            m.id === streamingId ? { ...m, id: `${result.data.id}_assistant` } : m
          );
          return [
            ...withRealAssistantId,
            { id: `${result.data.id}_user`, role: 'user' as const, text: userText, tone, timestamp: userTimestamp },
          ];
        });
      }
    } catch (err) {
      console.error('Failed to save translation:', err);
      // Remove the ghost message — it was never persisted and can't be deleted later
      setMessages(prev => prev.filter(m => m.id !== streamingId));
      throw err;
    }
  }, [isSignedIn]);

  const addStreamingMessage = useCallback((tone: string, kind: 'translation' | 'check' = 'translation'): string => {
    const id = `streaming_${Date.now()}`;
    setMessages(prev => [...prev, {
      id,
      role: 'assistant',
      text: '',
      tone,
      kind,
      timestamp: Date.now() + 1,
      isStreaming: true,
    }]);
    return id;
  }, []);

  const updateStreamingMessage = useCallback((id: string, text: string) => {
    setMessages(prev => prev.map(m => (m.id === id ? { ...m, text } : m)));
  }, []);

  const removeStreamingMessage = useCallback((id: string) => {
    setMessages(prev => prev.filter(m => m.id !== id));
  }, []);

  const toggleGroup = useCallback((groupTitle: string) => {
    const collapsedStates = JSON.parse(localStorage.getItem('collapsed_groups') || '{}');
    collapsedStates[groupTitle] = !collapsedStates[groupTitle];
    localStorage.setItem('collapsed_groups', JSON.stringify(collapsedStates));
    setCollapsedVersion(v => v + 1);
  }, []);

  const clearHistory = useCallback(async () => {
    if (!isSignedIn) {
      setMessages([]);
      return;
    }
    const response = await fetch('/api/translations', { method: 'DELETE' });
    const result = await response.json();
    if (!result.success) throw new Error(result.error || 'Failed to clear history');
    setMessages([]);
  }, [isSignedIn]);

  const deleteMessage = useCallback(async (id: string) => {
    if (!isSignedIn) {
      setMessages(prev => prev.filter(m => m.id !== id));
      return;
    }
    const dbId = id.split('_')[0];
    const response = await fetch(`/api/translations?id=${dbId}`, { method: 'DELETE' });
    const result = await response.json();
    if (!result.success) throw new Error(result.error || 'Failed to delete translation');
    // Match "<dbId>_" exactly — a bare startsWith(dbId) would also catch ids
    // that merely share a prefix (e.g. "1" matching "10_user").
    setMessages(prev => prev.filter(m => !m.id.startsWith(`${dbId}_`)));
  }, [isSignedIn]);

  return {
    messages,
    groupedMessages,
    isLoading,
    addUserMessage,
    addAssistantMessage,
    addStreamingMessage,
    updateStreamingMessage,
    removeStreamingMessage,
    finalizeStreamingMessage,
    clearHistory,
    deleteMessage,
    toggleGroup,
    isSignedIn,
  };
}
