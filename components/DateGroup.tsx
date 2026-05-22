'use client';

import { useState } from 'react';
import ChatMessage from './ChatMessage';
import { ChatMessage as ChatMessageType } from '@/hooks/useCloudStorage';

interface Props {
  title: string;
  messages: ChatMessageType[];
  collapsed: boolean;
  onToggle: () => void;
  onDeleteMessage: (id: string) => void;
}

export default function DateGroup({ title, messages, collapsed, onToggle, onDeleteMessage }: Props) {
  const messageCount = messages.length;
  
  // Count pairs (user + assistant) for display
  const pairCount = Math.ceil(messageCount / 2);
  
  return (
    <div style={{ marginBottom: '1.5rem' }}>
      {/* Group Header */}
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(26, 25, 23, 0.5)',
          backdropFilter: 'blur(4px)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '0.75rem 1rem',
          cursor: 'pointer',
          transition: 'all 0.2s',
          marginBottom: collapsed ? 0 : '1rem',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(26, 25, 23, 0.8)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(26, 25, 23, 0.5)';
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
          <span style={{ fontFamily: 'var(--font-serif)', fontSize: '0.875rem', fontWeight: 600 }}>
            {title}
          </span>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
            {pairCount} {pairCount === 1 ? 'translation' : 'translations'}
          </span>
        </div>
        <span style={{ fontSize: '1rem', color: 'var(--text-tertiary)' }}>
          {collapsed ? '▼' : '▲'}
        </span>
      </button>
      
      {/* Messages */}
      {!collapsed && (
        <div style={{ paddingLeft: '0.5rem' }}>
          {messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message}
              onDelete={() => onDeleteMessage(message.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}