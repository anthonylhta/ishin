'use client';

import { useState, useRef, useEffect } from 'react';
import { useChatStorage } from '@/hooks/useChatStorage';
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

export default function Home() {
  const [inputText, setInputText] = useState('');
  const [selectedTone, setSelectedTone] = useState<ToneId>('polite');
  const [isLoading, setIsLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  
  const { groupedMessages, addUserMessage, addAssistantMessage, clearHistory, deleteMessage, toggleGroup } = useChatStorage();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [groupedMessages]);

  const handleClearHistory = () => {
    setShowClearModal(false);
    clearHistory();
  };

  const handleTranslate = async () => {
    if (!inputText.trim() || isLoading) return;

    const userText = inputText;
    const tone = selectedTone;
    
    setIsLoading(true);
    
    // Add user message
    addUserMessage(userText, tone);
    
    setInputText('');
    
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }

    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: userText, 
          sourceLang: 'auto',
          selectedTone: tone 
        }),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error);

      const variant = data.variants.find((v: any) => v.tone === tone);
      
      if (variant) {
        addAssistantMessage(variant.translation, tone, variant.explanation);
      } else {
        addAssistantMessage('Translation not available', tone, 'Please try a different tone');
      }
    } catch (err) {
      console.error(err);
      addAssistantMessage('Translation failed. Please try again.', tone, 'Error occurred');
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleTranslate();
    }
  };

  return (
    <div style={{ 
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--background)',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid var(--border)',
        background: 'rgba(13, 13, 11, 0.95)',
        flexShrink: 0,
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '1.25rem', margin: 0, fontFamily: 'var(--font-serif)' }}>TONE TRANSLATOR</h1>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>敬意を込めて — With Precision</div>
          </div>
          {groupedMessages.length > 0 && (
            <button 
              onClick={() => setShowClearModal(true)} 
              style={{
                background: 'none',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '4px 12px',
                fontSize: '0.7rem',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Messages - Scrollable */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px',
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          {groupedMessages.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-tertiary)' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>⛩️</div>
              <div>Your translations will appear here</div>
              <div style={{ fontSize: '12px', marginTop: '8px' }}>Type something below and press Enter</div>
            </div>
          ) : (
            groupedMessages.map((group, idx) => (
              <DateGroup
                key={idx}
                title={group.title}
                messages={group.messages}
                collapsed={group.collapsed}
                onToggle={() => toggleGroup(group.title)}
                onDeleteMessage={deleteMessage}
              />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area - Fixed at bottom */}
      <div style={{
        flexShrink: 0,
        borderTop: '1px solid var(--border)',
        background: 'rgba(13, 13, 11, 0.98)',
        padding: '16px',
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          {/* Text input row */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
            <textarea
              ref={inputRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter text... (Enter to send)"
              disabled={isLoading}
              rows={1}
              style={{
                flex: 1,
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '24px',
                padding: '12px 16px',
                color: 'var(--text-primary)',
                fontSize: '14px',
                resize: 'none',
                outline: 'none',
                fontFamily: 'var(--font-sans)',
              }}
            />
            <button
              onClick={handleTranslate}
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
              }}
            >
              {isLoading ? '⋯' : '→'}
            </button>
          </div>
          
          {/* Tone selector */}
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {TONES.map((tone) => (
              <button
                key={tone.id}
                onClick={() => setSelectedTone(tone.id)}
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
        </div>
      </div>

      <Toast message="Copied!" isVisible={showToast} onHide={() => setShowToast(false)} />
      
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