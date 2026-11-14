import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useStickyNote } from './useStickyNote';
import { saveStickyNote, getStickyNote } from '../lib/stickyNotes';

function wrapper(initialPath: string) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <MemoryRouter initialEntries={[initialPath]}>{children}</MemoryRouter>;
  };
}

describe('useStickyNote', () => {
  it('returns null note when nothing is saved for the current page', () => {
    const { result } = renderHook(() => useStickyNote(), { wrapper: wrapper('/gallery') });
    expect(result.current.note).toBeNull();
    expect(result.current.pageId).toBe('gallery');
  });

  it('returns the previously saved note for the current page on mount', () => {
    saveStickyNote('gallery', 'existing note');
    const { result } = renderHook(() => useStickyNote(), { wrapper: wrapper('/gallery') });
    expect(result.current.note?.text).toBe('existing note');
  });

  it('setText persists to storage under the current page id and updates state', () => {
    const { result } = renderHook(() => useStickyNote(), { wrapper: wrapper('/quiz/aws-vpc') });

    act(() => result.current.setText('remember this'));

    expect(result.current.note?.text).toBe('remember this');
    expect(getStickyNote('quiz--aws-vpc')?.text).toBe('remember this');
  });

  it('remove deletes the note from storage and clears state', () => {
    saveStickyNote('home', 'to remove');
    const { result } = renderHook(() => useStickyNote(), { wrapper: wrapper('/') });
    expect(result.current.note).not.toBeNull();

    act(() => result.current.remove());

    expect(result.current.note).toBeNull();
    expect(getStickyNote('home')).toBeNull();
  });

  it('derives pageId "home" for the root route', () => {
    const { result } = renderHook(() => useStickyNote(), { wrapper: wrapper('/') });
    expect(result.current.pageId).toBe('home');
  });
});
