'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SoundWaveLoader } from '@/components/ui/SoundWaveLoader';
import {
  buildSettingsCenterHash,
  getSettingsCenterRouteTarget,
  parseSettingsCenterHash,
  type SettingsCenterTab,
} from '@/lib/settings-center';

interface SettingsRouteLauncherProps {
  tab: SettingsCenterTab;
  preserveExistingHash?: boolean;
  preserveExistingSearch?: boolean;
  subpath?: string;
}

export function SettingsRouteLauncher({
  tab,
  preserveExistingHash = false,
  preserveExistingSearch = false,
  subpath,
}: SettingsRouteLauncherProps) {
  const router = useRouter();

  useEffect(() => {
    if (preserveExistingHash && parseSettingsCenterHash(window.location.hash)) {
      return;
    }
    router.replace(getSettingsCenterRouteTarget(tab, {
      subpath,
      search: preserveExistingSearch ? window.location.search : undefined,
    }));
  }, [preserveExistingHash, preserveExistingSearch, router, subpath, tab]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-background">
      <div className="flex items-center gap-3 text-sm text-foreground-secondary">
        <SoundWaveLoader variant="inline" />
        <span>正在打开 {buildSettingsCenterHash(tab, { subpath })}</span>
      </div>
    </div>
  );
}
