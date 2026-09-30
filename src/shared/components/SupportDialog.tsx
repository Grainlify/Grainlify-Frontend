import { LifeBuoy } from 'lucide-react';
import { SupportForm } from './SupportForm';
import { Modal, ModalButton } from './ui/Modal';

/**
 * The "Get help" dialog. Its own chunk, loaded when someone opens it: the
 * modal and form pull in a Radix select, floating-ui and the toast library,
 * about 80 kB that every visitor downloaded and parsed before first paint for
 * a dialog most never open. SupportProvider preloads it once the page is idle,
 * so the first open does not wait on the network.
 */
export default function SupportDialog({ onClose }: { onClose: () => void }) {
  return (
    <>
      {/* The modal shell. It owns opening, closing and the Cancel button;
          everything about the report itself lives in SupportForm, which the
          /dashboard support page mounts too. One form, two shells - a second
          copy would drift, which is exactly what happened to the rail icon
          when it had no shared definition.

          Portaled to document.body by Modal. Load-bearing rather than
          incidental: the sidebar rail carries backdrop-blur-[90px], and a
          backdrop-filter establishes a containing block for position: fixed
          descendants, so a panel rendered inside it would be clipped to a 65px
          column. Same trap as #996, same fix. */}
      <Modal
        isOpen
        onClose={onClose}
        title="Get help"
        icon={<LifeBuoy className="w-4 h-4 md:w-5 md:h-5" />}
        width="md"
      >
        <SupportForm
          autoFocusMessage
          onDone={onClose}
          secondaryAction={
            <ModalButton type="button" variant="secondary" onClick={onClose}>
              Cancel
            </ModalButton>
          }
        />
      </Modal>
    </>
  );
}
