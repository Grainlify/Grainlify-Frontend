import { Toaster } from 'sonner'
import { useTheme } from '../contexts/ThemeContext'

/**
 * Global toast notification container.
 *
 * Accessibility notes:
 * - The `<Toaster>` is wrapped in two always-present live-region containers:
 *   - `role="status"` / `aria-live="polite"` — announced after the current
 *     interaction finishes (info / success toasts).
 *   - `role="alert"` / `aria-live="assertive"` — announced immediately,
 *     interrupting the user (error toasts).
 *   Sonner writes each toast into the correct live-region container based on the
 *   `aria` option it receives from each `toast.*()` call. Providing both regions
 *   up-front ensures they are already in the DOM when the first toast fires, so
 *   screen readers register them as live regions before any content is injected.
 * - The dismiss/close button inherits its label from sonner's built-in
 *   `closeButton` prop which renders an `<button aria-label="Close toast">`.
 * - Messages are rendered as plain text (no HTML interpolation) so
 *   untrusted content cannot inject markup.
 */
const Toast = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const toasterClass = [
    isDark
      ? 'bg-[#2d2820] text-[#e8dfd0] border-white/15'
      : 'bg-[#ede3d0] text-[#2d2820] border-[#c9983a]/30',
    'backdrop-blur-[40px] w-[340px] flex flex-row text-md py-3 px-4 rounded-[14px] border-2 shadow-lg',
  ].join(' ');

  return (
    <>
      {/*
       * Polite live region — screen readers announce after the current speech
       * queue finishes. Used for info / success toasts.
       */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only" />

      {/*
       * Assertive live region — screen readers announce immediately, interrupting
       * any current speech. Used for error toasts.
       */}
      <div role="alert" aria-live="assertive" aria-atomic="true" className="sr-only" />

      <Toaster
        richColors={false}
        position="top-right"
        closeButton={true}
        duration={3000}
        toastOptions={{
          unstyled: true,
          className: toasterClass,
          classNames: {
            closeButton: 'order-last ml-auto cursor-pointer rounded-[10px] p-1 hover:opacity-80 transition-opacity',
            icon: 'mr-2 mt-0.5 flex-shrink-0',
            description: 'mt-0.5 text-sm',
            success: isDark
              ? '!border-[#c9983a]/60 !bg-[#3a3228] !text-[#e8dfd0] [&_svg]:text-[#c9983a] shadow-[0_4px_20px_rgba(201,152,58,0.25)]' 
              : '!border-[#c9983a]/70 !bg-[#f5eed8] !text-[#2d2820] [&_svg]:text-[#a67c2e] shadow-[0_4px_20px_rgba(201,152,58,0.2)]',
            error: isDark
              ? '!border-red-500/50 !bg-[#3a3228] [&_[data-icon]]:text-red-400'
              : '!border-red-500/50 !bg-[#f5eed8] [&_[data-icon]]:text-red-600',
          },
        }}
      />
    </>
  );
};

export default Toast;
