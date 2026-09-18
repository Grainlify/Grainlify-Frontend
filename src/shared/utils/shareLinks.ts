/**
 * Links a user hands to someone else.
 *
 * A shared link must carry only what identifies the thing being shared, never
 * the sender's own view of it. The dashboard URL mixes the two: ?project= is
 * the thing, while ?view= (the CONTRIBUTOR/MAINTAINER pill), ?tab= and ?from=
 * are how the sender got there. Copying the address bar hands all of it on, and
 * the reader starts in the sender's mode on the sender's tab.
 *
 * Same path the backend's notifications.ProjectLink builds, so an in-app share
 * and a notification for the same project are the same URL.
 */
export function shareableProjectUrl(projectId: string, origin: string = window.location.origin): string {
  return `${origin}/dashboard?tab=browse&project=${encodeURIComponent(projectId)}`;
}
