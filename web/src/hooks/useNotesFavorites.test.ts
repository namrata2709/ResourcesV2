import { describe, it, expect, vi, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useNotesFavorites } from './useNotesFavorites';
import { NOTES_FAVORITES_KEY } from '../lib/storageKeys';

function dispatchStorageEvent(key: string | null, newValue: string | null) {
  window.dispatchEvent(new StorageEvent('storage', { key, newValue }));
}

describe('useNotesFavorites', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('starts empty when nothing is persisted', () => {
    const { result } = renderHook(() => useNotesFavorites());
    expect(result.current.favorites.size).toBe(0);
  });

  it('loads whatever was already persisted under notesFavorites', () => {
    localStorage.setItem(NOTES_FAVORITES_KEY, JSON.stringify(['dsa-merge-sort']));
    const { result } = renderHook(() => useNotesFavorites());
    expect(result.current.favorites.has('dsa-merge-sort')).toBe(true);
  });

  it('toggling adds/removes and persists to localStorage', () => {
    const { result } = renderHook(() => useNotesFavorites());

    act(() => result.current.toggleFavorite('aws-lambda', 'Lambda'));
    expect(result.current.favorites.has('aws-lambda')).toBe(true);
    expect(JSON.parse(localStorage.getItem(NOTES_FAVORITES_KEY) || '[]')).toEqual(['aws-lambda']);

    act(() => result.current.toggleFavorite('aws-lambda', 'Lambda'));
    expect(result.current.favorites.has('aws-lambda')).toBe(false);
    expect(JSON.parse(localStorage.getItem(NOTES_FAVORITES_KEY) || '[]')).toEqual([]);
  });

  it('calls announce with the exact "Added"/"Removed" phrasing on toggle', () => {
    const announce = vi.fn();
    const { result } = renderHook(() => useNotesFavorites({ announce }));

    act(() => result.current.toggleFavorite('aws-lambda', 'Lambda'));
    expect(announce).toHaveBeenCalledWith('Added Lambda to favorites');

    act(() => result.current.toggleFavorite('aws-lambda', 'Lambda'));
    expect(announce).toHaveBeenCalledWith('Removed Lambda from favorites');
  });

  it('does not require announce to be passed', () => {
    const { result } = renderHook(() => useNotesFavorites());
    expect(() => act(() => result.current.toggleFavorite('aws-lambda', 'Lambda'))).not.toThrow();
  });

  it('re-syncs from a real storage event for the notesFavorites key (cross-tab)', () => {
    const { result } = renderHook(() => useNotesFavorites());
    expect(result.current.favorites.size).toBe(0);

    // Simulate another tab writing notesFavorites and localStorage
    // itself already reflecting that write (same-origin, real browser
    // behavior) — this hook just needs to react to the event.
    localStorage.setItem(NOTES_FAVORITES_KEY, JSON.stringify(['dsa-merge-sort']));
    act(() => dispatchStorageEvent(NOTES_FAVORITES_KEY, JSON.stringify(['dsa-merge-sort'])));

    expect(result.current.favorites.has('dsa-merge-sort')).toBe(true);
  });

  it('ignores storage events for unrelated keys', () => {
    const { result } = renderHook(() => useNotesFavorites());
    localStorage.setItem('galleryFavorites', JSON.stringify(['some-image.png']));
    act(() => dispatchStorageEvent('galleryFavorites', JSON.stringify(['some-image.png'])));
    expect(result.current.favorites.size).toBe(0);
  });

  it('cleans up its storage listener on unmount', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(() => useNotesFavorites());
    unmount();
    expect(removeSpy).toHaveBeenCalledWith('storage', expect.any(Function));
    removeSpy.mockRestore();
  });
});
