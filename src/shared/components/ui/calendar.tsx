'use client'

import * as React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { DayPicker } from 'react-day-picker'

import { cn } from './utils'

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
      classNames={
        {
          months: 'flex flex-col sm:flex-row gap-2',
          month: 'flex flex-col gap-4',
          month_caption: 'flex justify-center pt-1 relative items-center w-full',
          caption_label: 'text-sm font-medium',
          nav: 'flex items-center gap-1',
          button_previous: cn(
            'size-7 bg-transparent p-0 opacity-50 hover:opacity-100 border border-border text-foreground hover:bg-accent hover:text-accent-foreground rounded-md transition-colors absolute left-1'
          ),
          button_next: cn(
            'size-7 bg-transparent p-0 opacity-50 hover:opacity-100 border border-border text-foreground hover:bg-accent hover:text-accent-foreground rounded-md transition-colors absolute right-1'
          ),
          month_grid: 'w-full border-collapse space-x-1',
          weekdays: 'flex',
          weekday: 'text-muted-foreground rounded-md w-8 font-normal text-[0.8rem]',
          week: 'flex w-full mt-2',
          day: cn(
            'relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-accent [&:has([aria-selected].day-range-end)]:rounded-r-md',
            props.mode === 'range'
              ? '[&:has(>.day-range-end)]:rounded-r-md [&:has(>.day-range-start)]:rounded-l-md first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md'
              : '[&:has([aria-selected])]:rounded-md'
          ),
          day_button: cn(
            'size-8 p-0 font-normal aria-selected:opacity-100 rounded-md transition-colors hover:bg-accent hover:text-accent-foreground text-foreground'
          ),
          range_start: 'day-range-start aria-selected:bg-[#c9983a] aria-selected:text-white',
          range_end: 'day-range-end aria-selected:bg-[#c9983a] aria-selected:text-white',
          selected:
            'bg-[#c9983a] text-white hover:bg-[#c9983a]/90 focus:bg-[#c9983a] focus:text-white',
          today: 'bg-accent text-accent-foreground border border-border',
          outside: 'day-outside text-muted-foreground aria-selected:text-muted-foreground',
          disabled: 'text-muted-foreground opacity-50',
          range_middle: 'aria-selected:bg-accent aria-selected:text-accent-foreground',
          hidden: 'invisible',
          ...classNames,
        }
      }
      components={{
        Chevron: ({ orientation, className, ...rest }: { className?: string; size?: number; disabled?: boolean; orientation?: 'up' | 'down' | 'left' | 'right' }) => {
          const Icon = orientation === 'right' ? ChevronRight : ChevronLeft
          return <Icon className={cn('size-4 text-foreground', className)} {...rest} />
        },
      }}
      {...props}
    />
  )
}

export { Calendar }