import { useId } from 'react'
import { LOCALES, type Locale } from './messages'
import { useLocale } from './LocaleProvider'

/** Props for {@link LocaleSwitcher}. */
export interface LocaleSwitcherProps {
  /** Optional visible label. Defaults to "Language". */
  label?: string
  className?: string
}

/**
 * Accessible language selector. Renders a native `<select>` of all supported
 * {@link LOCALES} and updates the active locale (which {@link LocaleProvider}
 * persists) on change. Must be rendered within a {@link LocaleProvider}.
 *
 * A native `<select>` is used deliberately: it is keyboard- and
 * screen-reader-accessible out of the box and needs no extra ARIA wiring.
 */
export function LocaleSwitcher({ label = 'Language', className = '' }: LocaleSwitcherProps) {
  const { locale, setLocale } = useLocale()
  const selectId = useId()

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <label htmlFor={selectId} className="text-[13px] font-medium">
        {label}
      </label>
      <select
        id={selectId}
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
        className="px-4 py-2.5 rounded-[12px] border border-white/25 bg-white/[0.15] text-[14px] focus:outline-none focus:border-[#c9983a]/50"
      >
        {LOCALES.map(({ code, label: name }) => (
          <option key={code} value={code}>
            {name}
          </option>
        ))}
      </select>
    </div>
  )
}
