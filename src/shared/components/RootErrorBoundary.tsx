import { Component, type ReactNode, type ErrorInfo } from 'react';

/** The last boundary. Catches anything the app throws that nothing else did.
 *
 *  # Why this exists
 *
 *  React unmounts the ENTIRE tree when a render throws with no boundary above
 *  it - not the component that failed, the whole application. The result is a
 *  white page indistinguishable from a dead site, an expired session, or a DNS
 *  failure, so the person seeing it cannot tell whether to retry, sign in
 *  again, or report it. There is nothing on screen to report.
 *
 *  That has now happened twice from unrelated causes. Once on the admin tab (a
 *  null `suggested_reason_codes`), and once app-wide: a tab left open across a
 *  deploy asks for a lazy chunk whose content hash no longer exists, the
 *  dynamic import rejects, Suspense re-throws, and there was nothing above
 *  <Routes> to catch it. Both were reported as "the page is blank", which is
 *  all the reporter could see.
 *
 *  # Why it depends on nothing
 *
 *  A boundary that needs the tree it is protecting is not a boundary. This one
 *  sits OUTSIDE BrowserRouter and ThemeProvider and uses neither: no context,
 *  no router, no hooks, no icon library. Theme is read straight from
 *  localStorage with a prefers-color-scheme fallback, because if ThemeProvider
 *  is what threw then useTheme() would throw again inside the fallback and
 *  produce the very blank page this is here to prevent.
 *
 *  # Why it shows the error
 *
 *  The message is on screen, selectable, not behind a details toggle. The
 *  people who hit this are usually the ones who can act on it, and a friendly
 *  apology with the detail hidden produces a bug report that says "it broke".
 *  Saying the site is alive is the other half: the failure looks total from
 *  outside and almost never is.
 */
interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
  info: string | null;
}

function prefersDark(): boolean {
  try {
    const stored = localStorage.getItem('theme');
    if (stored === 'dark') return true;
    if (stored === 'light') return false;
  } catch {
    // localStorage can throw in private modes and sandboxed frames. Falling
    // through to the media query is the point of catching it.
  }
  return typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches;
}

export class RootErrorBoundary extends Component<Props, State> {
  state: State = { error: null, info: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[app] render failed', error, info.componentStack);
    this.setState({ info: info.componentStack ?? null });
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const dark = prefersDark();
    const ink = dark ? '#f5efe5' : '#2d2820';
    // Measured on the painted pixel against this card, not chosen from the
    // token list: #7a6b5a lands at 3.97:1 here, which is below AA for body
    // text. #6b5d4d is an existing product colour and measures 4.90:1. Dark
    // keeps #b8a898, which already measures 6.27:1.
    const muted = dark ? '#b8a898' : '#6b5d4d';
    const surface = dark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.25)';
    const edge = dark ? 'rgba(255,255,255,0.13)' : 'rgba(255,255,255,0.45)';
    const ground = dark
      ? 'linear-gradient(150deg,#26221b 0%,#191611 100%)'
      : 'linear-gradient(150deg,#eae0cd 0%,#ded0b9 100%)';

    // Inline styles throughout, deliberately. Tailwind's stylesheet is a
    // separate asset from the JS that just failed, and the failure this most
    // often follows is an asset that did not load. A fallback that renders
    // unstyled is a second blank page.
    return (
      <div
        role="alert"
        style={{
          minHeight: '100vh', background: ground, color: ink,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
          fontFamily: 'ui-sans-serif,-apple-system,"Segoe UI",Roboto,sans-serif',
        }}
      >
        <div
          style={{
            maxWidth: '560px', width: '100%', background: surface,
            border: `1px solid ${edge}`, borderRadius: '18px', padding: '30px 32px',
            backdropFilter: 'blur(30px)',
            boxShadow: dark ? '0 8px 32px rgba(0,0,0,0.35)' : '0 8px 32px rgba(0,0,0,0.10)',
          }}
        >
          <div
            style={{
              width: '52px', height: '52px', borderRadius: '50%', marginBottom: '18px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '1px solid rgba(201,152,58,0.28)',
              background: 'linear-gradient(140deg,rgba(201,152,58,0.22),rgba(166,124,46,0.10))',
            }}
          >
            {/* Inline SVG rather than an icon import: the icon library is in
                the bundle that may be what failed. */}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
                 stroke="#c9983a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>

          <h1 style={{ margin: 0, fontSize: '21px', fontWeight: 700, letterSpacing: '-0.02em' }}>
            This page stopped rendering
          </h1>
          <p style={{ margin: '10px 0 0', fontSize: '15px', lineHeight: 1.6, color: muted }}>
            Grainlify is still running and your account is fine — this is the page failing, not the
            service. Nothing you had already saved has been lost. Reloading fixes most of these,
            and always fixes the one caused by a new version shipping while your tab was open.
          </p>

          <p style={{ margin: '20px 0 6px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.11em', textTransform: 'uppercase', color: muted }}>
            What went wrong
          </p>
          {/* Shown, not hidden behind a toggle. This is the line that makes a
              report actionable instead of "it broke". */}
          <pre
            style={{
              margin: 0, padding: '12px 14px', borderRadius: '12px',
              background: dark ? 'rgba(0,0,0,0.28)' : 'rgba(255,255,255,0.35)',
              border: `1px solid ${edge}`,
              fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace',
              fontSize: '12.5px', lineHeight: 1.5, color: ink,
              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              maxHeight: '160px', overflowY: 'auto',
            }}
          >
            {error.message || String(error)}
          </pre>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '22px' }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '10px 18px', borderRadius: '13px', border: '1px solid rgba(255,255,255,0.12)',
                background: 'linear-gradient(140deg,#c9983a,#a67c2e)', color: '#fff',
                // No `font: inherit` shorthand here - it resets fontSize and
                // fontWeight set above it and rendered this button a size
                // larger than the link beside it.
                fontFamily: 'inherit', fontSize: '13.5px', fontWeight: 650, cursor: 'pointer',
              }}
            >
              Reload the page
            </button>
            <a
              href="/support"
              style={{
                padding: '10px 18px', borderRadius: '13px', border: `1px solid ${edge}`,
                color: ink, fontSize: '13.5px', fontWeight: 650, textDecoration: 'none',
                display: 'inline-flex', alignItems: 'center',
              }}
            >
              Report this
            </a>
          </div>
        </div>
      </div>
    );
  }
}
