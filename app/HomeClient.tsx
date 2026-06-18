'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useUser, SignInButton, UserButton } from '@clerk/nextjs';
import { useCloudStorage } from '@/hooks/useCloudStorage';
import DateGroup from '@/components/DateGroup';
import Toast from '@/components/Toast';
import ConfirmModal from '@/components/ConfirmModal';
import { SendIcon, SpinnerIcon, ChevronIcon, ToriiMark, WarningIcon } from '@/components/Icons';

const TONES = [
  { id: 'casual', kanji: '普通', label: 'CASUAL' },
  { id: 'polite', kanji: '丁寧', label: 'POLITE' },
  { id: 'formal', kanji: '正式', label: 'FORMAL' },
  { id: 'blunt', kanji: '直接', label: 'BLUNT' },
] as const;

type ToneId = typeof TONES[number]['id'];

const EXPLANATION_MARKER = '[[EXPLANATION]]';

// Sentinel markers the API can emit that must never be shown — even partially.
// While streaming they arrive a few characters at a time, and indexOf only
// matches a marker once complete, so without this a partial "[[EXPLA" or
// "[[MAX_TOK" flashes in the live bubble. Trim any suffix that is a (possibly
// complete) prefix of a marker.
const STREAM_MARKERS = [EXPLANATION_MARKER, '[[MAX_TOKENS]]'];

function stripPartialMarker(text: string): string {
  for (const marker of STREAM_MARKERS) {
    for (let len = Math.min(marker.length, text.length); len > 0; len--) {
      if (text.endsWith(marker.slice(0, len))) {
        return text.slice(0, text.length - len);
      }
    }
  }
  return text;
}

export default function HomeClient() {
  const { isSignedIn, isLoaded } = useUser();
  const [inputText, setInputText] = useState('');
  const [selectedTone, setSelectedTone] = useState<ToneId>('casual');
  const [isLoading, setIsLoading] = useState(false);
  const [checkMode, setCheckMode] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showClearModal, setShowClearModal] = useState(false);
  const [toneMenuOpen, setToneMenuOpen] = useState(false);

  // Signed in -> cloud-backed history. Guest -> ephemeral in-memory (persists nothing).
  const { messages, groupedMessages, addUserMessage, addStreamingMessage, updateStreamingMessage, removeStreamingMessage, finalizeStreamingMessage, clearHistory, deleteMessage, toggleGroup, isLoading: isLoadingHistory } = useCloudStorage();
  // Latest messages, for the stable pair-delete handler below (depending on
  // `messages` directly would re-create the callback and defeat ChatMessage's memo).
  const messagesRef = useRef(messages);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const toneMenuRef = useRef<HTMLDivElement>(null);

  // Follow new and streaming messages only. Scrolling on every groupedMessages
  // change yanked the viewport to the bottom on collapse toggles and on
  // deleting an old message; depending on messages and gating on growth or an
  // active stream scrolls exactly when new content appears at the bottom.
  // Keep messagesRef current so the (stable) pair-delete handler sees the latest list.
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  const prevMessageCount = useRef(0);
  useEffect(() => {
    const grew = messages.length > prevMessageCount.current;
    prevMessageCount.current = messages.length;
    if (grew || messages[messages.length - 1]?.isStreaming) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Restore saved tone after hydration — must be useEffect, not lazy useState, to avoid SSR mismatch.
  useEffect(() => {
    const saved = localStorage.getItem('selectedTone');
    if (saved && TONES.some((t) => t.id === saved)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedTone(saved as ToneId);
    }
  }, []);

  // Auto-grow the composer textarea with content, capped, and only show a
  // scrollbar once the cap is hit (never on an empty/short field). Both layouts
  // use the auto-grow field now — the old desktop fixed 160px box was oversized
  // for short conversational text, which made the composer feel top-heavy.
  const MAX_INPUT_HEIGHT = 140;
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    // Capture "was the conversation scrolled to the bottom?" BEFORE the textarea
    // grows — once it grows, the messages area shrinks from the bottom and the
    // newest message would slip out of view. If the user was following along,
    // re-pin the bottom after the reflow so the latest reply stays just above
    // the composer (don't yank them down if they'd scrolled up to read history).
    const sc = scrollContainerRef.current;
    const wasAtBottom = sc ? sc.scrollHeight - sc.scrollTop - sc.clientHeight < 80 : false;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MAX_INPUT_HEIGHT)}px`;
    el.style.overflowY = el.scrollHeight > MAX_INPUT_HEIGHT ? 'auto' : 'hidden';
    if (wasAtBottom && sc) {
      requestAnimationFrame(() => { sc.scrollTop = sc.scrollHeight; });
    }
  }, [inputText]);

  // Close the tone dropdown on an outside click.
  useEffect(() => {
    if (!toneMenuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (toneMenuRef.current && !toneMenuRef.current.contains(e.target as Node)) {
        setToneMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [toneMenuOpen]);

  const selectTone = (id: ToneId) => {
    setSelectedTone(id);
    localStorage.setItem('selectedTone', id);
  };

  // Stable identity — Toast's auto-hide effect depends on onHide, so an inline
  // closure would reset the timer on every HomeClient re-render (e.g. typing).
  const hideToast = useCallback(() => setToastMessage(null), []);

  const handleClearHistory = async () => {
    setShowClearModal(false);
    try {
      await clearHistory();
    } catch {
      setToastMessage('Failed to clear history — please try again');
    }
  };

  // Stable identity — flows down to every memoized ChatMessage as onDelete.
  // An entry is a user input + the assistant response right after it; deleting
  // either side removes the whole pair.
  const handleDeleteMessage = useCallback(async (id: string) => {
    const msgs = messagesRef.current;
    const idx = msgs.findIndex((m) => m.id === id);
    const ids = [id];
    if (idx !== -1) {
      if (msgs[idx].role === 'assistant' && msgs[idx - 1]?.role === 'user') ids.push(msgs[idx - 1].id);
      else if (msgs[idx].role === 'user' && msgs[idx + 1]?.role === 'assistant') ids.push(msgs[idx + 1].id);
    }
    try {
      await Promise.all(ids.map((i) => deleteMessage(i)));
    } catch {
      setToastMessage('Failed to delete — please try again');
    }
  }, [deleteMessage]);

  const handleTranslate = async () => {
    if (!inputText.trim() || isLoading) return;

    const userText = inputText;
    const tone = selectedTone;

    setIsLoading(true);
    addUserMessage(userText, tone);
    setInputText('');

    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }

    const streamingId = addStreamingMessage(tone);

    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: userText, selectedTone: tone }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Translation failed');
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });

        const markerIdx = fullText.indexOf(EXPLANATION_MARKER);
        const displayText = markerIdx >= 0 ? fullText.slice(0, markerIdx) : stripPartialMarker(fullText);
        updateStreamingMessage(streamingId, displayText.trimEnd());
      }
      // Flush any buffered multi-byte UTF-8 sequences from the decoder
      fullText += decoder.decode();

      if (fullText.includes('[[MAX_TOKENS]]')) {
        throw new Error('Response was cut short — try a shorter input');
      }

      const markerIdx = fullText.indexOf(EXPLANATION_MARKER);
      const translation = (markerIdx >= 0 ? fullText.slice(0, markerIdx) : fullText).trim();
      const explanation = (markerIdx >= 0 ? fullText.slice(markerIdx + EXPLANATION_MARKER.length) : '').trim();

      if (!translation) {
        throw new Error('Translation failed — empty response');
      }

      await finalizeStreamingMessage(streamingId, translation, tone, explanation, userText);
    } catch (err) {
      console.error(err);
      removeStreamingMessage(streamingId);
      setToastMessage(err instanceof Error && err.message ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleCheck = async () => {
    if (!inputText.trim() || isLoading) return;

    const userText = inputText;
    const tone = selectedTone;

    setIsLoading(true);
    addUserMessage(userText, tone, 'check');
    setInputText('');

    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }

    const streamingId = addStreamingMessage(tone, 'check');

    try {
      const response = await fetch('/api/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: userText, selectedTone: tone }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Check failed');
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });
        updateStreamingMessage(streamingId, stripPartialMarker(fullText).trimEnd());
      }
      fullText += decoder.decode();

      if (fullText.includes('[[MAX_TOKENS]]')) {
        throw new Error('Response was cut short — try a shorter input');
      }

      const result = fullText.trim();
      if (!result) {
        throw new Error('Check failed — empty response');
      }

      await finalizeStreamingMessage(streamingId, result, tone, '', userText, 'check');
    } catch (err) {
      console.error(err);
      removeStreamingMessage(streamingId);
      setToastMessage(err instanceof Error && err.message ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (checkMode) handleCheck();
      else handleTranslate();
    }
  };

  // NOTE: we intentionally do NOT gate the whole app on Clerk's `isLoaded`.
  // Doing so made the server-rendered HTML just a "Loading…" screen, so the real
  // content (LCP) only appeared after Clerk's client JS initialised — ~10s in RUM.
  // The translator works for guests, so we render the full shell immediately and
  // only defer the auth-specific controls (header button, guest banner) until
  // `isLoaded`. SSR and the first client render both see `isLoaded === false`, so
  // there's no hydration mismatch.
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--background)',
    }}>
      <div style={{
        padding: '12px 16px',
        paddingTop: 'calc(12px + env(safe-area-inset-top))',
        borderBottom: '1px solid var(--border)',
        background: 'rgba(13, 13, 11, 0.95)',
        flexShrink: 0,
      }}>
        <div style={{ maxWidth: '720px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
          <div style={{ minWidth: 0 }}>
            <h1 style={{
              fontSize: 'clamp(1.05rem, 4.5vw, 1.25rem)',
              margin: 0,
              fontFamily: 'var(--font-serif)',
              fontWeight: 600,
              letterSpacing: '1px',
              whiteSpace: 'nowrap',
            }}>TONE TRANSLATOR</h1>
            <div style={{
              fontSize: '0.62rem',
              color: 'var(--text-secondary)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>敬意を込めて — With Precision</div>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexShrink: 0 }}>
            {groupedMessages.length > 0 && (
              <button
                onClick={() => setShowClearModal(true)}
                style={{
                  background: 'none',
                  border: '1px solid var(--border)',
                  borderRadius: '100px',
                  padding: '7px 14px',
                  fontSize: '0.72rem',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                Clear
              </button>
            )}
            {!isLoaded ? (
              // Reserve the auth control's space while Clerk initialises so the
              // header doesn't shift when it resolves.
              <div aria-hidden style={{ width: '78px', height: '34px' }} />
            ) : isSignedIn ? (
              <UserButton />
            ) : (
              <SignInButton mode="modal">
                <button style={{
                  background: 'var(--accent-red)',
                  border: 'none',
                  borderRadius: '100px',
                  padding: '7px 18px',
                  color: 'white',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}>
                  Sign In
                </button>
              </SignInButton>
            )}
          </div>
        </div>
      </div>

      {isLoaded && !isSignedIn && (
        <div style={{
          flexShrink: 0,
          padding: '8px 16px',
          background: 'rgba(201, 168, 76, 0.08)',
          borderBottom: '1px solid var(--border)',
          fontSize: '0.75rem',
          color: 'var(--text-secondary)',
          textAlign: 'center',
        }}>
          Guest mode — translations aren&apos;t saved.{' '}
          <SignInButton mode="modal">
            <button style={{
              background: 'none',
              border: 'none',
              color: 'var(--accent-gold)',
              cursor: 'pointer',
              textDecoration: 'underline',
              fontSize: '0.75rem',
              padding: 0,
              fontFamily: 'inherit',
            }}>
              Sign in to save your history
            </button>
          </SignInButton>
        </div>
      )}

      <div ref={scrollContainerRef} style={{ flex: 1, overflowY: 'auto', padding: '0 16px 16px' }}>
        <div style={{ maxWidth: '720px', margin: '0 auto', paddingTop: '16px' }}>
          {isLoadingHistory ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-tertiary)' }}>
              Loading your history...
            </div>
          ) : groupedMessages.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-tertiary)' }}>
              <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center' }}><ToriiMark size={56} /></div>
              <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Translate between Japanese and English
              </div>
              <div style={{ fontSize: '12px', marginBottom: '28px' }}>
                or check whether your Japanese sounds natural
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center', marginBottom: '16px' }}>
                <button
                  onClick={() => { setCheckMode(false); selectTone('casual'); setInputText('Are you free tonight?'); inputRef.current?.focus(); }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'transparent', border: 'none', borderRadius: '10px', padding: '8px 14px', cursor: 'pointer', transition: 'background 0.15s' }}
                >
                  <span style={{ fontSize: '10px', letterSpacing: '1px', color: 'var(--accent-gold)', fontWeight: 600 }}>TRANSLATE</span>
                  <span style={{ fontSize: '14px', color: 'var(--text-body)' }}>Are you free tonight?</span>
                </button>
                <button
                  onClick={() => { setCheckMode(true); selectTone('casual'); setInputText('会議ずらせる？'); inputRef.current?.focus(); }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'transparent', border: 'none', borderRadius: '10px', padding: '8px 14px', cursor: 'pointer', transition: 'background 0.15s' }}
                >
                  <span style={{ fontSize: '10px', letterSpacing: '1px', color: 'var(--accent-gold)', fontWeight: 600 }}>CHECK</span>
                  <span style={{ fontSize: '15px', color: 'var(--text-body)', fontFamily: 'var(--font-serif)' }}>会議ずらせる？</span>
                </button>
              </div>
              <div style={{ fontSize: '11px' }}>tap an example to try it</div>
              <div style={{ marginTop: '32px', fontSize: '11px', color: 'var(--text-tertiary)' }}>
                Built by Anthony Ta
                {' · '}
                <a
                  href="https://github.com/anthonylhta/tone-translator"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent-gold)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
                >
                  GitHub
                </a>
                {' · '}
                <a
                  href="https://www.linkedin.com/in/anthonylhta"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent-gold)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
                >
                  LinkedIn
                </a>
              </div>
            </div>
          ) : (
            groupedMessages.map((group) => (
              <DateGroup
                key={group.title}
                id={`group-${group.title.toLowerCase().replace(/\s+/g, '-')}`}
                title={group.title}
                messages={group.messages}
                collapsed={group.collapsed}
                onToggle={() => toggleGroup(group.title)}
                onDeleteMessage={handleDeleteMessage}
              />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div style={{
        flexShrink: 0,
        borderTop: '1px solid var(--border)',
        background: 'rgba(13, 13, 11, 0.98)',
        padding: '12px 16px',
        paddingBottom: 'calc(12px + env(safe-area-inset-bottom))',
      }}>
        <div style={{
          maxWidth: '720px',
          margin: '0 auto',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '18px',
          padding: '12px 14px',
        }}>
          <textarea
            ref={inputRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={checkMode ? 'Check…' : 'Message…'}
            disabled={isLoading}
            rows={1}
            style={{
              width: '100%',
              minHeight: '40px',
              maxHeight: `${MAX_INPUT_HEIGHT}px`,
              background: 'transparent',
              border: 'none',
              padding: '6px 4px',
              color: 'var(--text-primary)',
              fontSize: '16px',
              lineHeight: 1.5,
              resize: 'none',
              outline: 'none',
              overflowY: 'hidden',
              fontFamily: 'var(--font-sans)',
            }}
          />

          {/* Controls bar — tone dropdown · TRANSLATE/CHECK · send */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
            {/* Tone dropdown (opens upward — the composer is at the bottom) */}
            <div ref={toneMenuRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setToneMenuOpen((o) => !o)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '5px',
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'var(--font-sans)',
                }}
              >
                tone&nbsp;·&nbsp;
                <b style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                  {TONES.find((t) => t.id === selectedTone)?.label.toLowerCase()}
                </b>
                <span style={{ display: 'inline-flex', opacity: 0.7, transform: toneMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}>
                  <ChevronIcon size={13} />
                </span>
              </button>
              {toneMenuOpen && (
                <div style={{
                  position: 'absolute', bottom: '100%', left: 0, marginBottom: '10px',
                  background: 'var(--surface-elevated)', border: '1px solid var(--border)',
                  borderRadius: '12px', padding: '5px', minWidth: '160px', zIndex: 20,
                  boxShadow: '0 10px 28px rgba(0,0,0,0.5)',
                }}>
                  {TONES.map((tone) => {
                    const active = selectedTone === tone.id;
                    return (
                      <button
                        key={tone.id}
                        onClick={() => { selectTone(tone.id); setToneMenuOpen(false); }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '9px', width: '100%',
                          background: active ? 'var(--surface)' : 'transparent',
                          border: 'none', borderRadius: '8px', padding: '9px 11px',
                          cursor: 'pointer', textAlign: 'left',
                          color: active ? 'var(--accent-gold)' : 'var(--text-secondary)',
                          fontSize: '12px', fontWeight: active ? 600 : 500, letterSpacing: '0.5px',
                        }}
                      >
                        <span style={{ fontFamily: 'var(--font-serif)', fontSize: '14px' }}>{tone.kanji}</span>
                        {tone.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Mode toggle — quiet text */}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '14px' }}>
              {([['TRANSLATE', false], ['CHECK', true]] as const).map(([label, mode]) => {
                const active = checkMode === mode;
                return (
                  <button
                    key={label}
                    onClick={() => setCheckMode(mode)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontFamily: 'var(--font-sans)', fontSize: '11px', letterSpacing: '0.5px',
                      color: active ? 'var(--text-primary)' : 'var(--text-tertiary)',
                      fontWeight: active ? 600 : 400,
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Send — the only red */}
            <button
              onClick={checkMode ? handleCheck : handleTranslate}
              disabled={isLoading || !inputText.trim()}
              aria-label={checkMode ? 'Check' : 'Translate'}
              style={{
                flexShrink: 0,
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: 'var(--accent-red)',
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
                opacity: isLoading || !inputText.trim() ? 0.5 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {isLoading ? <SpinnerIcon size={18} /> : <SendIcon size={18} />}
            </button>
          </div>
        </div>
      </div>

      <Toast
        message={toastMessage ?? ''}
        isVisible={toastMessage !== null}
        onHide={hideToast}
        icon={<span style={{ color: 'var(--accent-gold)', display: 'inline-flex' }}><WarningIcon size={16} /></span>}
      />

      <ConfirmModal
        isOpen={showClearModal}
        title="Clear All History"
        message="This will permanently delete all your translations. This action cannot be undone."
        confirmText="Clear History"
        cancelText="Cancel"
        onConfirm={handleClearHistory}
        onCancel={() => setShowClearModal(false)}
      />
    </div>
  );
}
