# Grainlify

**Grainlify** is an open-source contribution platform that connects contributors with maintainers through GitHub OAuth authentication. The platform enables developers to discover projects, track contributions, manage open-source work, and participate in ecosystem-driven initiatives.

## Features

- **GitHub OAuth Authentication** - Secure login using GitHub credentials
- **Contributor Dashboard** - Track your contributions, activity calendar, and ecosystem participation
- **Project Discovery** - Browse projects with filters for languages, ecosystems, categories, and tags
- **Maintainer Tools** - Manage projects, issues, and pull requests
- **Leaderboards & Analytics** - View contribution rankings and data insights
- **Open Source Week Events** - Participate in community events and challenges
- **Ecosystem Explorer** - Discover projects across different blockchain and tech ecosystems
- **Profile Management** - Customize your profile, notification preferences, and payout settings
- **KYC Verification** - Verify identity for rewards and payments

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite
- **UI:** Tailwind CSS 4, Radix UI, shadcn/ui components
- **Routing:** React Router DOM 7
- **State:** React Context API
- **Charts:** Recharts, D3
- **Authentication:** GitHub OAuth with JWT
- **Package Manager:** pnpm

## Prerequisites

- **Node.js**: v20.x or higher (LTS recommended)
- **pnpm**: Install with `npm install -g pnpm`
- **GitHub OAuth App**: Required for authentication (backend handles OAuth flow)

## Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd grainlify
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and set:
   - `VITE_API_BASE_URL`: Backend API URL (e.g., `http://localhost:8080` or production URL)
   - `VITE_FRONTEND_BASE_URL`: Frontend URL (optional, defaults to `http://localhost:5173`)

4. **Start development server**
   ```bash
   pnpm run dev
   ```
   
   The app will be available at `http://localhost:5173`

## Environment Variables

All environment variables must use the `VITE_` prefix to be exposed to the client.

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `VITE_API_BASE_URL` | Yes | Backend API base URL | `http://localhost:8080` |
| `VITE_FRONTEND_BASE_URL` | No | Frontend base URL (defaults to current origin) | `http://localhost:5173` |

## Authentication Flow

1. User clicks "Sign In" or "Sign Up" (both use GitHub OAuth)
2. Frontend redirects to backend: `{VITE_API_BASE_URL}/auth/github/login/start`
3. Backend redirects to GitHub OAuth authorization
4. User authorizes Grainlify on GitHub
5. GitHub redirects to backend callback endpoint
6. Backend processes OAuth, issues JWT, and redirects to: `/auth/callback?token=<jwt>`
7. Frontend stores JWT in `localStorage` as `patchwork_jwt`
8. Frontend fetches user info from `/me` endpoint
9. User is redirected to dashboard

All authenticated API requests include: `Authorization: Bearer <jwt>`

## Project Architecture

```
/src
├── app/                    # Core application setup
│   ├── components/         # Shared app components (LanguageIcon, UI library)
│   ├── contexts/           # Global contexts (Auth, Theme)
│   ├── pages/              # Top-level page components
│   └── utils/              # App utilities
├── features/               # Feature-based modules
│   ├── admin/              # Admin panel
│   ├── auth/               # Authentication pages (Sign In, Sign Up, Callback)
│   ├── blog/               # Blog articles
│   ├── dashboard/          # Main dashboard with sub-pages
│   │   ├── pages/          # Dashboard pages (Discover, Browse, Contributors, etc.)
│   │   └── components/     # Dashboard-specific components
│   ├── landing/            # Landing page
│   ├── leaderboard/        # Contribution rankings
│   ├── maintainers/        # Maintainer dashboard and tools
│   └── settings/           # User settings and preferences
└── shared/                 # Shared utilities across features
    ├── api/                # API client and endpoints
    ├── config/             # Configuration (API URLs)
    ├── contexts/           # Shared contexts
    └── types/              # Shared TypeScript types
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm run dev` | Start development server |
| `pnpm run build` | Build for production |
| `pnpm run generate-favicon` | Generate favicon from logo |
| `pnpm run test:e2e` | Run all E2E tests with Playwright |

## E2E Testing

End-to-end tests are executed using Playwright. The test suite is configured to run across Chromium, Firefox, and WebKit rendering engines.

To run all E2E tests across all configured engines:
```bash
pnpm run test:e2e
```

To run E2E tests on a single browser locally, specify the `--project` flag:
- **Chromium:** `pnpm run test:e2e --project=chromium`
- **Firefox:** `pnpm run test:e2e --project=firefox`
- **WebKit:** `pnpm run test:e2e --project=webkit`

To open the Playwright UI runner:
```bash
pnpm exec playwright test --ui
```

## API Integration

The frontend communicates with the Patchwork backend API. All API configuration is centralized in `src/shared/config/api.ts` and uses environment variables.

See [API_INTEGRATION.md](./API_INTEGRATION.md) for detailed API documentation.

## Contributing

Contributions are welcome! Please ensure your changes:
- Follow the existing code style and architecture
- Include appropriate TypeScript types
- Maintain the glassmorphism design language
- Support both light and dark themes
- Are responsive across device sizes

## Security Notes

- **JWT Storage**: Tokens are stored in `localStorage` under the key `patchwork_jwt`
- **XSS Risk**: localStorage is vulnerable to XSS attacks; consider httpOnly cookies for production
- **OAuth Flow**: Backend handles all OAuth secrets; frontend only receives the final JWT
- **Admin Bootstrap**: `ADMIN_BOOTSTRAP_TOKEN` is a backend secret, never exposed to frontend

## License

See [LICENSE](./LICENSE) file for details.

## Documentation

- [API Integration Guide](./API_INTEGRATION.md) - Backend API integration details
- [Attributions](./ATTRIBUTIONS.md) - Third-party assets and licenses

## Support

For issues, questions, or contributions, please open an issue on GitHub.
