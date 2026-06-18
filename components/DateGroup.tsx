'use client';

import ChatMessage from './ChatMessage';
import { ChevronIcon } from './Icons';
import { ChatMessage as ChatMessageType } from '@/hooks/useCloudStorage';

interface Props {
  id?: string;
  title: string;
  messages: ChatMessageType[];
  collapsed: boolean;
  onToggle: () => void;
  onDeleteMessage: (id: string) => void;
}

export default function DateGroup({ id, title, messages, collapsed, onToggle, onDeleteMessage }: Props) {
  return (
    <div id={id} style={{ marginBottom: collapsed ? '20px' : 0 }}>
      {/* Quiet centered date divider — recedes as chrome, not content. Clickable
          to collapse; the chevron is the only affordance. No box, no border. */}
      <button
        onClick={onToggle}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          margin: '12px auto 24px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--text-tertiary)',
          fontSize: '11px',
          letterSpacing: '2px',
          textTransform: 'uppercase',
          transition: 'color 0.15s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-tertiary)'; }}
      >
        {title}
        <span style={{
          display: 'inline-flex',
          opacity: 0.7,
          transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)',
          transition: 'transform 0.2s',
        }}>
          <ChevronIcon size={13} />
        </span>
      </button>

      {!collapsed && (
        <div>
          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} onDelete={onDeleteMessage} />
          ))}
        </div>
      )}
    </div>
  );
}
