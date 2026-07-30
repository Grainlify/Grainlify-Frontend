'use client'

import * as React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { DayPicker, type DayButtonProps } from 'react-day-picker'

import { cn } from './utils'

const navButtonClassNames = cn(
  'size-7 bg-transparent p-0 opacity-50 hover:opacity-100 border border-border text-foreground hover:bg-accent hover:text-accent-foreground rounded-md transition-colors'
)

function CalendarDayButton({ className, day, modifiers, ...props }: DayButtonProps) {
  const ref = React.useRef<HTMLButtonElement>(null)

  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus()
  }, [modifiers.focused])

  return (
    <button
      ref={ref}
      type="button"
      data-day={day.date.toDateString()}
      data-selected={modifiers.selected || undefined}
      data-range-start={modifiers.range_start || undefined}
      data-range-end={modifiers.range_end || undefined}
      data-range-middle={modifiers.range_middle || undefined}
      data-today={modifiers.today || undefined}
      data-outside={modifiers.outside || undefined}
      className={cn(
        'size-8 p-0 font-normal rounded-md transition-colors hover:bg-accent hover:text-accent-foreground text-foreground',
        'data-[outside=true]:text-muted-foreground',
        'data-[today=true]:bg-accent data-[today=true]:text-accent-foreground data-[today=true]:border data-[today=true]:border-border',
        'data-[range-middle=true]:bg-accent data-[range-middle=true]:text-accent-foreground',
        'data-[selected=true]:bg-[#c9983a] data-[selected=true]:text-white data-[selected=true]:hover:bg-[#c9983a]/90 data-[selected=true]:focus:bg-[#c9983a] data-[selected=true]:focus:text-white',
        'data-[range-start=true]:bg-[#c9983a] data-[range-start=true]:text-white',
        'data-[range-end=true]:bg-[#c9983a] data-[range-end=true]:text-white',
        'disabled:text-muted-foreground disabled:opacity-50',
        className
      )}
      {...props}
    />
  )
}

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('p-3', className)}
      classNames={{
        months: 'flex flex-col sm:flex-row gap-2',
        month: 'flex flex-col gap-4',
        month_caption: 'flex justify-center pt-1 relative items-center w-full',
        caption_label: 'text-sm font-medium',
        nav: 'flex items-center gap-1',
        button_previous: cn(navButtonClassNames, 'absolute left-1'),
        button_next: cn(navButtonClassNames, 'absolute right-1'),
        month_grid: 'w-full border-collapse space-x-1',
        weekdays: 'flex',
        weekday: 'text-muted-foreground rounded-md w-8 font-normal text-[0.8rem]',
        week: 'flex w-full mt-2',
        day: cn(
          'relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([data-selected=true])]:bg-accent',
          props.mode === 'range'
            ? '[&:has([data-range-end=true])]:rounded-r-md [&:has([data-range-start=true])]:rounded-l-md first:[&:has([data-selected=true])]:rounded-l-md last:[&:has([data-selected=true])]:rounded-r-md'
            : '[&:has([data-selected=true])]:rounded-md'
        ),
        hidden: 'invisible',
        ...classNames,
      }}
      components={{
        Chevron: ({ className: chevronClassName, orientation }) =>
          orientation === 'right' ? (
            <ChevronRight className={cn('size-4 text-foreground', chevronClassName)} />
          ) : (
            <ChevronLeft className={cn('size-4 text-foreground', chevronClassName)} />
          ),
        DayButton: CalendarDayButton,
      }}
      {...props}
    />
  )
}

export { Calendar }
