import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Route, Routes } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen, within } from '../../../test/renderWithProviders';
import { DocsPage } from './DocsPage';

let role: 'contributor' | 'admin' | null = null;
vi.mock('../../../shared/contexts/AuthContext', () => ({
  useAuth: () => ({ userRole: role, isAuthenticated: role !== null, logout: () => {} }),
}));

const at = (route: string) =>
  renderWithProviders(
    <Routes>
      <Route path="/docs/*" element={<DocsPage />} />
    </Routes>,
    { route },
  );

beforeEach(() => {
  role = null;
  window.scrollTo = vi.fn();
  // cmdk measures its list; jsdom has no ResizeObserver.
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  Element.prototype.scrollIntoView ??= vi.fn();
});

describe('DocsPage', () => {
  it('renders an article: breadcrumb, title, steps, callouts and screenshots', () => {
    at('/docs/contributors/link-solana-wallet');
    expect(screen.getByRole('heading', { level: 1, name: 'Link your Solana wallet' })).toBeInTheDocument();
    expect(within(screen.getByRole('navigation', { name: 'Breadcrumb' })).getByText('Bounties')).toBeInTheDocument();
    expect(screen.getByText(/Signing is free/)).toBeInTheDocument();
    expect(screen.getByText(/already linked to another GitHub account/)).toBeInTheDocument();
    const shot = screen.getByAltText('The message your wallet will show, with the Sign message button');
    expect(shot).toHaveAttribute('src', '/docs-media/shots/walletlink-sign.light.1440.webp');
    expect(document.title).toBe('Link your Solana wallet · Grainlify Docs');
  });

  it('lists only written pages in the contents', () => {
    at('/docs/welcome');
    const contents = screen.getAllByRole('navigation', { name: 'Documentation' })[0];
    expect(within(contents).getByRole('link', { name: 'Create your account' })).toBeInTheDocument();
    expect(within(contents).queryByText('Glossary')).toBeNull();
  });

  it('marks the current page in the contents', () => {
    at('/docs/create-your-account');
    const current = within(screen.getAllByRole('navigation', { name: 'Documentation' })[0]).getByRole('link', { name: 'Create your account' });
    expect(current).toHaveAttribute('aria-current', 'page');
  });

  it('links to the previous and next pages', () => {
    at('/docs/create-your-account');
    const pager = screen.getByRole('navigation', { name: 'Previous and next page' });
    expect(within(pager).getByRole('link', { name: /Previous\s*Welcome to Grainlify/ })).toHaveAttribute('href', '/docs/welcome');
    expect(within(pager).getByRole('link', { name: /Next\s*Link your Solana wallet/ })).toBeInTheDocument();
  });

  it('says so when a page does not exist', () => {
    at('/docs/not-a-page');
    expect(screen.getByRole('heading', { name: "This page doesn't exist yet" })).toBeInTheDocument();
    expect(document.title).toBe('Page not found · Grainlify Docs');
  });

  it('opens search from the navbar and finds a page', async () => {
    const user = userEvent.setup();
    at('/docs');
    await user.click(screen.getAllByRole('button', { name: /Search the docs/ })[0]);
    await user.type(screen.getByPlaceholderText('Search the docs'), 'walet');
    // A typo still finds the page, and the page comes before its sections.
    const options = await screen.findAllByRole('option');
    expect(options[0]).toHaveTextContent(/^Link your Solana wallet/);
  });

  it('opens search with Cmd/Ctrl+K', async () => {
    const user = userEvent.setup();
    at('/docs');
    await user.keyboard('{Control>}k{/Control}');
    expect(screen.getByPlaceholderText('Search the docs')).toBeInTheDocument();
  });

  it('puts the contents, the theme switch and the account link in the phone drawer', async () => {
    const user = userEvent.setup();
    at('/docs/welcome');
    await user.click(screen.getByRole('button', { name: 'Open menu' }));
    const drawer = screen.getByRole('dialog', { name: 'Documentation contents' });
    expect(within(drawer).getByRole('link', { name: 'Create your account' })).toBeInTheDocument();
    expect(within(drawer).getByRole('button', { name: 'Toggle theme' })).toBeInTheDocument();
    expect(within(drawer).getByRole('link', { name: 'Get Started' })).toHaveAttribute('href', '/signin');
    await user.click(within(drawer).getByRole('button', { name: 'Close contents' }));
    expect(screen.queryByRole('dialog', { name: 'Documentation contents' })).toBeNull();
  });

  it('shows the start list on the docs home', () => {
    at('/docs');
    expect(screen.getByRole('heading', { level: 1, name: 'How to use Grainlify, step by step' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'New here? Start with these' })).toBeInTheDocument();
  });
});
