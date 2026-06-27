import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { ThemeProvider, useTheme } from './ThemeContext';


// A simple test component that consumes the ThemeContext
function TestComponent() {
  const { theme, toggleTheme, setThemeFromAnimation } = useTheme();
  return (
    <div>
      <span data-testid="theme-value">{theme}</span>
      <button data-testid="toggle-btn" onClick={toggleTheme}>
        Toggle Theme
      </button>
      <button
        data-testid="set-dark-btn"
        onClick={() => setThemeFromAnimation(true)}
      >
        Set Dark
      </button>
      <button
        data-testid="set-light-btn"
        onClick={() => setThemeFromAnimation(false)}
      >
        Set Light
      </button>
    </div>
  );
}

describe('ThemeContext', () => {
  beforeEach(() => {
    // Clear localStorage and documentElement classes before each test
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('provides light theme as the default', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    expect(screen.getByTestId('theme-value').textContent).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('initializes with dark theme if stored in localStorage', () => {
    localStorage.setItem('theme', 'dark');

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    expect(screen.getByTestId('theme-value').textContent).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('toggles theme when toggleTheme is called', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    const toggleBtn = screen.getByTestId('toggle-btn');
    const themeVal = screen.getByTestId('theme-value');

    // Default is light
    expect(themeVal.textContent).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);

    // Toggle to dark
    act(() => {
      toggleBtn.click();
    });
    expect(themeVal.textContent).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('theme')).toBe('dark');

    // Toggle back to light
    act(() => {
      toggleBtn.click();
    });
    expect(themeVal.textContent).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(localStorage.getItem('theme')).toBe('light');
  });

  it('updates theme via setThemeFromAnimation', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    const setDarkBtn = screen.getByTestId('set-dark-btn');
    const setLightBtn = screen.getByTestId('set-light-btn');
    const themeVal = screen.getByTestId('theme-value');

    // Initially light
    expect(themeVal.textContent).toBe('light');

    // Set dark via animation trigger
    act(() => {
      setDarkBtn.click();
    });
    expect(themeVal.textContent).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('theme')).toBe('dark');

    // Set light via animation trigger
    act(() => {
      setLightBtn.click();
    });
    expect(themeVal.textContent).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(localStorage.getItem('theme')).toBe('light');
  });

  it('throws an error if useTheme is used outside ThemeProvider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // Intercept uncaught JSDOM error reports
    const handleError = (e: ErrorEvent) => {
      if (e.message.includes('useTheme must be used within a ThemeProvider')) {
        e.preventDefault();
      }
    };
    window.addEventListener('error', handleError);

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useTheme must be used within a ThemeProvider');

    window.removeEventListener('error', handleError);
    consoleSpy.mockRestore();
  });
});
