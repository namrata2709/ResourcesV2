import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import './QuickActionsSection'; // registers itself as a side effect — see sections/index.ts's own comment
import { getSettingsSections } from '../registry';
import { DEFAULT_QUICK_ACTION_IDS } from '../../../lib/quickActions';

function renderQuickActionsSection() {
  const section = getSettingsSections().find((s) => s.id === 'quick-actions');
  if (!section) {
    throw new Error('QuickActionsSection did not register itself — check the side-effect import above');
  }
  return render(<section.Component />);
}

describe('QuickActionsSection', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('registers itself under the "quick-actions" id with label "Quick Actions"', () => {
    const section = getSettingsSections().find((s) => s.id === 'quick-actions');
    expect(section?.label).toBe('Quick Actions');
  });

  it('checks exactly the default action set on first load', () => {
    renderQuickActionsSection();
    for (const id of DEFAULT_QUICK_ACTION_IDS) {
      const label = { 'continue-reading': 'Continue Reading', 'start-quiz': 'Start Quiz', favorites: 'Favorites', search: 'Search' }[id];
      if (label) expect(screen.getByRole('checkbox', { name: label })).toBeChecked();
    }
    expect(screen.getByRole('checkbox', { name: 'Revision' })).not.toBeChecked();
  });

  it('checking a box adds it to the saved set', () => {
    renderQuickActionsSection();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Revision' }));
    expect(JSON.parse(localStorage.getItem('quickActions') || '[]')).toContain('revision');
  });

  it('unchecking a box removes it from the saved set', () => {
    renderQuickActionsSection();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Start Quiz' }));
    expect(JSON.parse(localStorage.getItem('quickActions') || '[]')).not.toContain('start-quiz');
  });

  it('unchecking every box falls back to the default set instead of saving empty', () => {
    renderQuickActionsSection();
    for (const label of ['Continue Reading', 'Start Quiz', 'Favorites', 'Search']) {
      fireEvent.click(screen.getByRole('checkbox', { name: label }));
    }
    expect(JSON.parse(localStorage.getItem('quickActions') || '[]')).toEqual(DEFAULT_QUICK_ACTION_IDS);
  });

  it('moving an item down swaps it with its neighbor in the saved order', () => {
    renderQuickActionsSection();
    fireEvent.click(screen.getByRole('button', { name: 'Move Continue Reading down' }));
    const saved = JSON.parse(localStorage.getItem('quickActions') || '[]');
    expect(saved[0]).toBe('start-quiz');
    expect(saved[1]).toBe('continue-reading');
  });

  it('disables the up arrow for the first selected item and the down arrow for the last', () => {
    renderQuickActionsSection();
    expect(screen.getByRole('button', { name: 'Move Continue Reading up' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move Search down' })).toBeDisabled();
  });

  it('loads a previously saved, reordered subset on mount', () => {
    localStorage.setItem('quickActions', JSON.stringify(['gallery', 'search']));
    renderQuickActionsSection();
    expect(screen.getByRole('checkbox', { name: 'Gallery' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Search' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Start Quiz' })).not.toBeChecked();
  });

  it('renders the selected list in the actual saved order, not the fixed catalog order (regression: this used to always render catalog order regardless of selectedIds)', () => {
    // Catalog order is continue-reading, start-quiz, favorites, revision,
    // search, ... — this saved order is deliberately different from all
    // of that, so a test that accidentally matched catalog order by
    // coincidence wouldn't quietly pass.
    localStorage.setItem('quickActions', JSON.stringify(['search', 'gallery', 'continue-reading']));
    renderQuickActionsSection();

    const selectedList = screen.getByRole('list', { name: 'Selected quick actions, in dashboard order' });
    const labels = within(selectedList).getAllByRole('checkbox').map((el) => el.getAttribute('aria-label') ?? el.closest('label')?.textContent);
    expect(labels).toEqual(['Search', 'Gallery', 'Continue Reading']);
  });

  it('moving an item down actually re-renders it in the new position, not just in the saved value', () => {
    renderQuickActionsSection();
    const selectedList = screen.getByRole('list', { name: 'Selected quick actions, in dashboard order' });

    fireEvent.click(screen.getByRole('button', { name: 'Move Continue Reading down' }));

    const labelsAfter = within(selectedList)
      .getAllByRole('checkbox')
      .map((el) => el.closest('label')?.textContent);
    expect(labelsAfter[0]).toBe('Start Quiz');
    expect(labelsAfter[1]).toBe('Continue Reading');
  });

  it('shows unselected actions in a separate "Not shown on dashboard" list, distinct from the selected order', () => {
    renderQuickActionsSection();

    const unselectedList = screen.getByRole('list', { name: 'Unselected quick actions' });
    expect(within(unselectedList).getByRole('checkbox', { name: 'Revision' })).not.toBeChecked();

    const selectedList = screen.getByRole('list', { name: 'Selected quick actions, in dashboard order' });
    expect(within(selectedList).queryByRole('checkbox', { name: 'Revision' })).not.toBeInTheDocument();
  });

  it('moves an item from unselected to the end of the selected list when checked', () => {
    renderQuickActionsSection();

    fireEvent.click(screen.getByRole('checkbox', { name: 'Revision' }));

    const selectedList = screen.getByRole('list', { name: 'Selected quick actions, in dashboard order' });
    const labels = within(selectedList)
      .getAllByRole('checkbox')
      .map((el) => el.closest('label')?.textContent);
    expect(labels[labels.length - 1]).toBe('Revision');
  });
});
