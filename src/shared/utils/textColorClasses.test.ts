import { describe, it, expect } from 'vitest'
import { textColor, getTextColorClass, type TextColorRole } from './textColorClasses'

describe('textColorClasses', () => {
  it('maps each role to its Tailwind token utility class', () => {
    expect(textColor.primary).toBe('text-text-primary')
    expect(textColor.secondary).toBe('text-text-secondary')
    expect(textColor.tertiary).toBe('text-text-tertiary')
    expect(textColor.muted).toBe('text-text-muted')
  })

  it('getTextColorClass returns the same class as the map', () => {
    const roles: TextColorRole[] = ['primary', 'secondary', 'tertiary', 'muted']
    for (const role of roles) {
      expect(getTextColorClass(role)).toBe(textColor[role])
    }
  })

  it('exposes exactly the four documented roles', () => {
    expect(Object.keys(textColor).sort()).toEqual(['muted', 'primary', 'secondary', 'tertiary'])
  })
})
