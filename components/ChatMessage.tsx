'use client';

import { memo, useState } from 'react';
import { Check, Copy, Lightbulb, X } from 'lucide-react';
import type { ChatMessage as ChatMessageType } from '@/lib/mock';

interface Props {
  message: ChatMessageType;
  onDelete?: (id: string) => void;
}

function ChatMessage({ message, onDelete }: Props) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';
  const isCheck = message.kind === 'check';
  const timestamp = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  // Check results split into a verdict line + body.
  let verdictLine = '';
  let checkBody = '';
  if (isCheck && !isUser) {
    const nl = message.text.indexOf('\n');
    if (nl > 0) {
      verdictLine = message.text.slice(0, nl).trim();
      checkBody = message.text.slice(nl + 1).trim();
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
      /* clipboard may be unavailable */
    }
  };

  const toneLabel = message.tone
    ? isCheck
      ? `確 CHECK · ${message.tone.toUpperCase()}`
      : message.tone.toUpperCase()
    : '';

  return (
    <div className={`animate-bubble-in flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={[
          'group relative max-w-[85%] sm:max-w-[80%] px-4 py-3 shadow-sm',
          isUser
            ? 'rounded-[20px_20px_6px_20px] bg-primary text-primary-foreground'
            : 'rounded-[20px_20px_20px_6px] border border-border bg-card text-card-foreground',
        ].join(' ')}
      >
        {/* Meta row */}
        <div
          className={`mb-1.5 flex items-center justify-between gap-3 text-[10px] font-semibold tracking-wider ${
            isUser ? 'text-primary-foreground/70' : 'text-muted-foreground'
          }`}
        >
          {toneLabel && <span>{toneLabel}</span>}
          <span className="font-medium tabular-nums">{timestamp}</span>
        </div>

        {/* Body */}
        {isCheck && !isUser ? (
          <>
            {verdictLine ? (
              <div
                className={`text-[15px] font-semibold leading-snug ${
                  isNatural ? 'text-accent' : 'text-foreground'
                } ${checkBody ? 'mb-2' : ''}`}
              >
                {verdictLine}
                {message.isStreaming && !checkBody && <span className="streaming-cursor" />}
              </div>
            ) : message.isStreaming ? (
              <span className="streaming-cursor" />
            ) : null}
            {checkBody && (
              <div className="text-[13px] leading-relaxed text-body break-words">
                {checkBody}
                {message.isStreaming && <span className="streaming-cursor" />}
              </div>
            )}
          </>
        ) : (
          <div
            className={`break-words ${
              isUser
                ? 'font-sans text-[14px] leading-relaxed'
                : 'font-serif text-[19px] leading-snug text-foreground'
            }`}
          >
            {message.text}
            {message.isStreaming && <span className="streaming-cursor" />}
          </div>
        )}

        {/* Why / explanation */}
        {!isUser && message.explanation && (
          <div className="mt-3 flex gap-2 border-t border-border pt-3 text-[12px] leading-relaxed text-body">
            <Lightbulb className="mt-0.5 size-3.5 shrink-0 text-accent" aria-hidden />
            <span>
              <span className="font-semibold text-accent">Why </span>
              {message.explanation}
            </span>
          </div>
        )}

        {/* Actions */}
        {!message.isStreaming && (
          <div
            className={`mt-2 flex items-center justify-end gap-1 ${
              isUser ? '' : 'opacity-70 transition-opacity group-hover:opacity-100'
            }`}
          >
            {!isUser && (
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                aria-label="Copy result"
              >
                {copied ? (
                  <>
                    <Check className="size-3 text-accent" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="size-3" /> Copy
                  </>
                )}
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(message.id)}
                className={`inline-flex items-center justify-center rounded-md p-1 transition-colors ${
                  isUser
                    ? 'text-primary-foreground/60 hover:bg-primary-foreground/15 hover:text-primary-foreground'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`}
                aria-label="Delete message"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(ChatMessage);
