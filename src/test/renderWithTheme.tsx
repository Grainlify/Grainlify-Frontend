import type { ReactElement } from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { ThemeProvider } from '../shared/contexts/ThemeContext';

/**
 * Renders `ui` wrapped in the app's {@link ThemeProvider}.
 *
 * The provider reads the initial theme from `localStorage`, so passing
 * `theme: 'dark'` seeds it before render — useful for asserting that focus
 * styles / aria behaviour hold in both themes.
 */
export function renderWithTheme(
  ui: ReactElement,
  { theme = 'light', ...options }: { theme?: 'light' | 'dark' } & RenderOptions = {},
) {
  localStorage.setItem('theme', theme);
  return render(ui, { wrapper: ThemeProvider, ...options });
}
