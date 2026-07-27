import { ToggleSwitch } from '../shared/ToggleSwitch'
import { useRef } from 'react'
import { useTheme } from '../../../../shared/contexts/ThemeContext'
import { useState } from 'react'
import { toast } from 'sonner'

interface NotificationRowProps {
  title: string
  description: string
  emailEnabled: boolean
  weeklyEnabled: boolean
  onEmailChange: (value: boolean) => void
  onWeeklyChange: (value: boolean) => void
  /** Optional read state */
  read?: boolean
  /** Async handler for mark‑as‑read */
  onMarkAsRead?: () => Promise<void>
  showBorder?: boolean
  emailDisabled?: boolean
  weeklyDisabled?: boolean
}

export function NotificationRow({
  title,
  description,
  emailEnabled,
  weeklyEnabled,
  onEmailChange,
  onWeeklyChange,
  read = false,
  onMarkAsRead,
  showBorder = true,
  emailDisabled = false,
  weeklyDisabled = false,
}: NotificationRowProps) {
  const { theme } = useTheme()
  const [optimisticRead, setOptimisticRead] = useState(read)
  const [updating, setUpdating] = useState(false)
  const processingRef = useRef(false)

  const handleMarkAsRead = () => {
    if (processingRef.current) return // prevent duplicate calls
    processingRef.current = true
    if (!onMarkAsRead) {
      processingRef.current = false
      return
    }
    setOptimisticRead(true)
    setUpdating(true)
    // Fire async without awaiting to allow optimistic UI render first
    onMarkAsRead()
      .then(() => {
        // success – keep optimistic state (already true) and clear updating flag
        setUpdating(false)
        processingRef.current = false
      })
      .catch(() => {
        // Show error and rollback after a short delay to allow optimistic UI update
        toast.error('Failed to mark notification as read.')
        setTimeout(() => {
          setOptimisticRead(false)
          setUpdating(false)
          processingRef.current = false
        }, 0)
      })
  }

  return (
    <div
      data-testid="notification-row"
      className={`grid grid-cols-[1fr_200px_220px_120px] gap-4 items-center py-5 ${showBorder ? 'border-b border-white/10' : ''} ${optimisticRead ? 'opacity-50' : ''}`}
    >
      <div>
        <div
          className={`text-[15px] font-semibold mb-1 transition-colors ${theme === 'dark' ? 'text-[#f5efe5]' : 'text-[#2d2820]'}`}
        >
          {title}
        </div>
        <div
          className={`text-[13px] transition-colors ${theme === 'dark' ? 'text-[#b8a898]' : 'text-[#7a6b5a]'}`}
        >
          {description}
        </div>
      </div>

      <div className="flex justify-center">
        <ToggleSwitch
          enabled={emailEnabled}
          onChange={onEmailChange}
          disabled={emailDisabled}
          aria-label={`Email notifications for ${title}`}
        />
      </div>

      <div className="flex justify-center">
        <ToggleSwitch
          enabled={weeklyEnabled}
          onChange={onWeeklyChange}
          disabled={weeklyDisabled}
          aria-label={`Weekly summary email for ${title}`}
        />
      </div>

      {/* Mark-as-read button, always rendered when handler provided */}
      {onMarkAsRead && (
        <div className="flex justify-center">
          <button
            onClick={handleMarkAsRead}
            disabled={updating}
            className="px-3 py-1 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Mark as read
          </button>
        </div>
      )}
    </div>
  )
}
