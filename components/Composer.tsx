'use client';

import { type RefObject } from 'react';
import { ArrowRight, ClipboardPaste, Loader2 } from 'lucide-react';
import { TONES, type ToneId } from '@/lib/mock';

interface Props {
  inputText: string;
  setInputText: (v: string) => void;
  selectedTone: ToneId;
  onSelectTone: (t: ToneId) => void;
  checkMode: boolean;
  setCheckMode: (v: boolean) => void;
  isLoading: boolean;
  onSubmit: () => void;
  onPaste: () => void;
  inputRef: RefObject<HTMLTextAreaElement | null>;
}

export default function Composer({
  inputText,
  setInputText,
  selectedTone,
  onSelectTone,
  checkMode,
  setCheckMode,
  isLoading,
  onSubmit,
  onPaste,
  inputRef,
}: Props) {
  const canSend = !!inputText.trim() && !isLoading;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className="shrink-0 border-t border-border bg-popover/85 backdrop-blur-md">
      <div
        className="mx-auto w-full max-w-3xl px-4 py-3"
        style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
      >
        {/* Tone pills + mode toggle */}
        <div className="mb-3 flex items-center gap-3">
          <div className="no-scrollbar flex flex-1 gap-2 overflow-x-auto">
            {TONES.map((tone) => {
              const active = selectedTone === tone.id;
              return (
                <button
                  key={tone.id}
                  onClick={() => onSelectTone(tone.id)}
                  className={[
                    'shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium tracking-wide transition-colors',
                    active
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-secondary text-secondary-foreground hover:border-accent/40',
                  ].join(' ')}
                >
                  <span className="font-serif">{tone.kanji}</span> {tone.label}
                </button>
              );
            })}
          </div>

          {/* TRANSLATE / CHECK segmented toggle */}
          <div className="flex shrink-0 rounded-full border border-border bg-secondary p-0.5">
            {([['TRANSLATE', false], ['CHECK', true]] as const).map(([label, mode]) => {
              const active = checkMode === mode;
              return (
                <button
                  key={label}
                  onClick={() => setCheckMode(mode)}
                  className={[
                    'rounded-full px-3 py-1 text-[10px] font-semibold tracking-wider transition-colors',
                    active
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  ].join(' ')}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Input row */}
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={checkMode ? 'Text to check…' : 'Text to translate… (Enter to send)'}
            disabled={isLoading}
            rows={1}
            className="max-h-36 min-h-[52px] flex-1 resize-none rounded-3xl border border-border bg-card px-4 py-3.5 font-sans text-[16px] leading-relaxed text-foreground outline-none transition-shadow focus:ring-2 focus:ring-ring/50"
          />

          {!inputText.trim() && !isLoading && (
            <button
              onClick={onPaste}
              aria-label="Paste from clipboard"
              className="flex size-[52px] shrink-0 items-center justify-center rounded-full border border-border bg-secondary text-secondary-foreground transition-colors hover:border-accent/40 hover:text-foreground"
            >
              <ClipboardPaste className="size-5" />
            </button>
          )}

          <button
            onClick={onSubmit}
            disabled={!canSend}
            aria-label={checkMode ? 'Check' : 'Translate'}
            className="flex size-[52px] shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-all hover:bg-[#a83226] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isLoading ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <ArrowRight className="size-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
