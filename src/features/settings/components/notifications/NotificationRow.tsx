import { useState } from 'react'
import { toast } from 'sonner'
import { ToggleSwitch } from '../shared/ToggleSwitch'
import { useTheme } from '../../../../shared/contexts/ThemeContext'

/**
 * Props for the NotificationRow component.
 */
interface NotificationRowProps {
  /** The title of the notification setting. */
  title: string
  /** A description of the notification setting. */
  description: string
  /** The current state of the email notification setting. */
  emailEnabled: boolean
  /** The current state of the weekly notification setting. */
  weeklyEnabled: boolean
  /**
   * A callback function that is called when the email notification setting is changed.
   * It should return a promise that resolves to true if the update was successful, and false otherwise.
   */
  onEmailChange: (value: boolean) => Promise<boolean>
  /**
   * A callback function that is called when the weekly notification setting is changed.
   * It should return a promise that resolves to true if the update was successful, and false otherwise.
   */
  onWeeklyChange: (value: boolean) => Promise<boolean>
  /** Whether to show a border at the bottom of the row. */
  showBorder?: boolean
  /** Whether the email toggle should be disabled. */
  emailDisabled?: boolean
  /** Whether the weekly toggle should be disabled. */
  weeklyDisabled?: boolean
}

/**
 * A component that displays a single notification setting row with toggles for email and weekly notifications.
 * It handles the pending and error states for updating the notification settings.
 */
export function NotificationRow({
  title,
  description,
  emailEnabled,
  weeklyEnabled,
  onEmailChange,
  onWeeklyChange,
  showBorder = true,
  emailDisabled = false,
  weeklyDisabled = false,
}: NotificationRowProps) {
  const { theme } = useTheme()
  const [isEmailPending, setIsEmailPending] = useState(false)
  const [isWeeklyPending, setIsWeeklyPending] = useState(false)

  const handleEmailChange = async (newVal: boolean) => {
    setIsEmailPending(true)
    const success = await onEmailChange(newVal)
    if (!success) {
      toast.error(`Failed to update ${title} email preference.`)
    }
    setIsEmailPending(false)
  }

  const handleWeeklyChange = async (newVal: boolean) => {
    setIsWeeklyPending(true)
    const success = await onWeeklyChange(newVal)
    if (!success) {
      toast.error(`Failed to update ${title} weekly preference.`)
    }
    setIsWeeklyPending(false)
  }

  return (
    <div
      className={`grid grid-cols-[1fr_200px_220px] gap-4 items-center py-5 ${showBorder ? 'border-b border-white/10' : ''}`}
    >
      <div>
        <div
          className={`text-[15px] font-semibold mb-1 transition-colors ${
            theme === 'dark' ? 'text-[#f5efe5]' : 'text-[#2d2820]'
          }`}
        >
          {title}
        </div>
        <div
          className={`text-[13px] transition-colors ${
            theme === 'dark' ? 'text-[#b8a898]' : 'text-[#7a6b5a]'
          }`}
        >
          {description}
        </div>
      </div>
      <div className="flex justify-center">
        <ToggleSwitch
          enabled={emailEnabled}
          onChange={handleEmailChange}
          disabled={emailDisabled || isEmailPending}
          aria-label={`Email notification preference for ${title}`}
        />
      </div>
      <div className="flex justify-center">
        <ToggleSwitch
          enabled={weeklyEnabled}
          onChange={handleWeeklyChange}
          disabled={weeklyDisabled || isWeeklyPending}
          aria-label={`Weekly digest notification preference for ${title}`}
        />
      </div>
    </div>
  )
}
