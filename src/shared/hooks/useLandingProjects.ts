import { useEffect, useState } from 'react';

import { getPublicProjects } from '../api/client';

export interface LandingProjectTile {
  id: string;
  name: string;
  avatar: string;
}

const deriveAvatar = (fullName: string) => {
  const owner = fullName.split('/')[0];
  return `https://github.com/${owner}.png?size=200`;
};

export function useLandingProjects(limit = 24) {
  const [projects, setProjects] = useState<LandingProjectTile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        const res = await getPublicProjects({ limit });
        if (!isMounted) return;
        setProjects(
          res.projects.map((p) => ({
            id: p.id,
            name: p.github_full_name,
            avatar: deriveAvatar(p.github_full_name),
          })),
        );
      } catch {
        if (!isMounted) return;
        setProjects([]);
      } finally {
        if (!isMounted) return;
        setIsLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [limit]);

  return { projects, isLoading };
}
