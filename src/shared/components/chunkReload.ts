/** Recovery from a lazy chunk that stopped existing.
 *
 *  # The failure
 *
 *  Vite content-hashes every lazy chunk, so a deploy replaces the filenames. A
 *  tab left open still holds the old JS and asks for a chunk that is now a 404
 *  the next time it switches to a section it has not loaded. The import
 *  rejects, Suspense re-throws, and the person sees a page that failed for a
 *  reason a single reload fixes completely.
 *
 *  # Why the guard matters more than the reload
 *
 *  Reloading unguarded is worse than the blank page it replaces. If the import
 *  fails for a reason a reload cannot fix - the asset host is down, a proxy is
 *  mangling responses, the network is captive - the reload runs again on the
 *  next render, forever. That loop takes the page with it AND destroys whatever
 *  the person had typed, on every cycle, with no way to stop it from inside the
 *  tab.
 *
 *  So the reload happens at most once per tab session, and the flag lives in
 *  sessionStorage precisely because it must SURVIVE the reload it is guarding.
 *
 *  # The flag failing means no reload
 *
 *  sessionStorage throws in private modes and sandboxed frames. When it does,
 *  claimReload returns false and nothing reloads: without a durable flag there
 *  is no way to prevent a loop, and an unguarded reload is the one outcome
 *  worse than showing the error. The guard fails toward doing nothing, never
 *  toward acting blind.
 *
 *  # What a reload makes worse, and the one narrowing that helps
 *
 *  Reloading is not free even when bounded. If the ENTRY bundle is also
 *  unreachable - a total asset outage rather than one stale chunk - the reload
 *  lands on a page where no JavaScript runs at all, so nothing renders,
 *  boundary included. That turns a readable error card into a blank page. It is
 *  a real cost and it is accepted knowingly: in that state the site is down for
 *  this person however they arrived, and the alternative is never recovering
 *  from the common case to protect a rare one where nothing works anyway.
 *
 *  The one cheap narrowing worth having is offline. A browser that knows it has
 *  no network will not fetch anything on reload either, so reloading can only
 *  replace a card that explains the problem with a blank page that does not.
 *  Offline is checked; nothing else is guessed at.
 *
 *  # Why it is never cleared
 *
 *  Not cleared on a successful render. Clearing it needs a definition of
 *  "recovered", and every version of that definition re-opens the loop: shell
 *  renders, flag clears, same import fails, reload, repeat. One automatic
 *  reload per tab, and the fallback's own Reload button covers everything
 *  after - a person pressing a button cannot loop.
 */

const FLAG = 'grainlify_chunk_reloaded';

/** Whether this error is a lazy chunk that could not be fetched.
 *
 *  Matched across engines, which word it differently: Chrome says "Failed to
 *  fetch dynamically imported module", Firefox "error loading dynamically
 *  imported module", Safari "Importing a module script failed". Vite adds its
 *  own for stylesheets. Matching only Chrome's wording would leave the other
 *  two browsers with the blank page.
 */
export function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return (
    /failed to fetch dynamically imported module/i.test(message) ||
    /error loading dynamically imported module/i.test(message) ||
    /importing a module script failed/i.test(message) ||
    /unable to preload css/i.test(message) ||
    /dynamically imported module/i.test(message)
  );
}

/** Claims the single reload this tab is allowed. True at most once.
 *
 *  Writes the flag BEFORE returning true, so the reload it authorises is
 *  already guarded when it happens.
 */
export function claimReload(storage?: Storage | null, online: boolean = isOnline()): boolean {
  // Offline: a reload fetches nothing, so it can only replace an explanation
  // with a blank page.
  if (!online) return false;
  const store = resolve(storage);
  if (!store) return false;
  try {
    if (store.getItem(FLAG)) return false;
    store.setItem(FLAG, String(1));
    return true;
  } catch {
    // Could not record it, so cannot guarantee this is the only one.
    return false;
  }
}

/** Whether a reload has already been spent - used to tell somebody that
 *  reloading has been tried, rather than suggesting it again. */
export function reloadAlreadyUsed(storage?: Storage | null): boolean {
  const store = resolve(storage);
  if (!store) return false;
  try {
    return !!store.getItem(FLAG);
  } catch {
    return false;
  }
}

/** Resolves the store to use.
 *
 *  Written as an explicit check rather than a default parameter value. With
 *  `= safeSession()` in the signature, passing undefined silently means "use
 *  the real one", so "deliberately no storage" - the exact case the guard has
 *  to handle safely - is not expressible by a caller or by a test. `null` says
 *  it; omitting the argument still gets the real one.
 */
function resolve(storage?: Storage | null): Storage | undefined {
  if (storage === undefined) return safeSession();
  return storage ?? undefined;
}

/** navigator.onLine, defaulting to online when it cannot be read - the check
 *  exists to SUPPRESS a reload in a known-bad state, never to require proof of
 *  a good one. A missing navigator must not disable recovery. */
function isOnline(): boolean {
  try {
    return typeof navigator === 'undefined' || navigator.onLine !== false;
  } catch {
    return true;
  }
}

function safeSession(): Storage | undefined {
  try {
    return typeof sessionStorage === 'undefined' ? undefined : sessionStorage;
  } catch {
    return undefined;
  }
}
