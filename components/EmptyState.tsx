'use client';

import Image from 'next/image';
import { ArrowRight } from 'lucide-react';

interface Props {
  onPickExample: (text: string, mode: 'translate' | 'check') => void;
}

const EXAMPLES = [
  {
    mode: 'translate' as const,
    badge: 'TRANSLATE',
    text: '“Are you free tonight?”',
    tone: '普通 CASUAL',
    accent: 'primary' as const,
  },
  {
    mode: 'check' as const,
    badge: '確 CHECK',
    text: '会議ずらせる？',
    tone: '普通 CASUAL',
    accent: 'accent' as const,
  },
];

export default function EmptyState({ onPickExample }: Props) {
  return (
    <div className="flex flex-col items-center px-4 py-12 text-center">
      <Image
        src="/torii.png"
        alt="Torii gate"
        width={72}
        height={72}
        className="mb-6 opacity-90"
        priority
      />
      <h2 className="font-serif text-xl font-semibold text-foreground text-balance">
        Translate between Japanese and English
      </h2>
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground text-pretty">
        Or check whether your Japanese sounds natural — with tone, nuance, and a short
        explanation of every choice.
      </p>

      <div className="mt-8 grid w-full max-w-md grid-cols-1 gap-3 sm:grid-cols-2">
        {EXAMPLES.map((ex) => (
          <button
            key={ex.badge}
            onClick={() => onPickExample(ex.text.replace(/[“”]/g, ''), ex.mode)}
            className="group rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:border-accent/40"
          >
            <div
              className={`mb-2 inline-flex items-center gap-1 text-[10px] font-semibold tracking-wider ${
                ex.accent === 'primary' ? 'text-primary' : 'text-accent'
              }`}
            >
              {ex.mode === 'translate' && <ArrowRight className="size-3" />}
              {ex.badge}
            </div>
            <div
              className={`mb-1 text-foreground ${
                ex.mode === 'check' ? 'font-serif text-base' : 'text-sm'
              }`}
            >
              {ex.text}
            </div>
            <div className="text-[10px] tracking-wide text-muted-foreground">{ex.tone}</div>
          </button>
        ))}
      </div>

      <p className="mt-4 text-xs text-muted-foreground">Click an example to try it</p>

      <div className="mt-10 text-xs text-muted-foreground">
        Built by Anthony Ta
        {' · '}
        <a
          href="https://github.com/anthonylhta/tone-translator"
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground underline-offset-2 transition-colors hover:text-accent hover:underline"
        >
          GitHub
        </a>
        {' · '}
        <a
          href="https://www.linkedin.com/in/anthonylhta"
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground underline-offset-2 transition-colors hover:text-accent hover:underline"
        >
          LinkedIn
        </a>
      </div>
    </div>
  );
}
