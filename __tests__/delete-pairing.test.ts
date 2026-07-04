import { describe, it, expect } from 'vitest';
import { collectDeleteIds, isPersistedId, ChatMessage } from '../hooks/useCloudStorage';

function makeMsg(id: string, role: 'user' | 'assistant', ts: number): ChatMessage {
  return { id, role, text: 'hi', timestamp: ts };
}

// The raw messages array after two signed-in exchanges, as
// finalizeStreamingMessage actually builds it: the assistant message is renamed
// in place, but the saved user message is re-appended at the tail — so raw
// order is [assistant, user] per record, diverging from the rendered
// (timestamp-sorted) order.
const twoSavedExchanges: ChatMessage[] = [
  makeMsg('1_assistant', 'assistant', 101),
  makeMsg('1_user', 'user', 100),
  makeMsg('2_assistant', 'assistant', 201),
  makeMsg('2_user', 'user', 200),
];

describe('collectDeleteIds', () => {
  describe('persisted messages (signed in)', () => {
    it('deleting the second response never targets the first record', () => {
      // Regression: raw-array adjacency paired 2_assistant with 1_user (the
      // previous record's user message) and silently deleted record 1.
      const ids = collectDeleteIds(twoSavedExchanges, '2_assistant');
      expect(ids).toEqual(['2_assistant']);
    });

    it('returns a single id for a persisted assistant message', () => {
      expect(collectDeleteIds(twoSavedExchanges, '1_assistant')).toEqual(['1_assistant']);
    });

    it('returns a single id for a persisted user message', () => {
      // deleteMessage strips every `${dbId}_` message after the server DELETE,
      // so one call already removes both bubbles of the pair.
      expect(collectDeleteIds(twoSavedExchanges, '2_user')).toEqual(['2_user']);
    });
  });

  describe('guest messages (synthetic ids, append order)', () => {
    const guestMessages: ChatMessage[] = [
      makeMsg('temp_100', 'user', 100),
      makeMsg('streaming_101', 'assistant', 101),
      makeMsg('temp_200', 'user', 200),
      makeMsg('streaming_201', 'assistant', 201),
    ];

    it('pairs an assistant message with the user message before it', () => {
      expect(collectDeleteIds(guestMessages, 'streaming_201')).toEqual(['streaming_201', 'temp_200']);
    });

    it('pairs a user message with the assistant message after it', () => {
      expect(collectDeleteIds(guestMessages, 'temp_100')).toEqual(['temp_100', 'streaming_101']);
    });

    it('returns just the id when there is no adjacent pair', () => {
      const lone = [makeMsg('temp_100', 'user', 100), makeMsg('temp_200', 'user', 200)];
      expect(collectDeleteIds(lone, 'temp_100')).toEqual(['temp_100']);
    });
  });

  it('returns just the id when the message is not in the list', () => {
    expect(collectDeleteIds([], 'temp_100')).toEqual(['temp_100']);
  });
});

describe('isPersistedId', () => {
  it('is true for record-backed ids', () => {
    expect(isPersistedId('42_user')).toBe(true);
    expect(isPersistedId('42_assistant')).toBe(true);
  });

  it('is false for synthetic pre-save ids', () => {
    expect(isPersistedId('temp_1700000000000')).toBe(false);
    expect(isPersistedId('streaming_1700000000000')).toBe(false);
  });
});
