'use client'

import * as React from 'react'
import { format } from 'date-fns'
import { Calendar as CalendarIcon } from 'lucide-react'
import { Calendar } from './calendar'
import { Popover, PopoverContent, PopoverTrigger } from './popover'
import { useTheme } from '../../contexts/ThemeContext'
import { cn } from './utils'

interface DatePickerProps {
  label?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
  className?: string
  error?: string | null
}

/**
 * Helper to parse a YYYY-MM-DD string into a UTC Date object.
 * Returns undefined if the string is empty or invalid.
 *
 * @param value The date string in YYYY-MM-DD format
 */
export function parseUtcDate(value: string): Date | undefined {
  if (!value) return undefined
  const [year, month, day] = value.split('-').map(Number)
  if (isNaN(year) || isNaN(month) || isNaN(day)) return undefined
  return new Date(Date.UTC(year, month - 1, day))
}

/**
 * Helper to format a UTC Date object using date-fns format.
 * To avoid DST/timezone offset transitions shifting the day,
 * we map the UTC date digits to a local Date object at noon (12:00:00).
 *
 * @param date The Date object in UTC to format
 * @param formatStr The date-fns format template string
 */
export function formatUtcDate(date: Date, formatStr: string): string {
  const localNoonDate = new Date(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    12, // Noon avoids timezone offset DST shift boundaries
    0,
    0
  )
  return format(localNoonDate, formatStr)
}

/**
 * DatePicker component designed to prevent off-by-one day errors in non-UTC timezones.
 *
 * ## Timezone Convention
 * Input parsing and display formatting use a consistent UTC basis.
 * - Value: Passed as a `YYYY-MM-DD` string, representing the date in UTC.
 * - Parse: Parsed using `Date.UTC` to construct a UTC Date object.
 * - Display: Formatted by mapping UTC date parts to a local Date object at noon, preventing
 *   local timezone offset calculations (like `date-fns` format) from shifting the date across
 *   day/DST boundaries.
 * - Calendar selection: Highlights the correct day by passing a local Date object mapped to the UTC
 *   digits at noon, and formats the selected local Date back to `YYYY-MM-DD` in local time.
 */
export function DatePicker({
  label,
  value,
  onChange,
  placeholder = 'Pick a date',
  required = false,
  className = '',
  error,
}: DatePickerProps) {
  const { theme } = useTheme()
  const [open, setOpen] = React.useState(false)
  const triggerRef = React.useRef<HTMLButtonElement>(null)

  const isError = !!error

  const date = React.useMemo(() => {
    if (!value) return undefined
    try {
      const [year, month, day] = value.split('-').map(Number)
      return new Date(Date.UTC(year, month - 1, day))
    } catch {
      return undefined
    }
  }, [value])

  // Construct a local Date at noon from the UTC date digits so react-day-picker
  // (which compares dates in local time) highlights the correct calendar day.
  const calendarSelected = React.useMemo(() => {
    if (!date) return undefined
    return new Date(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      12 // Noon prevents shifting to previous/next day during DST changes
    )
  }, [date])

  const handleSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      onChange(format(selectedDate, 'yyyy-MM-dd'))
      setOpen(false)
      // Return focus to trigger after selection
      triggerRef.current?.focus()
    }
  }

  const inputClasses = cn(
    'w-full px-4 py-3 rounded-[14px] backdrop-blur-[30px] border focus:outline-none transition-all text-[14px] flex items-center justify-between',
    isError
      ? theme === 'dark'
        ? 'border-red-500/40'
        : 'border-red-500/40'
      : theme === 'dark'
        ? 'border-white/15'
        : 'border-white/25',
    className
  )

  return (
    <div>
      {label && (
        <label className="block text-[13px] font-medium mb-2">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            ref={triggerRef}
            type="button"
            className={inputClasses}
            aria-haspopup="dialog"
            aria-expanded={open}
          >
            <span>{date ? format(date, 'MMM dd, yyyy') : placeholder}</span>
            <CalendarIcon className="h-4 w-4 opacity-50" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-0 z-[10001]"
          onEscapeKeyDown={() => {
            setOpen(false)
            triggerRef.current?.focus()
          }}
        >
          <Calendar
            mode="single"
            selected={calendarSelected}
            onSelect={handleSelect}
            initialFocus
          />
        </PopoverContent>
      </Popover>
      {isError && <p className="text-[12px] mt-1.5 text-red-500">{error}</p>}
    </div>
  )
}
