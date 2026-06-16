'use client';

import { ChevronDown } from 'lucide-react';
import ChatMessage from './ChatMessage';
import type { ChatMessage as ChatMessageType } from '@/lib/mock';

interface Props {
  id?: string;
  title: string;
  messages: ChatMessageType[];
  collapsed: boolean;
  onToggle: () => void;
  onDeleteMessage: (id: string) => void;
}

export default function DateGroup({
  id,
  title,
  messages,
  collapsed,
  onToggle,
  onDeleteMessage,
}: Props) {
  const pairCount = Math.ceil(messages.length / 2);

  return (
    <section id={id} className="mb-8">
      {/* Sticky date header */}
      <div className="sticky top-0 z-10 -mx-1 mb-4 flex justify-center py-1">
        <button
          onClick={onToggle}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-popover/85 px-4 py-1.5 text-xs backdrop-blur-md transition-colors hover:border-accent/40"
        >
          <span className="font-serif font-semibold tracking-wide text-foreground">{title}</span>
          <span className="text-muted-foreground">
            {pairCount} {pairCount === 1 ? 'translation' : 'translations'}
          </span>
          <ChevronDown
            className={`size-3.5 text-muted-foreground transition-transform ${
              collapsed ? '-rotate-90' : ''
            }`}
            aria-hidden
          />
        </button>
      </div>

      {!collapsed && (
        <div className="flex flex-col gap-4">
          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} onDelete={onDeleteMessage} />
          ))}
        </div>
      )}
    </section>
  );
}
