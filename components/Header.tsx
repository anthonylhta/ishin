'use client';

import { Trash2 } from 'lucide-react';
import { MOCK_USER } from '@/lib/mock';

interface Props {
  isSignedIn: boolean;
  hasHistory: boolean;
  onClear: () => void;
  onToggleAuth: () => void;
}

export default function Header({ isSignedIn, hasHistory, onClear, onToggleAuth }: Props) {
  return (
    <header
      className="shrink-0 border-b border-border bg-popover/85 backdrop-blur-md"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <h1 className="truncate font-serif text-lg font-semibold tracking-[0.06em] text-foreground sm:text-xl">
            TONE TRANSLATOR
          </h1>
          <p className="truncate text-[11px] text-muted-foreground">
            <span className="font-serif">敬意を込めて</span> — With Precision
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {isSignedIn && hasHistory && (
            <button
              onClick={onClear}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-accent/40 hover:text-foreground"
            >
              <Trash2 className="size-3.5" />
              <span className="hidden sm:inline">Clear</span>
            </button>
          )}

          {isSignedIn ? (
            <button
              onClick={onToggleAuth}
              aria-label="Account menu"
              title={`${MOCK_USER.name} — sign out`}
              className="flex size-9 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground ring-1 ring-accent/30 transition-transform hover:scale-105"
            >
              {MOCK_USER.initials}
            </button>
          ) : (
            <button
              onClick={onToggleAuth}
              className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-[#a83226]"
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
