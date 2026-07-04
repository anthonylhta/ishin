import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { groupMessagesByDate, ChatMessage } from '../hooks/useCloudStorage';

// Fixed now: Wednesday 2026-05-27 at noon
const FIXED_NOW = new Date('2026-05-27T12:00:00');

// Mirror the code's own bucket boundaries so tests stay correct in any timezone
const today = new Date(FIXED_NOW);
today.setHours(0, 0, 0, 0);
const yesterday = new Date(today);
yesterday.setDate(yesterday.getDate() - 1);
const thisWeekStart = new Date(today);
thisWeekStart.setDate(today.getDate() - today.getDay()); // Sunday
const older = new Date(thisWeekStart);
older.setDate(older.getDate() - 1); // Day before week start

function makeMsg(id: string, ts: number, role: 'user' | 'assistant' = 'user'): ChatMessage {
  return { id, role, text: 'hi', timestamp: ts };
}

// Noon on a given Date (avoids midnight boundary edge cases)
function noon(d: Date): number {
  const n = new Date(d);
  n.setHours(12, 0, 0, 0);
  return n.getTime();
}

// Mirrors the implementation's stable local-date group key
function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

describe('groupMessagesByDate', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('returns empty array for no messages', () => {
    expect(groupMessagesByDate([])).toEqual([]);
  });

  it('puts a message from today into the "Today" group', () => {
    const msgs = [makeMsg('1', noon(today))];
    const groups = groupMessagesByDate(msgs);
    expect(groups).toHaveLength(1);
    expect(groups[0].title).toBe('Today');
    expect(groups[0].messages).toHaveLength(1);
  });

  it('puts a message from yesterday into the "Yesterday" group', () => {
    const groups = groupMessagesByDate([makeMsg('1', noon(yesterday))]);
    expect(groups[0].title).toBe('Yesterday');
  });

  it('puts a message from earlier this week into "This Week"', () => {
    // thisWeekStart is Sunday; use it if it's before yesterday, otherwise skip
    if (thisWeekStart < yesterday) {
      const groups = groupMessagesByDate([makeMsg('1', noon(thisWeekStart))]);
      expect(groups[0].title).toBe('This Week');
    }
  });

  it('puts a message from before this week into "Older"', () => {
    const groups = groupMessagesByDate([makeMsg('1', noon(older))]);
    expect(groups[0].title).toBe('Older');
  });

  it('creates separate groups for different date buckets', () => {
    const msgs = [
      makeMsg('a', noon(today)),
      makeMsg('b', noon(yesterday)),
      makeMsg('c', noon(older)),
    ];
    const groups = groupMessagesByDate(msgs);
    const titles = groups.map(g => g.title);
    expect(titles).toContain('Today');
    expect(titles).toContain('Yesterday');
    expect(titles).toContain('Older');
  });

  it('sorts messages by timestamp within a group', () => {
    const t1 = noon(today);
    const t2 = t1 + 5000;
    const msgs = [makeMsg('b', t2), makeMsg('a', t1)];
    const groups = groupMessagesByDate(msgs);
    expect(groups[0].messages[0].id).toBe('a');
    expect(groups[0].messages[1].id).toBe('b');
  });

  it('groups consecutive same-bucket messages together', () => {
    const msgs = [
      makeMsg('a', noon(today)),
      makeMsg('b', noon(today) + 1000),
    ];
    const groups = groupMessagesByDate(msgs);
    expect(groups).toHaveLength(1);
    expect(groups[0].messages).toHaveLength(2);
  });

  it('sets collapsed: false when no localStorage state exists', () => {
    // In node environment, window is undefined so collapsed state is always {}
    const groups = groupMessagesByDate([makeMsg('1', noon(today))]);
    expect(groups[0].collapsed).toBe(false);
  });

  // Collapse state is keyed by a STABLE key, not the rolling title —
  // collapsing "Today" must not hide a different day's messages tomorrow.
  it('keys Today/Yesterday groups by their calendar date', () => {
    const groups = groupMessagesByDate([
      makeMsg('a', noon(today)),
      makeMsg('b', noon(yesterday)),
    ]);
    expect(groups.map(g => g.key)).toEqual([dayKey(yesterday), dayKey(today)]);
  });

  it('keys the Older bucket with a single stable key', () => {
    const groups = groupMessagesByDate([makeMsg('1', noon(older))]);
    expect(groups[0].key).toBe('older');
  });

  it('reads collapse state by the stable key and ignores legacy title keys', () => {
    vi.stubGlobal('window', {});
    vi.stubGlobal('localStorage', {
      getItem: () => JSON.stringify({ [dayKey(today)]: true, Yesterday: true }),
    });
    const groups = groupMessagesByDate([
      makeMsg('a', noon(today)),
      makeMsg('b', noon(yesterday)),
    ]);
    expect(groups.find(g => g.title === 'Today')?.collapsed).toBe(true);
    expect(groups.find(g => g.title === 'Yesterday')?.collapsed).toBe(false);
  });

  it('includes all messages across multiple groups without loss', () => {
    const msgs = [
      makeMsg('a', noon(today)),
      makeMsg('b', noon(yesterday)),
      makeMsg('c', noon(older)),
      makeMsg('d', noon(older) + 1000),
    ];
    const groups = groupMessagesByDate(msgs);
    const allIds = groups.flatMap(g => g.messages.map(m => m.id));
    expect(allIds.sort()).toEqual(['a', 'b', 'c', 'd'].sort());
  });
});
