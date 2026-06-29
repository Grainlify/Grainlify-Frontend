// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { useState } from 'react'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Modal, ModalButton, ModalFooter, ModalInput, ModalSelect } from './Modal'
import { renderWithTheme } from '../../../test/renderWithTheme'

function ModalHarness({ title }: { title?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button onClick={() => setOpen(true)}>Open modal</button>
      <Modal isOpen={open} onClose={() => setOpen(false)} title={title}>
        <button>Inside one</button>
        <button>Inside two</button>
      </Modal>
    </>
  )
}

describe('Modal accessibility', () => {
  it('exposes role="dialog", aria-modal and is labelled by its title', () => {
    renderWithTheme(
      <Modal isOpen onClose={() => {}} title="Settings">
        <p>content</p>
      </Modal>
    )

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    // aria-labelledby points at the heading carrying the title text.
    const labelledBy = dialog.getAttribute('aria-labelledby')
    expect(labelledBy).toBeTruthy()
    expect(document.getElementById(labelledBy!)).toHaveTextContent('Settings')
    expect(dialog).not.toHaveAttribute('aria-label')
  })

  it('falls back to aria-label when no title is provided', () => {
    renderWithTheme(
      <Modal isOpen onClose={() => {}} ariaLabel="Quick actions">
        <p>content</p>
      </Modal>
    )
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-label', 'Quick actions')
    expect(dialog).not.toHaveAttribute('aria-labelledby')
  })

  it('uses a default aria-label when neither title nor ariaLabel is given', () => {
    renderWithTheme(
      <Modal isOpen onClose={() => {}}>
        <p>content</p>
      </Modal>
    )
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-label', 'Dialog')
  })

  it('does not render anything when closed', () => {
    renderWithTheme(
      <Modal isOpen={false} onClose={() => {}} title="Hidden">
        <p>content</p>
      </Modal>
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('moves focus into the dialog when opened', async () => {
    const user = userEvent.setup()
    renderWithTheme(<ModalHarness title="Settings" />)
    await user.click(screen.getByText('Open modal'))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Close dialog' })).toHaveFocus()
    })
  })

  it('traps focus and cycles with Tab / Shift+Tab', async () => {
    const user = userEvent.setup()
    renderWithTheme(<ModalHarness title="Settings" />)
    await user.click(screen.getByText('Open modal'))

    const close = screen.getByRole('button', { name: 'Close dialog' })
    const insideTwo = screen.getByText('Inside two')
    await waitFor(() => expect(close).toHaveFocus())

    // Tab on the last focusable wraps back to the first (the close button).
    insideTwo.focus()
    fireEvent.keyDown(insideTwo, { key: 'Tab' })
    expect(close).toHaveFocus()

    // Shift+Tab on the first focusable wraps to the last.
    fireEvent.keyDown(close, { key: 'Tab', shiftKey: true })
    expect(insideTwo).toHaveFocus()
  })

  it('closes on Escape', () => {
    const onClose = vi.fn()
    renderWithTheme(
      <Modal isOpen onClose={onClose} title="Settings">
        <button>Inside</button>
      </Modal>
    )
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('closes when the backdrop is clicked but not when the panel is clicked', () => {
    const onClose = vi.fn()
    renderWithTheme(
      <Modal isOpen onClose={onClose} title="Settings">
        <button>Inside</button>
      </Modal>
    )
    const dialog = screen.getByRole('dialog')
    fireEvent.click(dialog)
    expect(onClose).not.toHaveBeenCalled()

    // The backdrop is the dialog's parent element.
    fireEvent.click(dialog.parentElement!)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('closes when the close button is clicked', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    renderWithTheme(
      <Modal isOpen onClose={onClose} title="Settings">
        <button>Inside</button>
      </Modal>
    )
    await user.click(screen.getByRole('button', { name: 'Close dialog' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('returns focus to the trigger after closing', async () => {
    const user = userEvent.setup()
    renderWithTheme(<ModalHarness title="Settings" />)
    const trigger = screen.getByText('Open modal')
    await user.click(trigger)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Close dialog' })).toHaveFocus())

    await user.click(screen.getByRole('button', { name: 'Close dialog' }))
    await waitFor(() => expect(trigger).toHaveFocus())
  })

  it('adds and removes the modal-open body class', () => {
    const { rerender } = renderWithTheme(
      <Modal isOpen onClose={() => {}} title="Settings">
        <p>content</p>
      </Modal>
    )
    expect(document.body.classList.contains('modal-open')).toBe(true)

    rerender(
      <Modal isOpen={false} onClose={() => {}} title="Settings">
        <p>content</p>
      </Modal>
    )
    expect(document.body.classList.contains('modal-open')).toBe(false)
  })

  it('renders an accessible dialog in dark theme', () => {
    renderWithTheme(
      <Modal isOpen onClose={() => {}} title="Dark settings">
        <p>content</p>
      </Modal>,
      { theme: 'dark' }
    )
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true')
  })

  it('renders a footer and hides the header when no title/icon/close', () => {
    renderWithTheme(
      <Modal isOpen onClose={() => {}} showCloseButton={false} footer={<span>footer-content</span>}>
        <p>body</p>
      </Modal>
    )
    expect(screen.getByText('footer-content')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Close dialog' })).not.toBeInTheDocument()
  })
})

describe('Modal building blocks', () => {
  it('ModalFooter renders its children', () => {
    renderWithTheme(
      <ModalFooter className="extra">
        <span>foot</span>
      </ModalFooter>
    )
    expect(screen.getByText('foot')).toBeInTheDocument()
  })

  it('ModalButton (primary) fires onClick and respects disabled', async () => {
    const onClick = vi.fn()
    const user = userEvent.setup()
    const { rerender } = renderWithTheme(
      <ModalButton variant="primary" onClick={onClick}>
        Save
      </ModalButton>
    )
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(onClick).toHaveBeenCalledTimes(1)

    rerender(
      <ModalButton variant="primary" onClick={onClick} disabled>
        Save
      </ModalButton>
    )
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
  })

  it('ModalButton (secondary) renders in dark theme', async () => {
    const onClick = vi.fn()
    const user = userEvent.setup()
    renderWithTheme(<ModalButton onClick={onClick}>Cancel</ModalButton>, { theme: 'dark' })
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('ModalInput renders a labelled text field and reports changes', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    renderWithTheme(
      <ModalInput label="Name" value="" onChange={onChange} required placeholder="Your name" />
    )
    const input = screen.getByPlaceholderText('Your name')
    expect(screen.getByText('Name')).toBeInTheDocument()
    await user.type(input, 'a')
    expect(onChange).toHaveBeenCalledWith('a')
  })

  it('ModalInput renders a textarea with rows, reports changes and shows an error', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    renderWithTheme(
      <ModalInput label="Bio" value="text" onChange={onChange} rows={4} error="Required field" />,
      { theme: 'dark' }
    )
    expect(screen.getByText('Required field')).toBeInTheDocument()
    const textarea = screen.getByDisplayValue('text')
    expect(textarea.tagName).toBe('TEXTAREA')
    await user.type(textarea, '!')
    expect(onChange).toHaveBeenCalled()
  })

  it('ModalSelect renders a labelled trigger with the selected value', () => {
    renderWithTheme(
      <ModalSelect
        label="Status"
        value="open"
        onChange={() => {}}
        options={[
          { value: 'open', label: 'Open' },
          { value: 'closed', label: 'Closed' },
        ]}
      />
    )
    expect(screen.getByText('Status')).toBeInTheDocument()
    // Radix renders the selected option label inside the trigger.
    expect(screen.getByText('Open')).toBeInTheDocument()
  })

  it('ModalSelect shows an inline error and wires aria-invalid/aria-describedby', () => {
    renderWithTheme(
      <ModalSelect
        label="Status"
        value=""
        onChange={() => {}}
        required
        error="Please select a status"
        options={[
          { value: 'open', label: 'Open' },
          { value: 'closed', label: 'Closed' },
        ]}
      />,
      { theme: 'dark' }
    )

    const message = screen.getByText('Please select a status')
    expect(message).toBeInTheDocument()

    const trigger = screen.getByRole('combobox')
    expect(trigger).toHaveAttribute('aria-invalid', 'true')
    expect(trigger).toHaveAttribute('aria-describedby', message.id)
    expect(message.id).toBeTruthy()
  })

  it('ModalSelect omits error wiring when no error is set', () => {
    renderWithTheme(
      <ModalSelect
        label="Status"
        value="open"
        onChange={() => {}}
        options={[{ value: 'open', label: 'Open' }]}
      />
    )

    const trigger = screen.getByRole('combobox')
    expect(trigger).not.toHaveAttribute('aria-invalid')
    expect(trigger).not.toHaveAttribute('aria-describedby')
    expect(screen.queryByText('Please select a status')).not.toBeInTheDocument()
  })
})
