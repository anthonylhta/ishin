'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  tone?: string;
  explanation?: string;
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
  
  const collapsedStates = JSON.parse(localStorage.getItem('collapsed_groups') || '{}');
  
  return groups.map(group => ({
    ...group,
    collapsed: collapsedStates[group.title] || false,
  }));
}

export function useCloudStorage() {
  const { user, isSignedIn } = useUser();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [groupedMessages, setGroupedMessages] = useState<ReturnType<typeof groupMessagesByDate>>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load messages from API
  const loadMessages = useCallback(async () => {
    if (!isSignedIn) return;
    
    setIsLoading(true);
    const response = await fetch('/api/translations');
    const result = await response.json();
    
    if (result.success && result.data) {
      const loadedMessages: ChatMessage[] = [];
      result.data.forEach((record: any) => {
        loadedMessages.push({
          id: `${record.id}_user`,
          role: 'user',
          text: record.user_text,
          tone: record.tone,
          timestamp: new Date(record.created_at).getTime(),
        });
        loadedMessages.push({
          id: `${record.id}_assistant`,
          role: 'assistant',
          text: record.assistant_text,
          tone: record.tone,
          explanation: record.explanation,
          timestamp: new Date(record.created_at).getTime() + 1,
        });
      });
      setMessages(loadedMessages);
      setGroupedMessages(groupMessagesByDate(loadedMessages));
    }
    setIsLoading(false);
  }, [isSignedIn]);

  // Auto-load when user signs in; sync user row in parallel
  useEffect(() => {
    if (isSignedIn) {
      fetch('/api/user/sync', { method: 'POST' }).catch(console.error);
      loadMessages();
    } else {
      setMessages([]);
      setGroupedMessages([]);
      setIsLoading(false);
    }
  }, [isSignedIn, loadMessages]);

  const addUserMessage = useCallback((text: string, tone: string) => {
    const newMessage: ChatMessage = {
      id: `temp_${Date.now()}`,
      role: 'user',
      text,
      tone,
      timestamp: Date.now(),
    };
    
    setMessages(prev => {
      const updated = [...prev, newMessage];
      setGroupedMessages(groupMessagesByDate(updated));
      return updated;
    });
    
    return newMessage;
  }, []);

  const addAssistantMessage = useCallback(async (text: string, tone: string, explanation: string, userText: string) => {
    // Guest (not signed in): keep the exchange in memory only, persist nothing.
    if (!isSignedIn) {
      setMessages(prev => {
        const assistantMessage: ChatMessage = {
          id: `guest_${Date.now()}_assistant`,
          role: 'assistant',
          text,
          tone,
          explanation,
          timestamp: Date.now() + 1,
        };
        const updated = [...prev, assistantMessage];
        setGroupedMessages(groupMessagesByDate(updated));
        return updated;
      });
      return;
    }
    
    const response = await fetch('/api/translations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userText,
        assistantText: text,
        tone,
        explanation,
      }),
    });
    
    const result = await response.json();
    
    if (result.success) {
      setMessages(prev => {
        // Remove temp user message
        const withoutTemp = prev.filter(m => 
          !(m.role === 'user' && m.text === userText && m.tone === tone && m.id.startsWith('temp_'))
        );
        
        // Add real messages
        const realUserMessage: ChatMessage = {
          id: `${result.data.id}_user`,
          role: 'user',
          text: userText,
          tone,
          timestamp: Date.now(),
        };
        
        const assistantMessage: ChatMessage = {
          id: `${result.data.id}_assistant`,
          role: 'assistant',
          text,
          tone,
          explanation,
          timestamp: Date.now() + 1,
        };
        
        const updated = [...withoutTemp, realUserMessage, assistantMessage];
        setGroupedMessages(groupMessagesByDate(updated));
        return updated;
      });
    }
  }, [isSignedIn]);

  const clearHistory = useCallback(async () => {
    if (!isSignedIn) {
      setMessages([]);
      setGroupedMessages([]);
      return;
    }
    
    const response = await fetch('/api/translations', { method: 'DELETE' });
    const result = await response.json();
    
    if (result.success) {
      setMessages([]);
      setGroupedMessages([]);
    }
  }, [isSignedIn]);

  const deleteMessage = useCallback(async (id: string) => {
    // Guest: just drop it from in-memory state.
    if (!isSignedIn) {
      setMessages(prev => {
        const updated = prev.filter(m => m.id !== id);
        setGroupedMessages(groupMessagesByDate(updated));
        return updated;
      });
      return;
    }

    const dbId = id.split('_')[0];
    
    const response = await fetch(`/api/translations?id=${dbId}`, { method: 'DELETE' });
    const result = await response.json();
    
    if (result.success) {
      setMessages(prev => {
        const updated = prev.filter(m => !m.id.startsWith(dbId));
        setGroupedMessages(groupMessagesByDate(updated));
        return updated;
      });
    }
  }, [isSignedIn]);

  const addStreamingMessage = useCallback((tone: string): string => {
    const id = `streaming_${Date.now()}`;
    const msg: ChatMessage = {
      id,
      role: 'assistant',
      text: '',
      tone,
      timestamp: Date.now() + 1,
      isStreaming: true,
    };
    setMessages(prev => {
      const updated = [...prev, msg];
      setGroupedMessages(groupMessagesByDate(updated));
      return updated;
    });
    return id;
  }, []);

  const updateStreamingMessage = useCallback((id: string, text: string) => {
    setMessages(prev => {
      const updated = prev.map(m => (m.id === id ? { ...m, text } : m));
      setGroupedMessages(groupMessagesByDate(updated));
      return updated;
    });
  }, []);

  const removeStreamingMessage = useCallback((id: string) => {
    setMessages(prev => {
      const updated = prev.filter(m => m.id !== id);
      setGroupedMessages(groupMessagesByDate(updated));
      return updated;
    });
  }, []);

  const toggleGroup = useCallback((groupTitle: string) => {
    const collapsedStates = JSON.parse(localStorage.getItem('collapsed_groups') || '{}');
    collapsedStates[groupTitle] = !collapsedStates[groupTitle];
    localStorage.setItem('collapsed_groups', JSON.stringify(collapsedStates));
    setGroupedMessages(prev => 
      prev.map(group => 
        group.title === groupTitle 
          ? { ...group, collapsed: !group.collapsed }
          : group
      )
    );
  }, []);

  return {
    messages,
    groupedMessages,
    isLoading,
    addUserMessage,
    addAssistantMessage,
    addStreamingMessage,
    updateStreamingMessage,
    removeStreamingMessage,
    clearHistory,
    deleteMessage,
    toggleGroup,
    isSignedIn,
  };
}