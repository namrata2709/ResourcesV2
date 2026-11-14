import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ViewModeToggle } from './ViewModeToggle';

/**
 * ViewModeToggle.test.tsx — genericity, per T3-2a's Testing spec: a
 * mode set that isn't grid/list at all (e.g. "Map"/"Timeline"),
 * confirming the component takes its modes as config, not a hardcoded pair.
 */
describe('ViewModeToggle', () => {
  it('renders arbitrary modes from config and reports the selected one', () => {
    const onChange = vi.fn();
    render(
      <ViewModeToggle
        modes={[
          { value: 'map', label: 'Map', icon: '🗺️' },
          { value: 'timeline', label: 'Timeline', icon: '📅' },
        ]}
        current="map"
        onChange={onChange}
      />,
    );

    expect(screen.getByLabelText('Map')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('Timeline')).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(screen.getByLabelText('Timeline'));
    expect(onChange).toHaveBeenCalledWith('timeline');
  });
});
