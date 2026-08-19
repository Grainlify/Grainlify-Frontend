import { Component, type ReactNode, type ErrorInfo } from 'react';

/** Catches a render throw and shows something, instead of nothing.
 *
 *  # Why a blank page is the worst failure available
 *
 *  React unmounts the entire tree when a render throws with no boundary above
 *  it. Not the component that failed - the whole application, navbar included.
 *  The result is indistinguishable from a dead site, an expired session, or a
 *  DNS failure, so the person seeing it cannot tell whether to retry, log in
 *  again, or report it. There is nothing on screen to report.
 *
 *  That happened on the admin tab: one contributor whose verification produced
 *  no mappable warnings made `suggested_reason_codes` null, and reading
 *  `.length` off it took the page to white. The admin could not see the queue,
 *  and could not tell whether the reset they had clicked had gone through.
 *
 *  # Why it says what it says
 *
 *  An admin who hits this needs two things: confirmation that the site is alive,
 *  and the error text, because they are usually the person who can act on it. A
 *  friendly apology with the detail hidden makes them file a ticket that says
 *  "it broke".
 */
interface Props {
  children: ReactNode;
  /** Named in the message so a report says which surface died. */
  surface: string;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Logged with the component stack, which is the part that names the
    // component rather than the minified frame.
    console.error(`[${this.props.surface}] render failed`, error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="rounded-[16px] border border-[#c9983a]/35 bg-[#c9983a]/[0.10] p-5">
        <p className="text-[15px] font-bold text-[#2d2820] dark:text-[#f5efe5]">
          {this.props.surface} couldn't be displayed
        </p>
        <p className="text-[14px] mt-1.5 text-[#7a6b5a] dark:text-[#b8a898]">
          The rest of the site is fine — this section failed to render. **No action
          you took has been undone**, but if you were in the middle of something,
          check whether it completed before trying again.
        </p>
        <pre className="mt-3 text-[12px] font-mono whitespace-pre-wrap break-all text-[#7a6b5a] dark:text-[#b8a898]">
          {this.state.error.message}
        </pre>
        <button
          onClick={() => this.setState({ error: null })}
          className="mt-3 px-4 py-2 rounded-[12px] bg-gradient-to-br from-[#c9983a] to-[#a67c2e] text-white font-semibold text-[13px] border border-white/10"
        >
          Try again
        </button>
      </div>
    );
  }
}
