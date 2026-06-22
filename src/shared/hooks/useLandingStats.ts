import { useEffect, useMemo, useState } from 'react';

import { getLandingStats, type LandingStats } from '../api/client';
import { useTranslation } from '../i18n';

type LandingStatsDisplay = {
  activeProjects: string;
  contributors: string;
  grantsDistributed: string;
};

/** Formats an integer count using the active locale's grouping separators. */
const formatCount = (n: number, locale: string) => n.toLocaleString(locale);

/** Formats a USD amount as whole-dollar currency for the active locale. */
const formatUSD = (n: number, locale: string) =>
  new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);

export function useLandingStats() {
  const { locale } = useTranslation();
  const [stats, setStats] = useState<LandingStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        setIsLoading(true);
        const s = await getLandingStats();
        if (!isMounted) return;
        setStats(s);
        setError(null);
      } catch (e) {
        if (!isMounted) return;
        setError(e instanceof Error ? e.message : 'Failed to load stats');
      } finally {
        if (!isMounted) return;
        setIsLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const display: LandingStatsDisplay = useMemo(() => {
    if (!stats) {
      return {
        activeProjects: '—',
        contributors: '—',
        grantsDistributed: '—',
      };
    }

    return {
      activeProjects: formatCount(stats.active_projects, locale),
      contributors: formatCount(stats.contributors, locale),
      grantsDistributed: formatUSD(stats.grants_distributed_usd, locale),
    };
  }, [stats, locale]);

  return { stats, display, isLoading, error };
}


