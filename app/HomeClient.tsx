'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { buildSeedHistory, TONES, type ToneId } from '@/lib/mock';
import { useMockChat } from '@/hooks/useMockChat';
import Header from '@/components/Header';
import DateGroup from '@/components/DateGroup';
import EmptyState from '@/components/EmptyState';
import Composer from '@/components/Composer';
import Toast from '@/components/Toast';
import ConfirmModal from '@/components/ConfirmModal';

export default function HomeClient() {
  // Fake auth — toggled by the Sign In button / avatar. Signed-in starts with
  // a seeded "Today" thread; guests start empty and see a banner.
  const [isSignedIn, setIsSignedIn] = useState(false);
  const seed = useMemo(() => (isSignedIn ? buildSeedHistory() : []), [isSignedIn]);

  // Remount the mock chat when auth flips so the seed/empty state resets cleanly.
  return <Translator key={isSignedIn ? 'in' : 'out'} isSignedIn={isSignedIn} setIsSignedIn={setIsSignedIn} seed={seed} />;
}

function Translator({
  isSignedIn,
  setIsSignedIn,
  seed,
}: {
  isSignedIn: boolean;
  setIsSignedIn: (fn: (v: boolean) => boolean) => void;
  seed: ReturnType<typeof buildSeedHistory>;
}) {
  const { groupedMessages, isLoading, send, toggleGroup, deleteMessage, clearHistory } =
    useMockChat(seed);

  const [inputText, setInputText] = useState('');
  const [selectedTone, setSelectedTone] = useState<ToneId>('casual');
  const [checkMode, setCheckMode] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showClearModal, setShowClearModal] = useState(false);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const hasHistory = groupedMessages.length > 0;

  // Auto-scroll to the newest content while it streams.
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [groupedMessages, isLoading]);

  // Auto-grow textarea.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 144)}px`;
  }, [inputText]);

  const hideToast = useCallback(() => setToastMessage(null), []);

  const handleSubmit = () => {
    if (!inputText.trim() || isLoading) return;
    send(inputText, selectedTone, checkMode ? 'check' : 'translate');
    setInputText('');
    if (inputRef.current) inputRef.current.style.height = 'auto';
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setInputText(text);
        inputRef.current?.focus();
      }
    } catch {
      setToastMessage('Clipboard unavailable — paste with the keyboard instead');
    }
  };

  const handlePickExample = (text: string, mode: 'translate' | 'check') => {
    setCheckMode(mode === 'check');
    setSelectedTone('casual');
    setInputText(text);
    inputRef.current?.focus();
  };

  const handleClear = async () => {
    setShowClearModal(false);
    clearHistory();
  };

  const handleDelete = useCallback((id: string) => deleteMessage(id), [deleteMessage]);

  const scrollToGroup = (title: string) => {
    document
      .getElementById(`group-${title.toLowerCase().replace(/\s+/g, '-')}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="fixed inset-0 flex h-[100dvh] flex-col bg-background">
      <Header
        isSignedIn={isSignedIn}
        hasHistory={hasHistory}
        onClear={() => setShowClearModal(true)}
        onToggleAuth={() => setIsSignedIn((v) => !v)}
      />

      {!isSignedIn && (
        <div className="shrink-0 border-b border-border bg-accent/[0.07] px-4 py-2 text-center text-xs text-muted-foreground">
          Guest mode — translations aren&apos;t saved.{' '}
          <button
            onClick={() => setIsSignedIn(() => true)}
            className="text-accent underline underline-offset-2"
          >
            Sign in to save your history
          </button>
        </div>
      )}

      {/* Thread */}
      <div className="thread-scroll relative flex-1 overflow-y-auto px-4 py-6">
        <div className="relative mx-auto w-full max-w-3xl">
          {/* Date-jump rail (desktop only) */}
          {groupedMessages.length > 1 && (
            <div className="date-jump-nav sticky top-2 z-10 h-0 overflow-visible">
              <div className="absolute left-full top-0 ml-4 flex flex-col gap-1.5">
                {groupedMessages.map((group) => (
                  <button
                    key={group.title}
                    onClick={() => scrollToGroup(group.title)}
                    className="whitespace-nowrap rounded-lg border border-border border-l-2 border-l-primary bg-card px-3 py-1.5 text-left text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  >
                    {group.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!hasHistory ? (
            <EmptyState onPickExample={handlePickExample} />
          ) : (
            groupedMessages.map((group) => (
              <DateGroup
                key={group.title}
                id={`group-${group.title.toLowerCase().replace(/\s+/g, '-')}`}
                title={group.title}
                messages={group.messages}
                collapsed={group.collapsed}
                onToggle={() => toggleGroup(group.title)}
                onDeleteMessage={handleDelete}
              />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <Composer
        inputText={inputText}
        setInputText={setInputText}
        selectedTone={selectedTone}
        onSelectTone={setSelectedTone}
        checkMode={checkMode}
        setCheckMode={setCheckMode}
        isLoading={isLoading}
        onSubmit={handleSubmit}
        onPaste={handlePaste}
        inputRef={inputRef}
      />

      <Toast message={toastMessage ?? ''} isVisible={toastMessage !== null} onHide={hideToast} />

      <ConfirmModal
        isOpen={showClearModal}
        title="Clear All History"
        message="This will permanently delete all your translations. This action cannot be undone."
        confirmText="Clear History"
        cancelText="Cancel"
        onConfirm={handleClear}
        onCancel={() => setShowClearModal(false)}
      />
    </div>
  );
}
