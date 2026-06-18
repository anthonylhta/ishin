'use client';

import { memo, useState } from 'react';
import { ChatMessage as ChatMessageType } from '@/hooks/useCloudStorage';
import { CopyIcon, CheckIcon, TrashIcon, LightbulbIcon } from '@/components/Icons';

interface Props {
  message: ChatMessageType;
  onDelete?: (id: string) => void;
}

// Hiragana, katakana, CJK kanji, half-width katakana — used to pick the serif
// (for Japanese) vs sans, and to infer translation direction from the output.
const JP_RE = /[぀-ヿ㐀-鿿ｦ-ﾟ]/;

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

// v2 layout: an exchange is an INPUT (the user's text — a small, content-hugging
// box on the right, no red) followed by the OUTPUT (the translation — open on the
// canvas, no bubble, the hero). They render as separate messages; the visual
// pairing comes from the spacing (tight under the input, loose after the output).
function ChatMessage({ message, onDelete }: Props) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';
  const isCheck = message.kind === 'check';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be unavailable (permissions, unfocused document) —
      // leave the icon as "copy" instead of falsely confirming.
    }
  };

  // ---- INPUT (user): contained, content-hugging, right-aligned, no red ----
  if (isUser) {
    const ja = JP_RE.test(message.text);
    return (
      <div className="msg-row" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginBottom: '18px' }}>
        <div style={{
          maxWidth: '72%',
          background: 'var(--surface)',
          borderRadius: '16px 16px 5px 16px',
          padding: '11px 16px',
          color: 'var(--text-body)',
          fontSize: ja ? '16px' : '14px',
          fontFamily: ja ? 'var(--font-serif)' : 'var(--font-sans)',
          lineHeight: 1.5,
          wordBreak: 'break-word',
        }}>
          {message.text}
        </div>
        {onDelete && (
          <div className="msg-actions" style={{ display: 'flex', marginTop: '4px' }}>
            <IconButton onClick={() => onDelete(message.id)} label="Delete"><TrashIcon /></IconButton>
          </div>
        )}
      </div>
    );
  }

  // ---- OUTPUT (assistant): open on the canvas, byline → hero → thought ----
  const time = new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const outJa = JP_RE.test(message.text);
  const label = isCheck
    ? 'Check'
    : message.tone
      ? message.tone.charAt(0).toUpperCase() + message.tone.slice(1)
      : 'Translation';
  // Only surface direction for the less-obvious case (output is English → JP→EN).
  const direction = !isCheck && message.text.trim() && !outJa ? 'JP → EN' : '';

  // Check results split on the first newline: verdict line + body.
  let verdictLine = '';
  let checkBody = '';
  if (isCheck) {
    const nl = message.text.indexOf('\n');
    if (nl > 0) {
      verdictLine = message.text.slice(0, nl).trim();
      checkBody = message.text.slice(nl + 1).trim();
    } else {
      verdictLine = message.text.trim();
    }
  }
  const isNatural = verdictLine.startsWith('✓');

  return (
    <div className="msg-row" style={{ marginBottom: '40px' }}>
      {/* Byline — quiet gold meta line above the output */}
      <div style={{
        fontSize: '10px',
        letterSpacing: '1.4px',
        textTransform: 'uppercase',
        color: 'var(--accent-gold)',
        opacity: 0.85,
        marginBottom: '9px',
      }}>
        {label} · {time}{direction ? ` · ${direction}` : ''}
      </div>

      {/* Output */}
      {isCheck ? (
        <>
          {verdictLine ? (
            <div style={{
              fontSize: '15px',
              fontWeight: 600,
              color: isNatural ? 'var(--accent-gold)' : 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              {verdictLine}
              {message.isStreaming && !checkBody && <span className="streaming-cursor" />}
            </div>
          ) : message.isStreaming ? (
            <span className="streaming-cursor" />
          ) : null}
          {checkBody && (
            <div style={{ fontSize: '13px', color: 'var(--text-body)', lineHeight: 1.65, marginTop: '9px', maxWidth: '90%', wordBreak: 'break-word' }}>
              {checkBody}
              {message.isStreaming && <span className="streaming-cursor" />}
            </div>
          )}
        </>
      ) : (
        <div style={{
          fontFamily: outJa ? 'var(--font-serif)' : 'var(--font-sans)',
          fontSize: outJa ? '21px' : '19px',
          color: 'var(--text-primary)',
          lineHeight: 1.55,
          wordBreak: 'break-word',
        }}>
          {message.text}
          {message.isStreaming && <span className="streaming-cursor" />}
        </div>
      )}

      {/* Thought — the explanation, as a quiet aside */}
      {!isCheck && message.explanation && (
        <div style={{ display: 'flex', gap: '8px', marginTop: '13px', fontSize: '13px', color: 'var(--text-body)', lineHeight: 1.65, maxWidth: '90%' }}>
          <span style={{ flexShrink: 0, marginTop: '2px', color: 'var(--accent-gold)', opacity: 0.8 }}><LightbulbIcon size={14} /></span>
          <span>{message.explanation}</span>
        </div>
      )}

      {/* Hover actions */}
      {!message.isStreaming && (
        <div className="msg-actions" style={{ display: 'flex', gap: '2px', marginTop: '10px' }}>
          <IconButton onClick={handleCopy} label={copied ? 'Copied' : 'Copy'} active={copied}>
            {copied ? <CheckIcon /> : <CopyIcon />}
          </IconButton>
          {onDelete && (
            <IconButton onClick={() => onDelete(message.id)} label="Delete"><TrashIcon /></IconButton>
          )}
        </div>
      )}
    </div>
  );
}

export default memo(ChatMessage);
