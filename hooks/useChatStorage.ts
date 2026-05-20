'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  tone?: string;
  explanation?: string;
  timestamp: number;
}

const STORAGE_KEY = 'chat_messages';

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
  
  const collapsedStates = JSON.parse(localStorage.getItem('collapsed_groups') || '{}');
  
  return groups.map(group => ({
    ...group,
    collapsed: collapsedStates[group.title] || false,
  }));
}

export function useChatStorage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [groupedMessages, setGroupedMessages] = useState<ReturnType<typeof groupMessagesByDate>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const messagesRef = useRef<ChatMessage[]>([]);

  // Keep ref in sync
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Load messages from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      setMessages(parsed);
      setGroupedMessages(groupMessagesByDate(parsed));
    }
    setIsLoading(false);
  }, []);

  // Update grouped messages whenever messages change
  useEffect(() => {
    if (!isLoading) {
      setGroupedMessages(groupMessagesByDate(messages));
    }
  }, [messages, isLoading]);

  // Save messages to localStorage
  const saveMessages = useCallback((newMessages: ChatMessage[]) => {
    setMessages(newMessages);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newMessages));
  }, []);

  const toggleGroup = useCallback((groupTitle: string) => {
    const collapsedStates = JSON.parse(localStorage.getItem('collapsed_groups') || '{}');
    collapsedStates[groupTitle] = !collapsedStates[groupTitle];
    localStorage.setItem('collapsed_groups', JSON.stringify(collapsedStates));
    setGroupedMessages(groupMessagesByDate(messagesRef.current));
  }, []);

  // Add user message - uses functional update to avoid stale state
  const addUserMessage = useCallback((text: string, tone: string) => {
    const newMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      text,
      tone,
      timestamp: Date.now(),
    };
    
    setMessages(prev => {
      const updated = [...prev, newMessage];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Add assistant message - uses functional update
  const addAssistantMessage = useCallback((text: string, tone: string, explanation: string) => {
    const newMessage: ChatMessage = {
      id: `assistant_${Date.now()}`,
      role: 'assistant',
      text,
      tone,
      explanation,
      timestamp: Date.now(),
    };
    
    setMessages(prev => {
      const updated = [...prev, newMessage];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const clearHistory = useCallback(() => {
    if (confirm('Delete all translation history? This cannot be undone.')) {
      setMessages([]);
      localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
      localStorage.removeItem('collapsed_groups');
    }
  }, []);

  const deleteMessage = useCallback((id: string) => {
    setMessages(prev => {
      const updated = prev.filter(m => m.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  return {
    messages,
    groupedMessages,
    isLoading,
    addUserMessage,
    addAssistantMessage,
    clearHistory,
    deleteMessage,
    toggleGroup,
  };
}