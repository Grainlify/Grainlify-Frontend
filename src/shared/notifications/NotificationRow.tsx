import { Link } from 'react-router-dom';
import type { AppNotification } from '../api/client';
import { formatStamp, linkLabel } from './lib';

/** One notification, at either size.
 *
 *  # Why one component for two surfaces
 *
 *  The page and the dropdown are the same object at two scales, so the row is
 *  written once and sized by a prop. Two implementations is how the dropdown
 *  came to clip text the page showed in full, and how a link label could have
 *  said one thing in one place and another elsewhere.
 *
 *  # What differs, and why each difference exists
 *
 *  `page`      the row marks read and does nothing else. It is fully visible
 *              already, so the click that marks read is a deliberate one and
 *              must not navigate, remove or reorder.
 *
 *  `dropdown`  the row marks read and goes to the notifications PAGE - to the
 *              notification, not to the action. The body is clamped to three
 *              lines, which is only safe BECAUSE the row leads somewhere the
 *              whole text is shown. Clamping plus a click-through to
 *              link_path would reproduce the original bug one layer over:
 *              text you cannot finish, and nowhere to finish it.
 *
 *  link_path is an explicit labelled link in both, never the row itself.
 *  Reading and travelling are two intentions, and collapsing them is what made
 *  the message unreadable in the first place.
 */
export function NotificationRow({
  n,
  variant,
  dark,
  onActivate,
  highlighted = false,
  onLinkNavigate,
}: {
  n: AppNotification;
  variant: 'page' | 'dropdown';
  dark: boolean;
  /** Marks read, and on the dropdown also navigates. */
  onActivate: (n: AppNotification) => void;
  /** Briefly ringed when arrived at from a dropdown row. */
  highlighted?: boolean;
  /** Lets the dropdown close itself when the inner link is followed. */
  onLinkNavigate?: () => void;
}) {
  const compact = variant === 'dropdown';
  const strong = dark ? 'text-[#f5efe5]' : 'text-[#2d2820]';
  const muted = dark ? 'text-[#b8a898]' : 'text-[#7a6b5a]';
  const unread = !n.read_at;

  return (
    <li
      // Anchor target. The dropdown links here by id, and the guarantee that it
      // resolves is in notificationsPagePath's comment.
      id={`notification-${n.id}`}
      className={`relative border-b last:border-b-0 transition-colors ${
        dark ? 'border-white/[0.07]' : 'border-[#7a6b5a]/[0.16]'
      } ${
        unread
          ? dark
            ? 'bg-[#c9983a]/[0.08]'
            : 'bg-[#c9983a]/[0.10]'
          : ''
      } ${highlighted ? 'ring-2 ring-inset ring-[#c9983a]' : ''}`}
    >
      {/* The unread rail. It replaces the dot, which needed a compensating
          ml-3.5 on read rows to keep the two aligned; a rail aligns them
          structurally and costs the text no horizontal space. */}
      {unread && <span aria-hidden className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#c9983a]" />}

      <button
        type="button"
        onClick={() => onActivate(n)}
        aria-label={
          compact
            ? `Open "${n.title}"`
            : n.read_at
              ? `${n.title} (read)`
              : `Mark "${n.title}" as read`
        }
        className={`block w-full text-left ${compact ? 'px-3.5 pt-2.5' : 'px-4 pt-3'} ${
          unread ? (compact ? 'pl-[18px]' : 'pl-5') : ''
        }`}
      >
        <p className={`${compact ? 'text-[12.5px]' : 'text-[13.5px]'} font-semibold leading-snug ${strong}`}>
          {n.title}
        </p>
        {n.body && (
          // whitespace-pre-line because these messages are written by a human
          // in a textarea and a paragraph break they typed is part of what they
          // meant. Clamped in the dropdown only - see the note above on why
          // that is safe here and was not before.
          <p
            className={`${compact ? 'text-[12px] line-clamp-3' : 'text-[13.5px]'} mt-0.5 leading-relaxed whitespace-pre-line ${muted}`}
          >
            {n.body}
          </p>
        )}
      </button>

      {/* Timestamp and destination on one line, inside the row. Previously the
          link floated below the card on its own line, which cost ~27px per row
          and read as detached from the message it belonged to. */}
      <div
        className={`flex items-center flex-wrap gap-x-2 ${compact ? 'px-3.5 pb-2.5 pt-1 text-[11px]' : 'px-4 pb-3 pt-1.5 text-[11.5px]'} ${
          unread ? (compact ? 'pl-[18px]' : 'pl-5') : ''
        } ${muted}`}
      >
        <span>{formatStamp(n.created_at)}</span>
        {n.link_path && (
          <>
            <span aria-hidden className="opacity-50">
              ·
            </span>
            <Link
              to={n.link_path}
              onClick={onLinkNavigate}
              className={`font-semibold underline ${dark ? 'text-[#c9983a]' : 'text-[#a67c2e]'}`}
            >
              {linkLabel(n.type)}
            </Link>
          </>
        )}
      </div>
    </li>
  );
}
