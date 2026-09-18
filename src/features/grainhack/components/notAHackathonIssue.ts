import { isApiError } from '../../../shared/api/apiError';

/** The one failure that means "this issue is not in a GrainHack" - the common
 * case, where the GrainHack panels correctly render nothing.
 *
 * Both panels used to treat EVERY failure that way. An expired session, a 500
 * or a dropped connection on a real GrainHack issue made the Apply panel
 * silently vanish, which on the issue page looks exactly like "you can't
 * apply to this". */
export function isNotAHackathonIssue(error: unknown): boolean {
  return isApiError(error) && error.status === 404 && error.data?.error === 'not_a_hackathon_issue';
}
