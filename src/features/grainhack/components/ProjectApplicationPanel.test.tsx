import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, within } from '@testing-library/react'
import { renderWithProviders, screen, waitFor } from '../../../test/renderWithProviders'
import { ApiError } from '../../../shared/api/apiError'
import type { HackathonApplication } from '../../../shared/api/client'

const h = vi.hoisted(() => ({
  getMyProjects: vi.fn(),
  getMyHackathonApplications: vi.fn(),
  applyToHackathon: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('sonner', () => ({ toast: h.toast }))
vi.mock('../../../shared/api/client', () => ({
  getMyProjects: h.getMyProjects,
  getMyHackathonApplications: h.getMyHackathonApplications,
  applyToHackathon: h.applyToHackathon,
}))

import { ProjectApplicationPanel, applyFailure, validateApplication } from './ProjectApplicationPanel'

const project = (id: string, name: string, status = 'verified') => ({
  id,
  github_full_name: name,
  github_repo_id: 1,
  status,
  ecosystem_name: 'Base',
  language: 'TypeScript',
  tags: [],
  category: 'tooling',
  verification_error: null,
  verified_at: status === 'verified' ? '2026-09-01T00:00:00Z' : null,
  webhook_created_at: null,
  webhook_id: null,
  webhook_url: null,
  created_at: '2026-09-01T00:00:00Z',
  updated_at: '2026-09-01T00:00:00Z',
})

const application = (over: Partial<HackathonApplication> = {}): HackathonApplication => ({
  id: 'app-1',
  hackathon_id: 'hack-1',
  hackathon_name: 'GrainHack Base Sepolia',
  project_id: 'p1',
  project_full_name: 'acme/widgets',
  short_description: 'A widget library.',
  goal: 'Find regular contributors.',
  expected_issue_count: 6,
  maintainer_contact: 'tg @acme',
  status: 'pending',
  review_reason: null,
  reviewed_at: null,
  created_at: new Date(Date.now() - 3600_000).toISOString(),
  ...over,
})

async function renderPanel(
  { projects = [project('p1', 'acme/widgets')], applications = [] as HackathonApplication[], phase = 'application_period' } = {},
) {
  h.getMyProjects.mockResolvedValue(projects)
  h.getMyHackathonApplications.mockResolvedValue({ applications })
  const r = renderWithProviders(<ProjectApplicationPanel hackathonId="hack-1" hackathonName="GrainHack Base Sepolia" phase={phase} />)
  await waitFor(() => expect(h.getMyHackathonApplications).toHaveBeenCalled())
  return r
}

const panel = () => screen.getByTestId('project-application-panel')
const form = () => screen.getByTestId('project-application-form')

function fill(f: HTMLElement, values: { what?: string; goal?: string; count?: string; contact?: string }) {
  const set = (label: RegExp, v?: string) => v !== undefined && fireEvent.change(within(f).getByLabelText(label), { target: { value: v } })
  set(/What the project is/, values.what)
  set(/What you want from the event/, values.goal)
  set(/Issues you expect to prepare/, values.count)
  set(/How the GrainHack team can reach you/, values.contact)
}

beforeEach(() => vi.clearAllMocks())

describe('validateApplication / applyFailure', () => {
  const ok = { projectIds: ['p1'], shortDescription: 'x', goal: 'y', expectedIssueCount: '6', maintainerContact: 'z' }

  it('accepts a complete draft', () => {
    expect(validateApplication(ok)).toEqual({})
  })

  it('names every missing or out-of-range field', () => {
    expect(validateApplication({ projectIds: [], shortDescription: ' ', goal: '', expectedIssueCount: '', maintainerContact: '  ' })).toEqual({
      projectIds: 'Choose at least one project.',
      shortDescription: 'Say what the project is.',
      goal: 'Say what you want from the event.',
      expectedIssueCount: 'A whole number from 1 to 100.',
      maintainerContact: 'Say how the GrainHack team can reach you.',
    })
    for (const n of ['0', '-1', '2.5', 'six', '101']) {
      expect(validateApplication({ ...ok, expectedIssueCount: n }).expectedIssueCount).toBe('A whole number from 1 to 100.')
    }
    expect(validateApplication({ ...ok, shortDescription: 'a'.repeat(501) }).shortDescription).toBe('Keep it under 500 characters.')
  })

  it.each([
    ['hackathon_not_accepting_applications', "This event isn't taking project applications any more."],
    ['not_project_owner', "Only a project's owner can apply it, and you don't own one of these."],
    ['project_not_verified', "One of these projects isn't verified yet, so it can't apply."],
    ['project_not_found', "One of these projects couldn't be found. It may have been removed."],
    ['application_create_failed', "The server couldn't save the application. Try again."],
    ['something_new', "Couldn't apply (something_new)."],
  ])('%s', (code, sentence) => {
    expect(applyFailure(code)).toBe(sentence)
  })
})

describe('ProjectApplicationPanel', () => {
  it('renders nothing outside the application period when none of your projects applied', async () => {
    const { container } = await renderPanel({ phase: 'live' })
    await waitFor(() => expect(container).toBeEmptyDOMElement())
  })

  it('still shows where your application stands after the period closes, with no form', async () => {
    await renderPanel({ phase: 'issue_prep', applications: [application({ status: 'accepted', reviewed_at: new Date().toISOString() })] })
    await waitFor(() => expect(panel()).toHaveTextContent('Your projects in this event'))
    expect(panel()).toHaveTextContent('The application period has closed.')
    expect(screen.getByTestId('project-application').dataset.status).toBe('accepted')
    expect(panel()).toHaveTextContent("This project is in the event. You'll prepare its issues when the event moves to issue prep.")
    expect(screen.queryByRole('button', { name: /Apply/ })).not.toBeInTheDocument()
  })

  it('not eligible: no projects says how to become eligible', async () => {
    await renderPanel({ projects: [] })
    await waitFor(() => expect(screen.getByTestId('project-application-ineligible')).toHaveTextContent('Projects apply to this event, not people.'))
    expect(screen.queryByRole('button', { name: /Apply/ })).not.toBeInTheDocument()
  })

  it('not eligible: an unverified project is named with its status', async () => {
    await renderPanel({ projects: [project('p1', 'acme/widgets', 'pending_verification')] })
    await waitFor(() =>
      expect(screen.getByTestId('project-application-ineligible')).toHaveTextContent(
        'Only a verified project you own can apply, and none of yours is verified yet (acme/widgets: pending_verification).',
      ),
    )
    expect(screen.queryByRole('button', { name: /Apply/ })).not.toBeInTheDocument()
  })

  it('validates beside each field and sends nothing until the draft is complete', async () => {
    await renderPanel()
    fireEvent.click(await screen.findByRole('button', { name: 'Apply a project' }))
    // A single verified project is chosen for you.
    expect(within(form()).getByLabelText('acme/widgets')).toBeChecked()
    fireEvent.click(within(form()).getByRole('button', { name: 'Apply project' }))
    expect(form()).toHaveTextContent('Say what the project is.')
    expect(form()).toHaveTextContent('Say what you want from the event.')
    expect(form()).toHaveTextContent('A whole number from 1 to 100.')
    expect(form()).toHaveTextContent('Say how the GrainHack team can reach you.')
    expect(h.applyToHackathon).not.toHaveBeenCalled()
  })

  it('applies with trimmed fields and a numeric count, then shows it as in review', async () => {
    h.applyToHackathon.mockResolvedValue({ application_ids: ['app-1'] })
    await renderPanel()
    fireEvent.click(await screen.findByRole('button', { name: 'Apply a project' }))
    fill(form(), { what: ' A widget library. ', goal: 'Find regular contributors.', count: '6', contact: ' tg @acme ' })
    h.getMyHackathonApplications.mockResolvedValue({ applications: [application()] })
    fireEvent.click(within(form()).getByRole('button', { name: 'Apply project' }))

    await waitFor(() =>
      expect(h.applyToHackathon).toHaveBeenCalledWith('hack-1', {
        project_ids: ['p1'],
        short_description: 'A widget library.',
        goal: 'Find regular contributors.',
        expected_issue_count: 6,
        maintainer_contact: 'tg @acme',
      }),
    )
    await waitFor(() => expect(screen.getByTestId('project-application').dataset.status).toBe('pending'))
    expect(h.toast.success).toHaveBeenCalledWith('Applied your project. An admin reviews each one; the decision shows here.')
    expect(screen.queryByTestId('project-application-form')).not.toBeInTheDocument()
    // In review: re-applying would only reset it, so nothing is offered.
    expect(screen.queryByRole('button', { name: /Apply|Update/ })).not.toBeInTheDocument()
    expect(panel()).toHaveTextContent('In review')
  })

  it('lets you choose several projects, none chosen for you', async () => {
    h.applyToHackathon.mockResolvedValue({ application_ids: ['a', 'b'] })
    await renderPanel({ projects: [project('p1', 'acme/widgets'), project('p2', 'acme/gadgets'), project('p3', 'acme/draft', 'pending_verification')] })
    fireEvent.click(await screen.findByRole('button', { name: 'Apply a project' }))
    expect(within(form()).queryByLabelText('acme/draft')).not.toBeInTheDocument()
    expect(within(form()).getByLabelText('acme/widgets')).not.toBeChecked()
    fireEvent.click(within(form()).getByLabelText('acme/widgets'))
    fireEvent.click(within(form()).getByLabelText('acme/gadgets'))
    fill(form(), { what: 'x', goal: 'y', count: '3', contact: 'z' })
    fireEvent.click(within(form()).getByRole('button', { name: 'Apply 2 projects' }))
    await waitFor(() => expect(h.applyToHackathon.mock.calls[0][1].project_ids).toEqual(['p1', 'p2']))
  })

  it('more information requested: shows the reason and resubmits the same project, prefilled', async () => {
    h.applyToHackathon.mockResolvedValue({ application_ids: ['app-1'] })
    await renderPanel({ applications: [application({ status: 'more_info_requested', review_reason: 'Which issues would you prepare?' })] })
    await waitFor(() => expect(panel()).toHaveTextContent('More information requested'))
    expect(panel()).toHaveTextContent('From the reviewer: Which issues would you prepare?')
    // The only verified project has applied, so there is no fresh-apply button.
    expect(screen.queryByRole('button', { name: 'Apply a project' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Update application' }))
    expect(within(form()).getByLabelText(/What the project is/)).toHaveValue('A widget library.')
    fill(form(), { goal: 'Six docs issues and two refactors.' })
    fireEvent.click(within(form()).getByRole('button', { name: 'Resubmit acme/widgets' }))
    await waitFor(() =>
      expect(h.applyToHackathon).toHaveBeenCalledWith('hack-1', expect.objectContaining({ project_ids: ['p1'], goal: 'Six docs issues and two refactors.', expected_issue_count: 6 })),
    )
  })

  it('rejected: shows the reason and offers to apply again while the period is open', async () => {
    await renderPanel({ applications: [application({ status: 'rejected', review_reason: 'Repository too new.' })] })
    await waitFor(() => expect(panel()).toHaveTextContent('Not accepted'))
    expect(panel()).toHaveTextContent('From the reviewer: Repository too new.')
    expect(panel()).toHaveTextContent('Applying again sends it back for review.')
    expect(screen.getByRole('button', { name: 'Apply again' })).toBeInTheDocument()
  })

  it('accepted while still open: no form for that project', async () => {
    await renderPanel({ applications: [application({ status: 'accepted' })] })
    await waitFor(() => expect(panel()).toHaveTextContent('Accepted'))
    expect(screen.queryByRole('button', { name: /Apply|Update/ })).not.toBeInTheDocument()
  })

  it('a refused application says why, inline and as a toast, and re-reads what was saved', async () => {
    h.applyToHackathon.mockRejectedValue(new ApiError('hackathon_not_accepting_applications', 400, { error: 'hackathon_not_accepting_applications' }))
    await renderPanel()
    fireEvent.click(await screen.findByRole('button', { name: 'Apply a project' }))
    fill(form(), { what: 'x', goal: 'y', count: '2', contact: 'z' })
    fireEvent.click(within(form()).getByRole('button', { name: 'Apply project' }))
    await waitFor(() => expect(h.toast.error).toHaveBeenCalledWith("This event isn't taking project applications any more."))
    const err = screen.getByTestId('project-application-error')
    expect(err).toHaveTextContent("This event isn't taking project applications any more.")
    expect(err).toHaveTextContent('hackathon_not_accepting_applications')
    await waitFor(() => expect(h.getMyHackathonApplications).toHaveBeenCalledTimes(2))
  })

  it('a forbidden project (403) maps to the ownership sentence', async () => {
    h.applyToHackathon.mockRejectedValue(new ApiError('not_project_owner', 403, { error: 'not_project_owner', project_id: 'p1' }))
    await renderPanel()
    fireEvent.click(await screen.findByRole('button', { name: 'Apply a project' }))
    fill(form(), { what: 'x', goal: 'y', count: '2', contact: 'z' })
    fireEvent.click(within(form()).getByRole('button', { name: 'Apply project' }))
    await waitFor(() => expect(screen.getByTestId('project-application-error')).toHaveTextContent("Only a project's owner can apply it"))
  })

  it('a failed load is said during the application period, and silent otherwise', async () => {
    h.getMyProjects.mockRejectedValue(new ApiError('boom', 500, { error: 'projects_list_failed' }))
    h.getMyHackathonApplications.mockResolvedValue({ applications: [] })
    renderWithProviders(<ProjectApplicationPanel hackathonId="hack-1" hackathonName="GrainHack" phase="application_period" />)
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent("Couldn't load your projects for this event"))

    const { container } = renderWithProviders(<ProjectApplicationPanel hackathonId="hack-1" hackathonName="GrainHack" phase="live" />)
    await waitFor(() => expect(h.getMyProjects).toHaveBeenCalledTimes(2))
    expect(container).toBeEmptyDOMElement()
  })
})
