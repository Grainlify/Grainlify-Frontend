import type { ReactElement, ReactNode } from 'react'
import { render, type RenderOptions } from '@testing-library/react'
import { ThemeProvider } from '../shared/contexts/ThemeContext'
import { I18nProvider } from '../shared/i18n'

/**
 * Renders `ui` wrapped in the app's {@link ThemeProvider}.
 *
 * The provider reads the initial theme from `localStorage`, so passing
 * `theme: 'dark'` seeds it before render — useful for asserting that focus
 * styles / aria behaviour hold in both themes.
 */
export function renderWithTheme(
  ui: ReactElement,
  { theme = 'light', ...options }: { theme?: 'light' | 'dark' } & RenderOptions = {}
) {
  localStorage.setItem('theme', theme)
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <I18nProvider>
      <ThemeProvider>{children}</ThemeProvider>
    </I18nProvider>
  )

  return render(ui, { wrapper: Wrapper, ...options })
}
