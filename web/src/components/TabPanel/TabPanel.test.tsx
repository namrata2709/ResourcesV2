import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TabPanel } from './TabPanel';

const TABS = [
  { id: 'python', label: 'Python', content: <pre>print("hi")</pre> },
  { id: 'java', label: 'Java', content: <pre>System.out.println("hi");</pre> },
  { id: 'cpp', label: 'C++', content: <pre>std::cout &lt;&lt; "hi";</pre> },
];

describe('TabPanel', () => {
  it('renders a tablist with the first tab active and its panel shown', () => {
    render(<TabPanel ariaLabel="Code language" tabs={TABS} />);
    expect(screen.getByRole('tablist', { name: 'Code language' })).toBeInTheDocument();
    const pythonTab = screen.getByRole('tab', { name: 'Python' });
    expect(pythonTab).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel')).toHaveTextContent('print("hi")');
  });

  it('switches the active panel on click, only rendering the active pane', async () => {
    const user = userEvent.setup();
    render(<TabPanel ariaLabel="Code language" tabs={TABS} />);
    await user.click(screen.getByRole('tab', { name: 'Java' }));
    expect(screen.getByRole('tab', { name: 'Java' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Python' })).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('tabpanel')).toHaveTextContent('System.out.println');
    expect(screen.queryByText('print("hi")')).not.toBeInTheDocument();
  });

  it('supports Left/Right/Home/End arrow-key navigation between tabs', async () => {
    const user = userEvent.setup();
    render(<TabPanel ariaLabel="Code language" tabs={TABS} />);
    screen.getByRole('tab', { name: 'Python' }).focus();

    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Java' })).toHaveFocus();
    expect(screen.getByRole('tab', { name: 'Java' })).toHaveAttribute('aria-selected', 'true');

    await user.keyboard('{End}');
    expect(screen.getByRole('tab', { name: 'C++' })).toHaveFocus();
    expect(screen.getByRole('tab', { name: 'C++' })).toHaveAttribute('aria-selected', 'true');

    await user.keyboard('{Home}');
    expect(screen.getByRole('tab', { name: 'Python' })).toHaveFocus();

    await user.keyboard('{ArrowLeft}');
    expect(screen.getByRole('tab', { name: 'C++' })).toHaveFocus();
  });

  it('supports controlled mode via activeTabId/onTabChange, same shape the Visualisation Images/Animation toggle will use', async () => {
    const user = userEvent.setup();
    const onTabChange = vi.fn();
    const { rerender } = render(
      <TabPanel ariaLabel="Visualisation" tabs={TABS} activeTabId="java" onTabChange={onTabChange} />,
    );
    expect(screen.getByRole('tab', { name: 'Java' })).toHaveAttribute('aria-selected', 'true');

    await user.click(screen.getByRole('tab', { name: 'C++' }));
    expect(onTabChange).toHaveBeenCalledWith('cpp');
    // Controlled: activeTabId prop hasn't changed yet, so still shows Java
    // until the caller re-renders with the new value — same convention
    // as any other controlled React component.
    rerender(<TabPanel ariaLabel="Visualisation" tabs={TABS} activeTabId="cpp" onTabChange={onTabChange} />);
    expect(screen.getByRole('tab', { name: 'C++' })).toHaveAttribute('aria-selected', 'true');
  });

  it('renders nothing for an empty tabs array', () => {
    const { container } = render(<TabPanel ariaLabel="Empty" tabs={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
