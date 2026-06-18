'use client';

import { memo, useState } from 'react';
import { ChatMessage as ChatMessageType } from '@/hooks/useCloudStorage';
import { CopyIcon, CheckIcon, TrashIcon, LightbulbIcon } from '@/components/Icons';

interface Props {
  message: ChatMessageType;
  onDelete?: (id: string) => void;
}

// A bare icon button for the action row — subtle by default (works on touch,
// no hover required), brightening on hover; gold when "active" (copied).
function IconButton({ onClick, label, active, children }: {
  onClick: () => void;
  label: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      aria-label={label}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: hover ? 'var(--surface-elevated)' : 'transparent',
        border: 'none',
        cursor: 'pointer',
        padding: '5px',
        borderRadius: '7px',
        display: 'inline-flex',
        alignItems: 'center',
        color: active ? 'var(--accent-gold)' : hover ? 'var(--text-secondary)' : 'var(--text-tertiary)',
        transition: 'color 0.15s, background 0.15s',
      }}
    >
      {children}
    </button>
  );
}

// Memoized: during streaming every token rebuilds the messages array, but only
// the live bubble's message object changes identity — the rest of the history
// must not re-render per token. onDelete takes the id so parents can pass one
// stable callback instead of a per-message closure (which would defeat memo).
function ChatMessage({ message, onDelete }: Props) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';
  const isCheck = message.kind === 'check';
  const timestamp = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  // Split check results into verdict line + body — applied during and after streaming
  // so formatting is visible from the first character, with no layout snap on completion.
  let verdictLine = '';
  let checkBody = '';
  if (isCheck && !isUser) {
    const nlIdx = message.text.indexOf('\n');
    if (nlIdx > 0) {
      verdictLine = message.text.slice(0, nlIdx).trim();
      checkBody = message.text.slice(nlIdx + 1).trim();
    } else {
      verdictLine = message.text.trim();
    }
  }
  const isNatural = verdictLine.startsWith('✓');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be unavailable (permissions, unfocused document) —
      // leave the button as "Copy" instead of falsely confirming.
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        marginBottom: '16px',
        width: '100%',
      }}
    >
      <div
        className="msg-row"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: isUser ? 'flex-end' : 'flex-start',
          maxWidth: '80%',
        }}
      >
      <div
        style={{
          maxWidth: '100%',
          background: isUser ? 'var(--accent-red)' : 'var(--surface-elevated)',
          border: isUser ? 'none' : '1px solid var(--border)',
          borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
          padding: '12px 16px',
        }}
      >
        {/* Header with tone/kind and time */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '6px',
            gap: '12px',
            fontSize: '11px',
            color: 'var(--text-secondary)',
          }}
        >
          {message.tone && (
            <span style={{ textTransform: 'uppercase', fontWeight: 600 }}>
              {isCheck ? `確 ${message.tone}` : message.tone}
            </span>
          )}
          <span>{timestamp}</span>
        </div>

        {/* Message text */}
        {isCheck && !isUser ? (
          <>
            {verdictLine ? (
              <div style={{
                fontSize: '15px',
                fontWeight: 600,
                fontFamily: 'var(--font-sans)',
                color: isNatural ? 'var(--accent-gold)' : 'var(--text-primary)',
                marginBottom: checkBody ? '8px' : 0,
              }}>
                {verdictLine}
                {message.isStreaming && !checkBody && <span className="streaming-cursor" />}
              </div>
            ) : message.isStreaming ? (
              <span className="streaming-cursor" />
            ) : null}
            {checkBody && (
              <div style={{ fontSize: '13px', fontFamily: 'var(--font-sans)', lineHeight: 1.6, color: 'var(--text-body)', wordBreak: 'break-word' }}>
                {checkBody}
                {message.isStreaming && <span className="streaming-cursor" />}
              </div>
            )}
          </>
        ) : (
          <div
            style={{
              fontSize: isUser ? '14px' : '16px',
              fontFamily: isUser ? 'var(--font-sans)' : 'var(--font-serif)',
              lineHeight: 1.55,
              color: 'var(--text-primary)',
              wordBreak: 'break-word',
            }}
          >
            {message.text}
            {message.isStreaming && (
              <span className="streaming-cursor" />
            )}
          </div>
        )}

        {/* Explanation for assistant */}
        {!isUser && message.explanation && (
          <div
            style={{
              fontSize: '13px',
              lineHeight: 1.5,
              color: 'var(--text-body)',
              marginTop: '10px',
              paddingTop: '10px',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              gap: '6px',
            }}
          >
            <span style={{ flexShrink: 0, marginTop: '1px', color: 'var(--accent-gold)' }}><LightbulbIcon size={14} /></span>
            <span>{message.explanation}</span>
          </div>
        )}

      </div>

      {/* Action row — a bare icon row BELOW the bubble (not inside it), aligned
          to the message's side. Hidden while streaming. */}
      {!message.isStreaming && (!isUser || onDelete) && (
        <div className="msg-actions" style={{ display: 'flex', gap: '2px', marginTop: '4px', padding: '0 2px' }}>
          {!isUser && (
            <IconButton onClick={handleCopy} label={copied ? 'Copied' : 'Copy'} active={copied}>
              {copied ? <CheckIcon /> : <CopyIcon />}
            </IconButton>
          )}
          {onDelete && (
            <IconButton onClick={() => onDelete(message.id)} label="Delete">
              <TrashIcon />
            </IconButton>
          )}
        </div>
      )}
      </div>
    </div>
  );
}

export default memo(ChatMessage);