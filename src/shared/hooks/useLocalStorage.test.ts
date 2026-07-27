// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useLocalStorage } from './useLocalStorage'

const STORAGE_KEY = 'use-local-storage-test'
const DEFAULT_VALUE = 'default value'

const validateString = (parsed: unknown) => (typeof parsed === 'string' ? parsed : null)

describe('useLocalStorage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('reads and validates an existing value from localStorage', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify('stored value'))

    const { result } = renderHook(() => useLocalStorage(STORAGE_KEY, DEFAULT_VALUE, validateString))

    expect(result.current[0]).toBe('stored value')
  })

  it('uses the default when validation rejects parsed storage', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(42))

    const { result } = renderHook(() => useLocalStorage(STORAGE_KEY, DEFAULT_VALUE, validateString))

    expect(result.current[0]).toBe(DEFAULT_VALUE)
  })

  it('writes a new value to localStorage and updates state', () => {
    const { result } = renderHook(() => useLocalStorage(STORAGE_KEY, DEFAULT_VALUE, validateString))

    act(() => {
      result.current[1]('updated value')
    })

    expect(result.current[0]).toBe('updated value')
    expect(localStorage.getItem(STORAGE_KEY)).toBe(JSON.stringify('updated value'))
  })

  it('does not throw and uses the default when localStorage.getItem throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('localStorage is unavailable')
    })

    let storedValue: string | undefined

    expect(() => {
      const { result } = renderHook(() =>
        useLocalStorage(STORAGE_KEY, DEFAULT_VALUE, validateString)
      )
      storedValue = result.current[0]
    }).not.toThrow()
    expect(storedValue).toBe(DEFAULT_VALUE)
  })

  it('does not throw and uses the default when localStorage is absent', () => {
    const localStorageDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
    if (!localStorageDescriptor) throw new Error('Expected localStorage to exist in jsdom')

    const wasDeleted = Reflect.deleteProperty(globalThis, 'localStorage')
    let storedValue: string | undefined

    try {
      expect(wasDeleted).toBe(true)
      expect('localStorage' in globalThis).toBe(false)
      expect(() => {
        const { result } = renderHook(() =>
          useLocalStorage(STORAGE_KEY, DEFAULT_VALUE, validateString)
        )
        storedValue = result.current[0]
      }).not.toThrow()
    } finally {
      Object.defineProperty(globalThis, 'localStorage', localStorageDescriptor)
    }

    expect(storedValue).toBe(DEFAULT_VALUE)
  })

  it('does not throw and uses the default for corrupted non-JSON storage', () => {
    localStorage.setItem(STORAGE_KEY, 'not valid JSON')

    let storedValue: string | undefined

    expect(() => {
      const { result } = renderHook(() =>
        useLocalStorage(STORAGE_KEY, DEFAULT_VALUE, validateString)
      )
      storedValue = result.current[0]
    }).not.toThrow()
    expect(storedValue).toBe(DEFAULT_VALUE)
  })

  it('does not throw and still updates state when localStorage.setItem throws', () => {
    const { result } = renderHook(() => useLocalStorage(STORAGE_KEY, DEFAULT_VALUE, validateString))
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('localStorage quota exceeded')
    })

    expect(() => {
      act(() => {
        result.current[1]('updated value')
      })
    }).not.toThrow()
    expect(setItem).toHaveBeenCalledWith(STORAGE_KEY, JSON.stringify('updated value'))
    expect(result.current[0]).toBe('updated value')
  })
})
