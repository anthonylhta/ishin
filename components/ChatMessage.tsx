'use client';

import { useState } from 'react';
import { ChatMessage as ChatMessageType } from '@/hooks/useCloudStorage';

interface Props {
  message: ChatMessageType;
  onDelete?: () => void;
}

export default function ChatMessage({ message, onDelete }: Props) {
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

  const handleCopy = () => {
    navigator.clipboard.writeText(message.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
        style={{
          maxWidth: '80%',
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
              <div style={{ fontSize: '13px', fontFamily: 'var(--font-sans)', lineHeight: 1.6, color: 'var(--text-secondary)', wordBreak: 'break-word' }}>
                {checkBody}
                {message.isStreaming && <span className="streaming-cursor" />}
              </div>
            )}
          </>
        ) : (
          <div
            style={{
              fontSize: isUser ? '14px' : '18px',
              fontFamily: isUser ? 'var(--font-sans)' : 'var(--font-serif)',
              lineHeight: 1.5,
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
              fontSize: '11px',
              color: 'var(--text-secondary)',
              marginTop: '10px',
              paddingTop: '10px',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              gap: '6px',
            }}
          >
            <span>💡</span>
            <span>{message.explanation}</span>
          </div>
        )}

        {/* Action buttons — hidden while streaming */}
        {!message.isStreaming && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '8px',
              marginTop: '8px',
            }}
          >
            {!isUser && (
              <button
                onClick={handleCopy}
                style={{
                  background: 'none',
                  border: 'none',
                  color: copied ? 'var(--accent-gold)' : 'var(--text-tertiary)',
                  cursor: 'pointer',
                  fontSize: '11px',
                  padding: '4px 8px',
                  borderRadius: '4px',
                }}
              >
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-tertiary)',
                  cursor: 'pointer',
                  fontSize: '11px',
                  padding: '4px 8px',
                  borderRadius: '4px',
                }}
              >
                ✕
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}