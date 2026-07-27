import { NotificationsDropdown } from '../../shared/components/NotificationsDropdown'

export default function Header() {
  return (
    <header data-testid="real-header">
      <NotificationsDropdown showMobileNav={false} closeMobileNav={() => {}} />
    </header>
  )
}
