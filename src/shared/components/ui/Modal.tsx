import React, { ReactNode, useId } from 'react';
import { X, ChevronDown, Check } from 'lucide-react';
import * as Select from '@radix-ui/react-select';
import { useFocusTrap } from '../../utils/focusTrap';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  icon?: ReactNode;
  width?: 'sm' | 'md' | 'lg' | 'xl';
  showCloseButton?: boolean;
  maxHeight?: boolean;
  footer?: ReactNode;
  dimBackdrop?: boolean;
  /**
   * Accessible name used when no visible `title` is provided. Ignored when
   * `title` is set (the title is referenced via `aria-labelledby` instead).
   */
  ariaLabel?: string;
}

const widthClasses = {
  sm: 'w-[95vw] sm:w-[400px]',
  md: 'w-[95vw] sm:w-[500px]',
  lg: 'w-[95vw] sm:w-[550px]',
  xl: 'w-[95vw] sm:w-[650px]'
};

/**
 * Accessible modal dialog.
 *
 * Accessibility contract:
 * - Renders `role="dialog"` with `aria-modal="true"`.
 * - Labelled via `aria-labelledby` (pointing at the rendered `title`) or, when
 *   no title is given, via `aria-label` (`ariaLabel`, defaulting to "Dialog").
 * - While open, keyboard focus is trapped inside the dialog and cycles with
 *   <kbd>Tab</kbd>/<kbd>Shift</kbd>+<kbd>Tab</kbd> (see {@link useFocusTrap}).
 * - <kbd>Escape</kbd> and a backdrop click both invoke `onClose`.
 * - On close, focus is returned to the element that was focused before opening
 *   (typically the trigger).
 */
export function Modal({
  isOpen,
  onClose,
  title,
  children,
  icon,
  width = 'md',
  showCloseButton = true,
  footer,
  dimBackdrop = true,
  ariaLabel
}: ModalProps) {
  const titleId = useId();

  const dialogRef = useFocusTrap<HTMLDivElement>(isOpen, { onEscape: onClose });

  React.useEffect(() => {
    if (isOpen) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 ${dimBackdrop ? 'bg-black/50 backdrop-blur-sm' : 'bg-transparent'} flex items-center justify-center z-[10000] animate-in fade-in duration-200`}
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-label={title ? undefined : (ariaLabel ?? 'Dialog')}
        tabIndex={-1}
        className={`rounded-[16px] md:rounded-[24px] border-2 shadow-[0_20px_60px_rgba(0,0,0,0.3)] focus:outline-none ${widthClasses[width]} max-w-[95vw] sm:max-w-[90vw] max-h-[90vh] flex flex-col transition-all animate-in zoom-in-95 duration-200 bg-surface-modal border-border-modal`}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || icon || showCloseButton) && (
          <div className="flex items-start justify-between p-4 md:p-6 pb-3 md:pb-4 flex-shrink-0 border-b border-white/10">
            <div className="flex items-center gap-3 flex-1">
              {icon && (
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-[10px] md:rounded-[12px] flex items-center justify-center shadow-lg border-2 flex-shrink-0 bg-gradient-to-br from-modal-icon-from via-modal-icon-via to-modal-icon-to border-modal-icon-border">
                  {icon}
                </div>
              )}
              {title && (
                <h3 id={titleId} className="text-[16px] md:text-[18px] font-bold transition-colors text-text-modal-title">
                  {title}
                </h3>
              )}
            </div>
            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close dialog"
                className="p-2 rounded-[10px] transition-all hover:scale-110 flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9983a] text-modal-close-text hover:text-modal-close-hover-text hover:bg-modal-close-hover-bg"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 scrollbar-custom">
          {children}
        </div>
        {footer && (
          <div className="flex-shrink-0 border-t border-white/10 p-4 md:p-6 pt-3 md:pt-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

interface ModalFooterProps {
  children: ReactNode;
  className?: string;
}

export function ModalFooter({ children, className = '' }: ModalFooterProps) {
  return (
    <div className={`flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 mt-4 md:mt-6 ${className}`}>
      {children}
    </div>
  );
}

interface ModalButtonProps {
  children: ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  variant?: 'primary' | 'secondary';
  className?: string;
  disabled?: boolean;
}

export function ModalButton({
  children,
  onClick,
  type = 'button',
  variant = 'secondary',
  className = '',
  disabled = false
}: ModalButtonProps) {
  if (variant === 'primary') {
    return (
      <button
        type={type}
        onClick={onClick}
        disabled={disabled}
        className={`px-4 md:px-5 py-2.5 rounded-[10px] md:rounded-[12px] bg-gradient-to-br from-[#c9983a] to-[#a67c2e] text-white font-medium text-[13px] md:text-[14px] shadow-[0_6px_20px_rgba(162,121,44,0.35)] hover:shadow-[0_8px_24px_rgba(162,121,44,0.5)] transition-all border border-white/10 hover:scale-[1.02] active:scale-100 flex items-center justify-center gap-2 touch-manipulation min-h-[44px] w-full sm:w-auto ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      >
        {children}
      </button>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`px-4 md:px-5 py-2.5 rounded-[10px] md:rounded-[12px] backdrop-blur-[20px] border font-medium text-[13px] md:text-[14px] transition-all hover:scale-[1.02] active:scale-100 touch-manipulation min-h-[44px] w-full sm:w-auto ${disabled ? 'opacity-50 cursor-not-allowed' : ''} bg-btn-secondary-bg border-btn-secondary-border text-btn-secondary-text hover:bg-btn-secondary-hover-bg active:bg-btn-secondary-active-bg ${className}`}
    >
      {children}
    </button>
  );
}

interface ModalInputProps {
  label?: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  required?: boolean;
  rows?: number;
  className?: string;
  error?: string | null;
}

export function ModalInput({
  label,
  type = 'text',
  value,
  onChange,
  onBlur,
  placeholder,
  required = false,
  rows,
  className = '',
  error
}: ModalInputProps) {
  const isError = !!error;

  const inputClasses = `w-full px-4 py-3 rounded-[14px] backdrop-blur-[30px] border focus:outline-none transition-all text-[14px] ${isError
    ? 'bg-input-error-bg border-red-500/40 text-foreground placeholder-input-error-placeholder focus:border-red-500/60'
    : 'bg-input-bg border-input-border text-foreground placeholder-input-placeholder focus:bg-input-focus-bg focus:border-primary/30'
    } ${className}`;

  return (
    <div>
      {label && (
        <label className="block text-[13px] font-medium mb-2 transition-colors text-input-placeholder">
          {label}
          {required && <span className="text-[#c9983a] ml-1">*</span>}
        </label>
      )}
      {rows ? (
        <textarea
          rows={rows}
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          className={`${inputClasses} resize-none`}
          placeholder={placeholder}
        />
      ) : (
        <input
          type={type}
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          className={inputClasses}
          placeholder={placeholder}
        />
      )}
      {isError && (
        <p className="text-[12px] mt-1.5 transition-colors text-text-error">
          {error}
        </p>
      )}
    </div>
  );
}

interface ModalSelectProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  required?: boolean;
  className?: string;
}

export function ModalSelect({
  label,
  value,
  onChange,
  options,
  required = false,
  className = '',
}: ModalSelectProps) {
  return (
    <div className={`flex flex-col gap-1 relative ${className}`}>
      {label && (
        <label className="block text-[13px] font-medium mb-2 transition-colors text-input-placeholder">
          {label}
          {required && <span className="text-[#c9983a] ml-1">*</span>}
        </label>
      )}
      
      <Select.Root value={value} onValueChange={onChange} required={required}>
        <Select.Trigger 
          className="w-full px-4 py-3 rounded-[14px] backdrop-blur-[30px] border focus:outline-none transition-all text-[14px] flex items-center justify-between group bg-input-bg border-input-border text-foreground hover:bg-input-focus-bg data-[state=open]:border-primary/50"
        >
          <Select.Value placeholder="Select an option" />
          <Select.Icon>
            <ChevronDown className="w-4 h-4 text-amber-500 transition-transform duration-200 group-data-[state=open]:rotate-180" />
          </Select.Icon>
        </Select.Trigger>

        <Select.Portal>
          <Select.Content 
            className="z-[10001] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-[14px] border shadow-select-content bg-select-content-bg border-select-content-border animate-in fade-in zoom-in-95 duration-200"
            position="popper"
            sideOffset={8}
          >
            <Select.Viewport className="p-1">
              {options.map((option) => (
                <Select.Item
                  key={option.value}
                  value={option.value}
                  className="relative flex w-full cursor-default select-none items-center rounded-[10px] py-2.5 pl-3 pr-8 text-[14px] outline-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-50 text-select-item-text focus:bg-select-item-focus-bg focus:text-select-item-focus-text data-[state=checked]:bg-select-item-focus-bg data-[state=checked]:text-select-item-focus-text"
                >
                  <Select.ItemText>{option.label}</Select.ItemText>
                  <Select.ItemIndicator className="absolute right-2.5 flex items-center justify-center text-[#c9983a]">
                    <Check className="h-4 w-4" />
                  </Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
    </div>
  );
}
