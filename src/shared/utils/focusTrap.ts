import { useEffect, useRef } from 'react'
import type { RefObject, MutableRefObject } from 'react'

/**
 * CSS selector matching elements that are, in principle, keyboard focusable.
 *
 * Note: this only encodes the *static* rules (disabled inputs, `tabindex="-1"`
 * are excluded here). Dynamic visibility (an element inside a hidden subtree)
 * is filtered separately by {@link isElementVisible} so that focus can never be
 * trapped on a control the user cannot see.
 */
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(',')

/**
 * Returns `true` when `el` can actually receive focus right now.
 *
 * This is a deliberate security boundary for the focus-trap: a malicious or
 * buggy layout must not be able to keep keyboard focus on a control that is
 * visually hidden. We therefore reject elements that are disabled, hidden via
 * the `hidden` attribute, marked `aria-hidden="true"`, collapsed with
 * `display:none`/`visibility:hidden`, or nested inside any such ancestor.
 */
export function isElementVisible(el: HTMLElement): boolean {
  if (el.hasAttribute('disabled')) return false
  if (el.hidden) return false
  if (el.getAttribute('aria-hidden') === 'true') return false
  // Reject elements nested inside a hidden / aria-hidden subtree.
  if (el.closest('[hidden]')) return false
  if (el.closest('[aria-hidden="true"]')) return false

  if (typeof window !== 'undefined' && typeof window.getComputedStyle === 'function') {
    const style = window.getComputedStyle(el)
    if (style.display === 'none' || style.visibility === 'hidden') return false
  }
  return true
}

/**
 * Collects every visible, keyboard-focusable descendant of `container`, in DOM
 * order. The list is recomputed on demand so it always reflects the current
 * tree (options can appear/disappear while a dialog is open).
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const nodes = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
  return nodes.filter(isElementVisible)
}

// ---------------------------------------------------------------------------
// Trap stack — supports nested modals (issue #446)
// ---------------------------------------------------------------------------
//
// Instead of a single global keydown listener, we maintain an ordered stack of
// active trap entries. Only the entry at the *top* of the stack (the innermost,
// most-recently-opened modal) processes Tab / Escape. When that entry is
// removed (inner modal closes), the next entry down automatically becomes the
// active trap, restoring focus containment to the outer modal without ever
// letting Tab escape to the page body.
//
// Each entry owns exactly one keydown handler. Pushing adds the handler to the
// document; popping removes it and re-enables the handler of the new top entry.

interface TrapEntry {
  container: HTMLElement
  handler: (event: KeyboardEvent) => void
}

const trapStack: TrapEntry[] = []

function pushTrap(entry: TrapEntry): void {
  // Pause the current top-of-stack handler before adding the new one so only
  // one handler is active at a time.
  if (trapStack.length > 0) {
    const current = trapStack[trapStack.length - 1]
    document.removeEventListener('keydown', current.handler)
  }
  trapStack.push(entry)
  document.addEventListener('keydown', entry.handler)
}

function popTrap(entry: TrapEntry): void {
  document.removeEventListener('keydown', entry.handler)
  const idx = trapStack.indexOf(entry)
  if (idx !== -1) {
    trapStack.splice(idx, 1)
  }
  // Re-enable the handler of whatever trap is now on top (the outer modal).
  if (trapStack.length > 0) {
    const next = trapStack[trapStack.length - 1]
    document.addEventListener('keydown', next.handler)
  }
}

// ---------------------------------------------------------------------------

/** Options accepted by {@link useFocusTrap}. */
export interface UseFocusTrapOptions {
  /** Invoked when the user presses <kbd>Escape</kbd> while the trap is active. */
  onEscape?: () => void
  /**
   * Element to focus when the trap activates. When omitted the first focusable
   * descendant is used, falling back to the container itself.
   */
  initialFocusRef?: RefObject<HTMLElement | null> | MutableRefObject<HTMLElement | null>
  /**
   * Whether focus is restored to the previously focused element when the trap
   * deactivates (default `true`). This is the "return focus to trigger"
   * behaviour required for accessible dialogs.
   */
  returnFocus?: boolean
}

/**
 * React hook that traps keyboard focus inside a container while `isActive` is
 * `true`, implementing the WAI-ARIA "modal dialog" focus contract:
 *
 * - On activation it remembers the currently focused element and moves focus
 *   into the container ({@link UseFocusTrapOptions.initialFocusRef} or the first
 *   focusable child).
 * - <kbd>Tab</kbd> / <kbd>Shift</kbd>+<kbd>Tab</kbd> cycle within the container;
 *   focus can never leave it.
 * - <kbd>Escape</kbd> invokes {@link UseFocusTrapOptions.onEscape}.
 * - On deactivation it restores focus to the original element (unless
 *   {@link UseFocusTrapOptions.returnFocus} is `false`).
 *
 * Multiple simultaneous traps are supported via an internal stack: only the
 * innermost (most-recently-activated) trap processes keyboard events. Closing
 * the inner modal automatically restores trapping to the next-outer modal
 * rather than releasing focus to the page body (fixes issue #446).
 *
 * The keydown listener is always removed on cleanup, so there are no dangling
 * listeners after unmount. Callbacks are read through a ref, so the effect
 * does not re-run (and re-steal focus) when the parent passes a new `onEscape`
 * identity on every render.
 *
 * @typeParam T - The container element type the returned ref is attached to.
 * @returns A ref to attach to the trap container element.
 */
export function useFocusTrap<T extends HTMLElement = HTMLElement>(
  isActive: boolean,
  options: UseFocusTrapOptions = {}
): MutableRefObject<T | null> {
  const { onEscape, initialFocusRef, returnFocus = true } = options
  const containerRef = useRef<T | null>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)

  // Keep the latest callback in a ref so the effect below only depends on
  // `isActive`. This prevents the trap from re-initialising (and re-grabbing
  // the "previously focused" element) on unrelated parent re-renders.
  const onEscapeRef = useRef(onEscape)
  onEscapeRef.current = onEscape

  useEffect(() => {
    if (!isActive) return
    const container = containerRef.current
    if (!container) return

    previouslyFocused.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null

    const focusInitial = () => {
      if (initialFocusRef?.current && isElementVisible(initialFocusRef.current)) {
        initialFocusRef.current.focus()
        return
      }
      const focusables = getFocusableElements(container)
      if (focusables.length > 0) {
        focusables[0].focus()
      } else {
        container.focus()
      }
    }
    focusInitial()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onEscapeRef.current?.()
        return
      }
      if (event.key !== 'Tab') return

      const focusables = getFocusableElements(container)
      if (focusables.length === 0) {
        // Nothing focusable inside: keep focus pinned to the container.
        event.preventDefault()
        container.focus()
        return
      }

      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      const active = document.activeElement

      if (event.shiftKey) {
        if (active === first || !container.contains(active)) {
          event.preventDefault()
          last.focus()
        }
      } else if (active === last || !container.contains(active)) {
        event.preventDefault()
        first.focus()
      }
    }

    const entry: TrapEntry = { container, handler: handleKeyDown }
    pushTrap(entry)

    return () => {
      popTrap(entry)
      if (returnFocus && previouslyFocused.current && isElementVisible(previouslyFocused.current)) {
        previouslyFocused.current.focus()
      }
    }
    // `onEscape` is intentionally omitted (read via ref). `initialFocusRef` is a
    // stable ref object; `returnFocus` is effectively constant per usage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive])

  return containerRef
}
