// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useState } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  getFocusableElements,
  isElementVisible,
  useFocusTrap,
} from './focusTrap';

describe('isElementVisible', () => {
  it('accepts a plain, visible element', () => {
    const button = document.createElement('button');
    document.body.appendChild(button);
    expect(isElementVisible(button)).toBe(true);
  });

  it('rejects disabled, hidden and aria-hidden elements', () => {
    const disabled = document.createElement('button');
    disabled.setAttribute('disabled', '');
    const hidden = document.createElement('button');
    hidden.hidden = true;
    const ariaHidden = document.createElement('button');
    ariaHidden.setAttribute('aria-hidden', 'true');

    expect(isElementVisible(disabled)).toBe(false);
    expect(isElementVisible(hidden)).toBe(false);
    expect(isElementVisible(ariaHidden)).toBe(false);
  });

  it('rejects elements with display:none or visibility:hidden', () => {
    const none = document.createElement('button');
    none.style.display = 'none';
    document.body.appendChild(none);
    const invisible = document.createElement('button');
    invisible.style.visibility = 'hidden';
    document.body.appendChild(invisible);

    expect(isElementVisible(none)).toBe(false);
    expect(isElementVisible(invisible)).toBe(false);
  });

  it('rejects controls nested inside a hidden / aria-hidden subtree', () => {
    const wrapper = document.createElement('div');
    wrapper.setAttribute('aria-hidden', 'true');
    const nested = document.createElement('button');
    wrapper.appendChild(nested);
    document.body.appendChild(wrapper);

    // Security boundary: focus must never land on a control the user can't see.
    expect(isElementVisible(nested)).toBe(false);
  });
});

describe('getFocusableElements', () => {
  it('returns only the visible, focusable descendants in DOM order', () => {
    const container = document.createElement('div');
    container.innerHTML = `
      <a href="#one">link</a>
      <button>btn</button>
      <button disabled>nope</button>
      <input />
      <div tabindex="0">tab0</div>
      <div tabindex="-1">skip</div>
      <button hidden>hidden</button>
      <span aria-hidden="true"><button>aria</button></span>
    `;
    document.body.appendChild(container);

    const focusables = getFocusableElements(container);
    const labels = focusables.map((el) => el.textContent?.trim() ?? el.tagName);

    // The input contributes an empty label; disabled/tabindex=-1/hidden/aria-hidden are excluded.
    expect(labels).toEqual(['link', 'btn', '', 'tab0']);
    expect(focusables.some((el) => el.tagName === 'INPUT')).toBe(true);
    expect(focusables).toHaveLength(4);
  });
});

function TrapHarness({
  onEscape,
  returnFocus,
  withFocusable = true,
}: {
  onEscape?: () => void;
  returnFocus?: boolean;
  withFocusable?: boolean;
}) {
  const [active, setActive] = useState(false);
  const ref = useFocusTrap<HTMLDivElement>(active, { onEscape, returnFocus });
  return (
    <div>
      <button onClick={() => setActive(true)}>open</button>
      {active && (
        <div ref={ref} data-testid="trap" tabIndex={-1}>
          {withFocusable && (
            <>
              <button>first</button>
              <button>last</button>
            </>
          )}
          <button onClick={() => setActive(false)}>do-close</button>
        </div>
      )}
    </div>
  );
}

describe('useFocusTrap', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('moves focus into the container on activation', async () => {
    const user = userEvent.setup();
    render(<TrapHarness />);
    await user.click(screen.getByText('open'));

    await waitFor(() => {
      expect(screen.getByText('first')).toHaveFocus();
    });
  });

  it('wraps focus forward from the last element and backward from the first', async () => {
    const user = userEvent.setup();
    render(<TrapHarness />);
    await user.click(screen.getByText('open'));

    const first = screen.getByText('first');
    const close = screen.getByText('do-close');

    // Tab on the last focusable wraps to the first.
    close.focus();
    fireEvent.keyDown(close, { key: 'Tab' });
    expect(first).toHaveFocus();

    // Shift+Tab on the first focusable wraps to the last.
    fireEvent.keyDown(first, { key: 'Tab', shiftKey: true });
    expect(close).toHaveFocus();
  });

  it('invokes onEscape when Escape is pressed', async () => {
    const onEscape = vi.fn();
    const user = userEvent.setup();
    render(<TrapHarness onEscape={onEscape} />);
    await user.click(screen.getByText('open'));

    fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    expect(onEscape).toHaveBeenCalledTimes(1);
  });

  it('restores focus to the trigger on deactivation by default', async () => {
    const user = userEvent.setup();
    render(<TrapHarness />);
    const openButton = screen.getByText('open');
    await user.click(openButton);
    await waitFor(() => expect(screen.getByText('first')).toHaveFocus());

    await user.click(screen.getByText('do-close'));
    await waitFor(() => expect(openButton).toHaveFocus());
  });

  it('does not restore focus when returnFocus is false', async () => {
    const user = userEvent.setup();
    render(<TrapHarness returnFocus={false} />);
    const openButton = screen.getByText('open');
    await user.click(openButton);
    await waitFor(() => expect(screen.getByText('first')).toHaveFocus());

    await user.click(screen.getByText('do-close'));
    await waitFor(() => expect(openButton).not.toHaveFocus());
  });

  it('pins focus to the container when there is nothing else focusable', async () => {
    const user = userEvent.setup();
    render(<TrapHarness withFocusable={false} />);
    await user.click(screen.getByText('open'));

    const trap = screen.getByTestId('trap');
    // The only focusable child is the close button; Tab keeps focus inside.
    fireEvent.keyDown(screen.getByText('do-close'), { key: 'Tab' });
    expect(trap.contains(document.activeElement)).toBe(true);
  });

  it('focuses and pins the container when it has zero focusable children', () => {
    function EmptyTrap() {
      const ref = useFocusTrap<HTMLDivElement>(true, {});
      return <div ref={ref} data-testid="empty-trap" tabIndex={-1} />;
    }
    render(<EmptyTrap />);
    const trap = screen.getByTestId('empty-trap');
    // On activation focus falls back to the container itself...
    expect(trap).toHaveFocus();
    // ...and Tab keeps it there because there is nothing to cycle through.
    fireEvent.keyDown(trap, { key: 'Tab' });
    expect(trap).toHaveFocus();
  });
});
