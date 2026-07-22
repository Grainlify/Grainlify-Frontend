/**
 * Centralised text-color design tokens.
 *
 * These map the `--text-*` CSS variables (defined for both light and dark
 * themes in `src/styles/theme.css`) to their generated Tailwind utility
 * classes. They are the single source of truth for foreground text colors and
 * exist to replace the per-element `theme === 'dark' ? '#…' : '#…'` ternaries
 * scattered across the app.
 *
 * Because the underlying CSS variables already switch on the `.dark` class,
 * these utilities are theme-agnostic: the same class renders the correct color
 * in either theme, so callers no longer need to read `theme` to pick a color.
 *
 * Roles:
 *  - `primary`   — headings and high-emphasis body text
 *  - `secondary` — supporting / body copy
 *  - `tertiary`  — de-emphasised captions and hints
 *  - `muted`     — lowest-emphasis text (placeholders, fine print)
 *
 * @example
 * ```tsx
 * <h2 className={textColor.primary}>Title</h2>
 * <p className={textColor.secondary}>Subtitle</p>
 * ```
 */
export const textColor = {
  primary: 'text-text-primary',
  secondary: 'text-text-secondary',
  tertiary: 'text-text-tertiary',
  muted: 'text-text-muted',
} as const

/** A text-color role name accepted by {@link getTextColorClass}. */
export type TextColorRole = keyof typeof textColor

/**
 * Returns the Tailwind utility class for a given text-color role.
 *
 * @param role - The semantic text role.
 * @returns The corresponding `text-text-*` utility class.
 */
export function getTextColorClass(role: TextColorRole): string {
  return textColor[role]
}
