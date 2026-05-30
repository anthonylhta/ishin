'use client';

import { useState, useRef, useEffect } from 'react';
import { useUser, SignInButton, UserButton } from '@clerk/nextjs';
import { useCloudStorage } from '@/hooks/useCloudStorage';
import DateGroup from '@/components/DateGroup';
import Toast from '@/components/Toast';
import ConfirmModal from '@/components/ConfirmModal';

const TONES = [
  { id: 'casual', kanji: '普通', label: 'CASUAL' },
  { id: 'polite', kanji: '丁寧', label: 'POLITE' },
  { id: 'formal', kanji: '正式', label: 'FORMAL' },
  { id: 'blunt', kanji: '直接', label: 'BLUNT' },
] as const;

type ToneId = typeof TONES[number]['id'];

export default function HomeClient() {
  const { isSignedIn, isLoaded } = useUser();
  const [inputText, setInputText] = useState('');
  const [selectedTone, setSelectedTone] = useState<ToneId>('casual');
  const [isLoading, setIsLoading] = useState(false);
  const [checkMode, setCheckMode] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showClearModal, setShowClearModal] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Signed in -> cloud-backed history. Guest -> ephemeral in-memory (persists nothing).
  const { groupedMessages, addUserMessage, addStreamingMessage, updateStreamingMessage, removeStreamingMessage, finalizeStreamingMessage, clearHistory, deleteMessage, toggleGroup, isLoading: isLoadingHistory } = useCloudStorage();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [groupedMessages]);

  // Restore saved tone after hydration — must be useEffect, not lazy useState, to avoid SSR mismatch.
  useEffect(() => {
    const saved = localStorage.getItem('selectedTone');
    if (saved && TONES.some((t) => t.id === saved)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedTone(saved as ToneId);
    }
  }, []);

  // Desktop keeps the original composer; mobile gets the redesigned one. Resolve
  // the breakpoint with matchMedia — the composer only renders after Clerk's
  // isLoaded (client-side), so window is available.
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  // Auto-grow the MOBILE composer textarea with content, capped, and only show a
  // scrollbar once the cap is hit (never on an empty/short field). Desktop uses a
  // fixed-height box, so this is a no-op there.
  const MAX_INPUT_HEIGHT = 140;
  useEffect(() => {
    if (!isMobile) return;
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MAX_INPUT_HEIGHT)}px`;
    el.style.overflowY = el.scrollHeight > MAX_INPUT_HEIGHT ? 'auto' : 'hidden';
  }, [inputText, isMobile]);

  const selectTone = (id: ToneId) => {
    setSelectedTone(id);
    localStorage.setItem('selectedTone', id);
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

  const handleClearHistory = async () => {
    setShowClearModal(false);
    try {
      await clearHistory();
    } catch {
      setToastMessage('Failed to clear history — please try again');
    }
  };

  const handleDeleteMessage = async (id: string) => {
    try {
      await deleteMessage(id);
    } catch {
      setToastMessage('Failed to delete translation — please try again');
    }
  };

  const EXPLANATION_MARKER = '[[EXPLANATION]]';

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
        const displayText = markerIdx >= 0 ? fullText.slice(0, markerIdx) : fullText;
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
        updateStreamingMessage(streamingId, fullText);
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

  const scrollToGroup = (title: string) => {
    document
      .getElementById(`group-${title.toLowerCase().replace(/\s+/g, '-')}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
        <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
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

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          {groupedMessages.length > 1 && (
            <div className="date-jump-nav" style={{ position: 'sticky', top: 8, height: 0, overflow: 'visible', zIndex: 10 }}>
              <div style={{
                position: 'absolute',
                left: '100%',
                marginLeft: '12px',
                top: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}>
                {groupedMessages.map((group) => (
                  <button
                    key={group.title}
                    onClick={() => scrollToGroup(group.title)}
                    style={{
                      background: 'var(--surface-elevated)',
                      border: '1px solid var(--border)',
                      borderLeft: '2px solid var(--accent-red)',
                      borderRadius: '8px',
                      padding: '6px 14px',
                      fontSize: '12px',
                      fontWeight: 500,
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      letterSpacing: '0.3px',
                      whiteSpace: 'nowrap',
                      textAlign: 'left',
                      transition: 'background 0.15s, color 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(192, 57, 43, 0.08)';
                      e.currentTarget.style.color = 'var(--text-primary)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--surface-elevated)';
                      e.currentTarget.style.color = 'var(--text-secondary)';
                    }}
                  >
                    {group.title}
                  </button>
                ))}
              </div>
            </div>
          )}
          {isLoadingHistory ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-tertiary)' }}>
              Loading your history...
            </div>
          ) : groupedMessages.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-tertiary)' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>⛩️</div>
              <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Translate between Japanese and English
              </div>
              <div style={{ fontSize: '12px', marginBottom: '28px' }}>
                or check whether your Japanese sounds natural
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '14px' }}>
                <button
                  onClick={() => { setCheckMode(false); selectTone('casual'); setInputText('Are you free tonight?'); inputRef.current?.focus(); }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-red)'; e.currentTarget.style.background = 'var(--surface-elevated)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--surface)'; }}
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px 16px', textAlign: 'left', cursor: 'pointer', flex: '1 1 200px', maxWidth: '240px', transition: 'all 0.15s' }}
                >
                  <div style={{ fontSize: '10px', color: 'var(--accent-red)', fontWeight: 600, marginBottom: '6px', letterSpacing: '0.5px' }}>→ TRANSLATE</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-primary)', marginBottom: '4px' }}>&ldquo;Are you free tonight?&rdquo;</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>普通 CASUAL</div>
                </button>
                <button
                  onClick={() => { setCheckMode(true); selectTone('casual'); setInputText('会議ずらせる？'); inputRef.current?.focus(); }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-gold)'; e.currentTarget.style.background = 'var(--surface-elevated)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--surface)'; }}
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px 16px', textAlign: 'left', cursor: 'pointer', flex: '1 1 200px', maxWidth: '240px', transition: 'all 0.15s' }}
                >
                  <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '6px', letterSpacing: '0.5px', fontFamily: 'var(--font-serif)' }}>確 CHECK</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-primary)', marginBottom: '4px', fontFamily: 'var(--font-serif)' }}>会議ずらせる？</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>普通 CASUAL</div>
                </button>
              </div>
              <div style={{ fontSize: '11px' }}>Click an example to try it</div>
            </div>
          ) : (
            groupedMessages.map((group, idx) => (
              <DateGroup
                key={idx}
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
        {isMobile ? (
        <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Mode — full-width segmented control (changes the primary action) */}
          <div style={{
            display: 'flex',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '3px',
            gap: '3px',
          }}>
            {([['TRANSLATE', false], ['CHECK', true]] as const).map(([label, mode]) => {
              const active = checkMode === mode;
              return (
                <button
                  key={label}
                  onClick={() => setCheckMode(mode)}
                  style={{
                    flex: 1,
                    background: active ? 'var(--accent-red)' : 'transparent',
                    border: 'none',
                    borderRadius: '9px',
                    padding: '9px 0',
                    fontSize: '12px',
                    fontWeight: active ? 600 : 500,
                    letterSpacing: '0.5px',
                    color: active ? '#fff' : 'var(--text-secondary)',
                    cursor: 'pointer',
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Tone pills — horizontal scroll, never wraps into a column */}
          <div className="no-scrollbar" style={{ display: 'flex', gap: '8px', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            {TONES.map((tone) => {
              const active = selectedTone === tone.id;
              return (
                <button
                  key={tone.id}
                  onClick={() => selectTone(tone.id)}
                  style={{
                    flexShrink: 0,
                    background: active ? 'var(--accent-red)' : 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: '100px',
                    padding: '8px 16px',
                    fontSize: '12px',
                    fontWeight: 500,
                    color: active ? '#fff' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    letterSpacing: '0.5px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {tone.kanji} {tone.label}
                </button>
              );
            })}
          </div>

          {/* Input row — auto-grow field + fixed-size paste/send buttons */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
            <textarea
              ref={inputRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={checkMode ? 'Text to check…' : 'Text to translate…'}
              disabled={isLoading}
              rows={1}
              style={{
                flex: 1,
                minHeight: '48px',
                maxHeight: `${MAX_INPUT_HEIGHT}px`,
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '24px',
                padding: '13px 16px',
                color: 'var(--text-primary)',
                fontSize: '16px',
                lineHeight: 1.4,
                resize: 'none',
                outline: 'none',
                overflowY: 'hidden',
                fontFamily: 'var(--font-sans)',
              }}
            />
            {!inputText.trim() && !isLoading && (
              <button
                onClick={handlePaste}
                aria-label="Paste from clipboard"
                style={{
                  flexShrink: 0,
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-secondary)',
                  fontSize: '17px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                📋
              </button>
            )}
            <button
              onClick={checkMode ? handleCheck : handleTranslate}
              disabled={isLoading || !inputText.trim()}
              aria-label={checkMode ? 'Check' : 'Translate'}
              style={{
                flexShrink: 0,
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: 'var(--accent-red)',
                border: 'none',
                color: '#fff',
                fontSize: '20px',
                fontWeight: 600,
                cursor: 'pointer',
                opacity: isLoading || !inputText.trim() ? 0.5 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {isLoading ? '⋯' : '→'}
            </button>
          </div>
        </div>
        ) : (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
            <textarea
              ref={inputRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={checkMode ? 'Enter text to check... (Enter to send)' : 'Enter text... (Enter to send)'}
              disabled={isLoading}
              rows={1}
              style={{
                flex: 1,
                minHeight: '160px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '24px',
                padding: '12px 16px',
                color: 'var(--text-primary)',
                fontSize: '14px',
                lineHeight: 1.6,
                resize: 'none',
                outline: 'none',
                fontFamily: 'var(--font-sans)',
              }}
            />
            <button
              onClick={checkMode ? handleCheck : handleTranslate}
              disabled={isLoading || !inputText.trim()}
              style={{
                background: 'var(--accent-red)',
                border: 'none',
                borderRadius: '24px',
                padding: '0 24px',
                color: 'white',
                fontSize: '18px',
                fontWeight: 600,
                cursor: 'pointer',
                opacity: isLoading || !inputText.trim() ? 0.5 : 1,
                flexShrink: 0,
              }}
            >
              {isLoading ? '⋯' : '→'}
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', flex: 1 }}>
              {TONES.map((tone) => (
                <button
                  key={tone.id}
                  onClick={() => selectTone(tone.id)}
                  style={{
                    background: selectedTone === tone.id ? 'var(--accent-red)' : 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: '100px',
                    padding: '6px 16px',
                    fontSize: '11px',
                    fontWeight: 500,
                    color: selectedTone === tone.id ? 'white' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    letterSpacing: '0.5px',
                  }}
                >
                  {tone.kanji} {tone.label}
                </button>
              ))}
            </div>
            <div style={{
              display: 'flex',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '100px',
              padding: '2px',
              flexShrink: 0,
            }}>
              <button
                onClick={() => setCheckMode(false)}
                style={{
                  background: !checkMode ? 'var(--surface-elevated)' : 'transparent',
                  border: 'none',
                  borderRadius: '100px',
                  padding: '4px 10px',
                  fontSize: '10px',
                  fontWeight: !checkMode ? 600 : 400,
                  color: !checkMode ? 'var(--text-primary)' : 'var(--text-tertiary)',
                  cursor: 'pointer',
                  letterSpacing: '0.5px',
                }}
              >
                TRANSLATE
              </button>
              <button
                onClick={() => setCheckMode(true)}
                style={{
                  background: checkMode ? 'var(--surface-elevated)' : 'transparent',
                  border: 'none',
                  borderRadius: '100px',
                  padding: '4px 10px',
                  fontSize: '10px',
                  fontWeight: checkMode ? 600 : 400,
                  color: checkMode ? 'var(--text-primary)' : 'var(--text-tertiary)',
                  cursor: 'pointer',
                  letterSpacing: '0.5px',
                }}
              >
                CHECK
              </button>
            </div>
          </div>
        </div>
        )}
      </div>

      <Toast
        message={toastMessage ?? ''}
        isVisible={toastMessage !== null}
        onHide={() => setToastMessage(null)}
        icon="⚠️"
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
