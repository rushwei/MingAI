/**
 * 功能模块开关 Hook
 *
 * 浏览器侧 server state 统一走 app bootstrap query。
 */
'use client';

import { useCallback, useMemo } from 'react';
import { useAppBootstrap } from '@/lib/hooks/useAppBootstrap';

type FeatureTogglesState = {
  disabledFeatures: Set<string>;
  isLoading: boolean;
  isRefreshing: boolean;
  loaded: boolean;
  error: Error | null;
  isFeatureEnabled: (featureId: string) => boolean;
  refresh: (force?: boolean, showLoading?: boolean) => Promise<void>;
};

type UseFeatureTogglesOptions = {
  enabled?: boolean;
};

export function useFeatureToggles(options: UseFeatureTogglesOptions = {}): FeatureTogglesState {
  const enabled = options.enabled ?? true;
  const bootstrap = useAppBootstrap({ enabled });
  const toggles = bootstrap.data.featureToggles;
  const togglesLoaded = bootstrap.data.featureTogglesLoaded;

  const refresh = useCallback(async (force = false, showLoading = false) => {
    void force;
    void showLoading;
    await bootstrap.refresh();
  }, [bootstrap]);

  const disabledFeatures = useMemo(
    () => new Set(
      Object.entries(toggles)
        .filter(([, disabled]) => disabled === true)
        .map(([featureId]) => featureId),
    ),
    [toggles],
  );

  const isFeatureEnabled = useCallback(
    (featureId: string) => enabled && togglesLoaded && !disabledFeatures.has(featureId),
    [disabledFeatures, enabled, togglesLoaded],
  );

  return {
    disabledFeatures,
    isLoading: enabled ? bootstrap.isLoading : false,
    isRefreshing: enabled ? bootstrap.isFetching && !bootstrap.isLoading : false,
    loaded: enabled ? togglesLoaded : true,
    error: bootstrap.error instanceof Error ? bootstrap.error : null,
    isFeatureEnabled,
    refresh,
  };
}
