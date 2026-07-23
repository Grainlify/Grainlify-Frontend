// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { act } from 'react'
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from './sidebar'

type Listener = (event: Event) => void

function SidebarHarness() {
  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton>Item</SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
    </SidebarProvider>
  )
}

describe('Sidebar event listener lifecycle', () => {
  const origAdd = window.addEventListener.bind(window)
  const origRemove = window.removeEventListener.bind(window)

  it('registers and removes the same number of listeners across repeated mount/unmount cycles', () => {
    let addCount = 0
    let removeCount = 0

    window.addEventListener = vi.fn((type: string, listener: Listener) => {
      addCount++
      origAdd(type, listener)
    }) as typeof window.addEventListener
    window.removeEventListener = vi.fn((type: string, listener: Listener) => {
      removeCount++
      origRemove(type, listener)
    }) as typeof window.removeEventListener

    try {
      for (let i = 0; i < 5; i++) {
        const result = render(<SidebarHarness />)
        act(() => result.unmount())
      }
      expect(addCount).toBe(removeCount)
      expect(addCount).toBeGreaterThan(0)
    } finally {
      window.addEventListener = origAdd
      window.removeEventListener = origRemove
    }
  })

  it('adds and removes the exact same callback reference for window keydown', () => {
    const addedCallbacks: Listener[] = []
    const removedCallbacks: Listener[] = []

    window.addEventListener = vi.fn((type: string, listener: Listener) => {
      if (type === 'keydown') addedCallbacks.push(listener)
      origAdd(type, listener)
    }) as typeof window.addEventListener
    window.removeEventListener = vi.fn((type: string, listener: Listener) => {
      if (type === 'keydown') removedCallbacks.push(listener)
      origRemove(type, listener)
    }) as typeof window.removeEventListener

    try {
      const result = render(<SidebarHarness />)
      act(() => result.unmount())

      expect(addedCallbacks.length).toBeGreaterThanOrEqual(1)
      expect(removedCallbacks.length).toBeGreaterThanOrEqual(1)

      for (const fn of addedCallbacks) {
        expect(removedCallbacks).toContain(fn)
      }
    } finally {
      window.addEventListener = origAdd
      window.removeEventListener = origRemove
    }
  })

  it('does not fire stale keyboard handler after unmount', () => {
    const registered = new Set<Listener>()

    window.addEventListener = vi.fn((type: string, listener: Listener) => {
      if (type === 'keydown') registered.add(listener)
      origAdd(type, listener)
    }) as typeof window.addEventListener
    window.removeEventListener = vi.fn((type: string, listener: Listener) => {
      if (type === 'keydown') registered.delete(listener)
      origRemove(type, listener)
    }) as typeof window.removeEventListener

    try {
      const result = render(<SidebarHarness />)
      const handlersBeforeUnmount = new Set(registered)

      act(() => result.unmount())

      for (const handler of handlersBeforeUnmount) {
        expect(registered.has(handler)).toBe(false)
      }
    } finally {
      window.addEventListener = origAdd
      window.removeEventListener = origRemove
    }
  })

  it('uses the same function identity for add and remove on window', () => {
    const pairs = new Map<string, { added: Listener[]; removed: Listener[] }>()

    window.addEventListener = vi.fn((type: string, listener: Listener) => {
      if (!pairs.has(type)) pairs.set(type, { added: [], removed: [] })
      pairs.get(type)!.added.push(listener)
      origAdd(type, listener)
    }) as typeof window.addEventListener
    window.removeEventListener = vi.fn((type: string, listener: Listener) => {
      if (!pairs.has(type)) pairs.set(type, { added: [], removed: [] })
      pairs.get(type)!.removed.push(listener)
      origRemove(type, listener)
    }) as typeof window.removeEventListener

    try {
      const result = render(<SidebarHarness />)
      act(() => result.unmount())

      for (const [, { added, removed }] of pairs) {
        for (const fn of added) {
          expect(removed).toContain(fn)
        }
      }
    } finally {
      window.addEventListener = origAdd
      window.removeEventListener = origRemove
    }
  })
})

describe('useIsMobile matchMedia listener lifecycle', () => {
  it('cleans up matchMedia change listener on unmount', () => {
    const added: Listener[] = []
    const removed: Listener[] = []

    const mockMql = {
      matches: false,
      media: '(max-width: 767px)',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn((_type: string, handler: Listener) => {
        added.push(handler)
      }),
      removeEventListener: vi.fn((_type: string, handler: Listener) => {
        const idx = added.indexOf(handler)
        if (idx >= 0) removed.push(handler)
      }),
      dispatchEvent: vi.fn(),
    }

    const originalMatchMedia = window.matchMedia
    window.matchMedia = vi.fn().mockReturnValue(mockMql)

    try {
      const result = render(<SidebarHarness />)

      expect(mockMql.addEventListener).toHaveBeenCalledWith('change', expect.any(Function))
      const addedCount = added.length

      act(() => result.unmount())

      expect(mockMql.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function))
      expect(removed.length).toBe(addedCount)
    } finally {
      window.matchMedia = originalMatchMedia
    }
  })
})
