import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Clock, FolderGit2, XCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { useTheme } from '../../../shared/contexts/ThemeContext';
import { isApiError } from '../../../shared/api/apiError';
import { LoadFailed } from '../../../shared/components/LoadFailed';
import { ModalInput } from '../../../shared/components/ui/Modal';
import {
  applyToHackathon,
  getMyHackathonApplications,
  getMyProjects,
  type HackathonApplication,
} from '../../../shared/api/client';

type MyProject = Awaited<ReturnType<typeof getMyProjects>>[number];

export interface ApplicationDraft {
  projectIds: string[];
  shortDescription: string;
  goal: string;
  expectedIssueCount: string;
  maintainerContact: string;
}

export type DraftErrors = Partial<Record<keyof ApplicationDraft, string>>;

/** The checks POST /hackathons/:id/applications makes on the body, made here
 *  first so a person sees them beside the field rather than as a refusal.
 *  The backend also rejects a negative issue count only at the database, as a
 *  500, so the range is enforced here. */
export function validateApplication(d: ApplicationDraft): DraftErrors {
  const e: DraftErrors = {};
  if (d.projectIds.length === 0) e.projectIds = 'Choose at least one project.';
  if (!d.shortDescription.trim()) e.shortDescription = 'Say what the project is.';
  else if (d.shortDescription.trim().length > 500) e.shortDescription = 'Keep it under 500 characters.';
  if (!d.goal.trim()) e.goal = 'Say what you want from the event.';
  const n = d.expectedIssueCount.trim();
  if (!/^\d+$/.test(n) || Number(n) < 1 || Number(n) > 100) e.expectedIssueCount = 'A whole number from 1 to 100.';
  if (!d.maintainerContact.trim()) e.maintainerContact = 'Say how the GrainHack team can reach you.';
  return e;
}

/** One sentence per name POST /hackathons/:id/applications refuses with
 *  (Grainlify-Backend internal/handlers/hackathon_applications.go). */
export function applyFailure(code: string): string {
  switch (code) {
    case 'hackathon_not_accepting_applications':
      return "This event isn't taking project applications any more.";
    case 'not_project_owner':
      return "Only a project's owner can apply it, and you don't own one of these.";
    case 'project_not_verified':
      return "One of these projects isn't verified yet, so it can't apply.";
    case 'project_not_found':
      return "One of these projects couldn't be found. It may have been removed.";
    case 'project_ids_required':
      return 'Choose at least one project.';
    case 'missing_required_fields':
      return 'Fill in what the project is, what you want from the event, and how to reach you.';
    case 'hackathon_not_found':
      return "This event couldn't be found.";
    case 'application_create_failed':
      return "The server couldn't save the application. Try again.";
    default:
      return `Couldn't apply${code ? ` (${code})` : ''}.`;
  }
}

const STATUS: Record<HackathonApplication['status'], { label: string; tone: 'good' | 'warn' | 'muted' | 'bad' }> = {
  pending: { label: 'In review', tone: 'muted' },
  accepted: { label: 'Accepted', tone: 'good' },
  more_info_requested: { label: 'More information requested', tone: 'warn' },
  rejected: { label: 'Not accepted', tone: 'bad' },
};

const emptyDraft = (projectIds: string[] = []): ApplicationDraft => ({
  projectIds,
  shortDescription: '',
  goal: '',
  expectedIssueCount: '',
  maintainerContact: '',
});

/** Maintainer-facing: apply a project you own to this event, and see where
 *  each application stands.
 *
 *  Projects apply, not people. The backend takes a project only from its
 *  owner, only once it is verified, and only while the event is in its
 *  application period. Re-applying an existing application resets it to In
 *  review, so the form is offered again only where that is the point - a
 *  request for more information, or a rejection - and never for one that is
 *  in review or accepted.
 *
 *  Renders nothing outside the application period unless one of your
 *  projects has applied: an event page is mostly read by contributors. */
export function ProjectApplicationPanel({
  hackathonId,
  hackathonName,
  phase,
}: {
  hackathonId: string;
  hackathonName: string;
  phase: string;
}) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [projects, setProjects] = useState<MyProject[] | null>(null);
  const [applications, setApplications] = useState<HackathonApplication[]>([]);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [attempt, setAttempt] = useState(0);
  const [draft, setDraft] = useState<ApplicationDraft | null>(null);
  const [errors, setErrors] = useState<DraftErrors>({});
  const [submitError, setSubmitError] = useState<{ message: string; code: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const open = phase === 'application_period';

  const fetchMine = async () => {
    const [p, a] = await Promise.all([getMyProjects(), getMyHackathonApplications()]);
    return { p: Array.isArray(p) ? p : [], a: (a.applications ?? []).filter((x) => x.hackathon_id === hackathonId) };
  };
  const load = async () => {
    const { p, a } = await fetchMine();
    setProjects(p);
    setApplications(a);
  };

  useEffect(() => {
    let cancelled = false;
    setLoadError(null);
    fetchMine()
      .then(({ p, a }) => {
        if (cancelled) return;
        setProjects(p);
        setApplications(a);
      })
      .catch((e) => {
        if (!cancelled) setLoadError(e);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hackathonId, attempt]);

  const strong = isDark ? 'text-[#f5f5f5]' : 'text-[#2d2820]';
  const body = isDark ? 'text-[#d4d4d4]' : 'text-[#4a3f2f]';
  const muted = isDark ? 'text-[#b8a898]' : 'text-[#6b5d4d]';
  const row = isDark ? 'bg-white/[0.06] border-white/10' : 'bg-white/[0.35] border-white/30';
  const card = `rounded-[24px] border p-4 sm:p-5 shadow-[0_8px_32px_rgba(0,0,0,0.08)] ${
    isDark ? 'bg-[#c9983a]/[0.08] border-[#c9983a]/25' : 'bg-[#c9983a]/[0.06] border-[#c9983a]/25'
  }`;
  const primary =
    'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[12px] border border-white/10 bg-gradient-to-br from-[#c9983a] to-[#a67c2e] px-5 py-2.5 text-[13px] font-semibold text-white shadow-[0_6px_20px_rgba(162,121,44,0.35)] disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-[40px]';
  const secondary = `inline-flex min-h-[44px] items-center justify-center rounded-[12px] border px-4 py-2 text-[13px] font-medium sm:min-h-[40px] ${
    isDark ? 'border-white/15 bg-white/[0.06] text-[#d4d4d4] hover:bg-white/[0.10]' : 'border-black/15 bg-white/[0.20] text-[#2d2820] hover:bg-white/[0.30]'
  }`;
  const chip = (tone: 'good' | 'warn' | 'muted' | 'bad') =>
    tone === 'good'
      ? isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-500/20 text-green-800'
      : tone === 'warn'
        ? isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-500/20 text-amber-800'
        : tone === 'bad'
          ? isDark ? 'bg-red-500/20 text-red-300' : 'bg-red-500/15 text-red-800'
          : isDark ? 'bg-white/10 text-[#d4d4d4]' : 'bg-black/[0.06] text-[#4a3f2f]';

  if (loadError) {
    // Only worth a failure card where applying is possible; elsewhere the
    // event page reads the same without it.
    if (!open) return null;
    return <LoadFailed what="your projects for this event" error={loadError} onRetry={() => setAttempt((n) => n + 1)} />;
  }
  if (projects === null) return null;
  if (!open && applications.length === 0) return null;

  const appliedByProject = new Map(applications.map((a) => [a.project_id, a]));
  const verified = projects.filter((p) => p.status === 'verified');
  // In review or accepted: the form would reset it, so it isn't offered.
  const applicable = verified.filter((p) => {
    const a = appliedByProject.get(p.id);
    return !a || a.status === 'rejected' || a.status === 'more_info_requested';
  });
  const fresh = applicable.filter((p) => !appliedByProject.has(p.id));

  const startDraft = (projectIds: string[], from?: HackathonApplication) => {
    setErrors({});
    setSubmitError(null);
    setDraft(
      from
        ? {
            projectIds,
            shortDescription: from.short_description,
            goal: from.goal,
            expectedIssueCount: String(from.expected_issue_count),
            maintainerContact: from.maintainer_contact,
          }
        : emptyDraft(projectIds),
    );
  };

  const submit = async () => {
    if (!draft) return;
    const found = validateApplication(draft);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await applyToHackathon(hackathonId, {
        project_ids: draft.projectIds,
        short_description: draft.shortDescription.trim(),
        goal: draft.goal.trim(),
        expected_issue_count: Number(draft.expectedIssueCount.trim()),
        maintainer_contact: draft.maintainerContact.trim(),
      });
      const n = res.application_ids?.length ?? draft.projectIds.length;
      toast.success(`Applied ${n === 1 ? 'your project' : `${n} projects`}. An admin reviews each one; the decision shows here.`);
      setDraft(null);
    } catch (e) {
      const code = isApiError(e) && typeof e.data?.error === 'string' ? e.data.error : '';
      const message = applyFailure(code);
      toast.error(message);
      setSubmitError({ message, code: code || (e instanceof Error ? e.message : 'failed') });
    } finally {
      setSubmitting(false);
      // Projects are applied one at a time on the server, so a refusal part
      // way through can leave the earlier ones saved. Re-read either way.
      try {
        await load();
      } catch {
        /* the list stays as it was */
      }
    }
  };

  const projectName = (id: string) => projects.find((p) => p.id === id)?.github_full_name ?? 'this project';

  const statusRow = (a: HackathonApplication) => {
    const s = STATUS[a.status] ?? { label: a.status, tone: 'muted' as const };
    const Icon = a.status === 'accepted' ? CheckCircle2 : a.status === 'rejected' ? XCircle : a.status === 'pending' ? Clock : AlertCircle;
    const canRedo = open && (a.status === 'more_info_requested' || a.status === 'rejected') && verified.some((p) => p.id === a.project_id);
    return (
      <li key={a.id} data-testid="project-application" data-status={a.status} className={`flex flex-col gap-2 rounded-[16px] border p-4 ${row}`}>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`text-[14px] font-semibold ${strong}`}>{a.project_full_name}</span>
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${chip(s.tone)}`}>
            <Icon className="h-3.5 w-3.5" aria-hidden />
            {s.label}
          </span>
        </div>
        <p className={`text-[12px] ${muted}`}>
          Applied {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
          {a.reviewed_at && ` · reviewed ${formatDistanceToNow(new Date(a.reviewed_at), { addSuffix: true })}`}
        </p>
        <p className={`text-[13px] ${body}`}>
          {a.status === 'pending' && 'An admin reviews each project before the event moves to issue prep. Nothing to do until then.'}
          {a.status === 'accepted' && "This project is in the event. You'll prepare its issues when the event moves to issue prep."}
          {a.status === 'more_info_requested' && 'The reviewer needs more before deciding. Update the application to send it back for review.'}
          {a.status === 'rejected' && (open ? 'Applying again sends it back for review.' : 'The application period has closed.')}
        </p>
        {a.review_reason && (
          <p className={`rounded-[12px] border px-3 py-2 text-[13px] ${isDark ? 'border-white/10 bg-white/[0.04] text-[#d4d4d4]' : 'border-black/10 bg-white/[0.3] text-[#2d2820]'}`}>
            <span className="font-semibold">From the reviewer:</span> {a.review_reason}
          </p>
        )}
        {canRedo && draft === null && (
          <div>
            <button type="button" className={secondary} onClick={() => startDraft([a.project_id], a)}>
              {a.status === 'more_info_requested' ? 'Update application' : 'Apply again'}
            </button>
          </div>
        )}
      </li>
    );
  };

  const ineligible = (() => {
    if (!open || applications.length > 0) return null;
    if (projects.length === 0) {
      return "Projects apply to this event, not people. To take part as a maintainer, add your repository under Maintainers and get it verified; then apply it here.";
    }
    if (verified.length === 0) {
      return `Only a verified project you own can apply, and none of yours is verified yet (${projects
        .map((p) => `${p.github_full_name}: ${p.status}`)
        .join(', ')}).`;
    }
    return null;
  })();

  const form = draft && (
    <form
      data-testid="project-application-form"
      noValidate
      className={`flex flex-col gap-4 rounded-[16px] border p-4 ${row}`}
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <fieldset className="flex flex-col gap-2">
        <legend className={`mb-2 text-[13px] font-medium ${body}`}>
          Project <span className="text-[var(--brand-gold-text-deep)]">*</span>
        </legend>
        {(draft.projectIds.length === 1 && appliedByProject.has(draft.projectIds[0]) ? verified.filter((p) => p.id === draft.projectIds[0]) : fresh).map((p) => {
          const checked = draft.projectIds.includes(p.id);
          return (
            <label
              key={p.id}
              className={`flex min-h-[44px] cursor-pointer items-center gap-2.5 rounded-[12px] border px-3 py-2 ${
                checked
                  ? isDark ? 'border-[#c9983a] bg-[#c9983a]/[0.12]' : 'border-[#8a6420] bg-[#c9983a]/[0.15]'
                  : isDark ? 'border-white/15 bg-white/[0.04]' : 'border-black/15 bg-white/[0.20]'
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() =>
                  setDraft({
                    ...draft,
                    projectIds: checked ? draft.projectIds.filter((x) => x !== p.id) : [...draft.projectIds, p.id],
                  })
                }
                className="h-4 w-4 accent-[#a67c2e]"
              />
              <FolderGit2 className={`h-4 w-4 ${muted}`} aria-hidden />
              <span className={`text-[13px] font-semibold ${strong}`}>{p.github_full_name}</span>
            </label>
          );
        })}
        {errors.projectIds && <p className={`text-[12px] ${isDark ? 'text-red-300' : 'text-red-800'}`}>{errors.projectIds}</p>}
      </fieldset>
      <ModalInput
        id="project-application-what"
        label="What the project is"
        required
        rows={2}
        value={draft.shortDescription}
        onChange={(v) => setDraft({ ...draft, shortDescription: v })}
        placeholder="One or two sentences a contributor would read first."
        error={errors.shortDescription}
      />
      <ModalInput
        id="project-application-goal"
        label="What you want from the event"
        required
        rows={2}
        value={draft.goal}
        onChange={(v) => setDraft({ ...draft, goal: v })}
        placeholder="e.g. Clear the docs backlog and find two regular contributors."
        error={errors.goal}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ModalInput
          id="project-application-count"
        label="Issues you expect to prepare"
          required
          type="number"
          value={draft.expectedIssueCount}
          onChange={(v) => setDraft({ ...draft, expectedIssueCount: v })}
          placeholder="e.g. 6"
          error={errors.expectedIssueCount}
        />
        <ModalInput
          id="project-application-contact"
        label="How the GrainHack team can reach you"
          required
          value={draft.maintainerContact}
          onChange={(v) => setDraft({ ...draft, maintainerContact: v })}
          placeholder="Email, Telegram or Discord handle"
          error={errors.maintainerContact}
        />
      </div>
      {submitError && (
        <div data-testid="project-application-error" role="alert" className={`flex flex-col gap-1 rounded-[12px] border px-3 py-2.5 text-[13px] ${isDark ? 'border-red-500/25 bg-red-500/10 text-red-300' : 'border-red-500/25 bg-red-500/[0.08] text-red-900'}`}>
          <span className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {submitError.message}
          </span>
          <span className="font-mono text-[12px]">{submitError.code}</span>
        </div>
      )}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
        <p className={`text-[12px] sm:mr-auto ${muted}`}>Only the project&apos;s owner can apply it. An admin reviews each project.</p>
        <button type="button" className={secondary} onClick={() => setDraft(null)} disabled={submitting}>
          Cancel
        </button>
        <button type="submit" className={primary} disabled={submitting}>
          {submitting
            ? 'Applying…'
            : draft.projectIds.length > 1
              ? `Apply ${draft.projectIds.length} projects`
              : draft.projectIds.length === 1 && appliedByProject.has(draft.projectIds[0])
                ? `Resubmit ${projectName(draft.projectIds[0])}`
                : 'Apply project'}
        </button>
      </div>
    </form>
  );

  return (
    <section data-testid="project-application-panel" aria-labelledby="project-application-title" className={`flex flex-col gap-4 ${card}`}>
      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="flex flex-col gap-1">
          <h2 id="project-application-title" className={`text-[16px] font-bold ${strong}`}>
            {open ? 'Apply your project to this event' : 'Your projects in this event'}
          </h2>
          <p className={`text-[13px] ${muted}`}>
            {open
              ? `${hackathonName} is choosing which projects take part. Accepted projects prepare the issues contributors are drawn for.`
              : 'The application period has closed.'}
          </p>
        </div>
        {open && draft === null && fresh.length > 0 && (
          <button type="button" className={`${primary} shrink-0`} onClick={() => startDraft(fresh.length === 1 ? [fresh[0].id] : [])}>
            {applications.length > 0 ? 'Apply another project' : 'Apply a project'}
          </button>
        )}
      </div>

      {ineligible && (
        <p data-testid="project-application-ineligible" className={`flex items-start gap-2 text-[13px] ${body}`}>
          <AlertCircle className={`mt-0.5 h-4 w-4 shrink-0 ${isDark ? 'text-amber-400' : 'text-amber-700'}`} aria-hidden />
          {ineligible}
        </p>
      )}

      {applications.length > 0 && <ul className="flex flex-col gap-2">{applications.map(statusRow)}</ul>}

      {form}
    </section>
  );
}
