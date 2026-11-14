import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LiteModeSection } from './LiteModeSection';

describe('LiteModeSection', () => {
  it('renders children when Lite Mode is off, regardless of module tag', () => {
    render(
      <LiteModeSection moduleId="mcq" liteMode={false}>
        <div data-testid="section-header">MCQ heading</div>
        <div>MCQ body</div>
      </LiteModeSection>,
    );
    expect(screen.getByTestId('section-header')).toBeInTheDocument();
    expect(screen.getByText('MCQ body')).toBeInTheDocument();
  });

  it('renders children when Lite Mode is on and the module is core', () => {
    render(
      <LiteModeSection moduleId="bodyProse" liteMode={true}>
        <div>Body prose content</div>
      </LiteModeSection>,
    );
    expect(screen.getByText('Body prose content')).toBeInTheDocument();
  });

  it('hides the whole section — including its own heading — when Lite Mode is on and the module is interactive', () => {
    const { container } = render(
      <LiteModeSection moduleId="mcq" liteMode={true}>
        <div data-testid="section-header">MCQ heading</div>
        <div>MCQ body</div>
      </LiteModeSection>,
    );
    expect(screen.queryByTestId('section-header')).not.toBeInTheDocument();
    expect(screen.queryByText('MCQ body')).not.toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();
  });

  it('hides a links-tagged module when Lite Mode is on', () => {
    render(
      <LiteModeSection moduleId="leetcode" liteMode={true}>
        <div>LeetCode Problems</div>
      </LiteModeSection>,
    );
    expect(screen.queryByText('LeetCode Problems')).not.toBeInTheDocument();
  });
});
