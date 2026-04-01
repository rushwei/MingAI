/**
 * AI 个性化设置内容
 *
 * 'use client' 标记说明：
 * - 使用 hooks 管理用户偏好表单和保存状态
 * - 该模块供统一设置中心复用，旧路由仅保留启动入口
 */
'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { MessageCircleHeart, Save, SlidersHorizontal, User, X } from 'lucide-react';
import {
  ADVANCED_DIMENSIONS,
  CORE_DIMENSIONS,
  type FortuneDimensionKey,
} from '@/lib/visualization/dimensions';
import { readLocalVisualizationSettings, type VisualizationChartStyle } from '@/lib/visualization/settings';
import { SoundWaveLoader } from '@/components/ui/SoundWaveLoader';
import { useSessionSafe } from '@/components/providers/ClientProviders';
import { useToast } from '@/components/ui/Toast';
import { SettingsLoginRequired } from '@/components/settings/SettingsLoginRequired';
import { SettingsRouteLauncher } from '@/components/settings/SettingsRouteLauncher';
import { getCurrentUserSettings, updateCurrentUserSettings } from '@/lib/user/settings';
import { syncVisualizationPreferencesAfterSave } from '@/lib/user/ai-settings-local-sync';
import { CHART_TEXT_DETAIL_OPTIONS, type ChartTextDetailLevel } from '@/lib/divination/detail-level';

type ExpressionStyle = 'direct' | 'gentle';
type UserProfileDraft = {
  identity: string;
  occupation: string;
  focus: string;
  answerPreference: string;
  avoid: string;
};

type AISettingsDraftSnapshot = {
  expressionStyle: ExpressionStyle;
  chartPromptDetailLevel: ChartTextDetailLevel;
  customInstructions: string;
  selectedDimensions: FortuneDimensionKey[];
  dayunPeriods: number;
  chartStyle: VisualizationChartStyle;
  userProfile: UserProfileDraft;
};

const CHART_STYLE_OPTIONS: Array<{ value: VisualizationChartStyle; label: string }> = [
  { value: 'modern', label: '简约现代' },
  { value: 'classic-chinese', label: '经典中式' },
  { value: 'dark', label: '暗色高对比' },
];

const USER_PROFILE_LIMIT = 120;
const CUSTOM_INSTRUCTIONS_LIMIT = 4000;
const EMPTY_USER_PROFILE: UserProfileDraft = {
  identity: '',
  occupation: '',
  focus: '',
  answerPreference: '',
  avoid: '',
};

function normalizeUserProfileDraft(userProfile: UserProfileDraft): UserProfileDraft {
  return {
    identity: userProfile.identity.trim(),
    occupation: userProfile.occupation.trim(),
    focus: userProfile.focus.trim(),
    answerPreference: userProfile.answerPreference.trim(),
    avoid: userProfile.avoid.trim(),
  };
}

function buildDraftSnapshot(input: {
  expressionStyle: ExpressionStyle;
  chartPromptDetailLevel: ChartTextDetailLevel;
  customInstructions: string;
  selectedDimensions: FortuneDimensionKey[];
  dayunPeriods: number;
  chartStyle: VisualizationChartStyle;
  userProfile: UserProfileDraft;
}): AISettingsDraftSnapshot {
  return {
    expressionStyle: input.expressionStyle,
    chartPromptDetailLevel: input.chartPromptDetailLevel,
    customInstructions: input.customInstructions,
    selectedDimensions: [...input.selectedDimensions],
    dayunPeriods: input.dayunPeriods,
    chartStyle: input.chartStyle,
    userProfile: normalizeUserProfileDraft(input.userProfile),
  };
}

function SectionTitle({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-md text-foreground/70">
          {icon}
        </div>
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      </div>
      <p className="text-sm text-foreground-secondary">{description}</p>
    </div>
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <label className="text-xs font-medium text-foreground/60">{children}</label>;
}

function ToggleButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md border px-3 py-2 text-sm transition-colors duration-150 ${
        active
          ? 'border-border bg-[#e3e1db] text-[#37352f] dark:bg-background-tertiary dark:text-foreground'
          : 'border-border bg-transparent text-foreground-secondary hover:bg-[#efedea] dark:hover:bg-background-secondary'
      }`}
    >
      {children}
    </button>
  );
}

export function AISettingsContent({ embedded = false }: { embedded?: boolean }) {
  const { user, loading: sessionLoading } = useSessionSafe();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settingsLoadFailed, setSettingsLoadFailed] = useState(false);

  const [expressionStyle, setExpressionStyle] = useState<ExpressionStyle>('direct');
  const [chartPromptDetailLevel, setChartPromptDetailLevel] = useState<ChartTextDetailLevel>('default');
  const [customInstructions, setCustomInstructions] = useState('');
  const [selectedDimensions, setSelectedDimensions] = useState<FortuneDimensionKey[]>(
    () => CORE_DIMENSIONS.slice(0, 6).map((dimension) => dimension.key),
  );
  const [dayunPeriods, setDayunPeriods] = useState(5);
  const [chartStyle, setChartStyle] = useState<VisualizationChartStyle>('modern');
  const [userProfile, setUserProfile] = useState<UserProfileDraft>(EMPTY_USER_PROFILE);
  const [savedSnapshot, setSavedSnapshot] = useState<AISettingsDraftSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  const applyDraftSnapshot = (snapshot: AISettingsDraftSnapshot) => {
    setExpressionStyle(snapshot.expressionStyle);
    setChartPromptDetailLevel(snapshot.chartPromptDetailLevel);
    setCustomInstructions(snapshot.customInstructions);
    setSelectedDimensions(snapshot.selectedDimensions);
    setDayunPeriods(snapshot.dayunPeriods);
    setChartStyle(snapshot.chartStyle);
    setUserProfile(snapshot.userProfile);
  };

  useEffect(() => {
    const init = async () => {
      if (sessionLoading) return;
      if (!user) {
        setSavedSnapshot(null);
        setLoading(false);
        return;
      }

      const { settings, error: loadError } = await getCurrentUserSettings();
      if (loadError) {
        setSavedSnapshot(null);
        setError(loadError.message || '加载个性化设置失败');
        setSettingsLoadFailed(true);
        setLoading(false);
        return;
      }

      setSettingsLoadFailed(false);
      const nextExpressionStyle = (settings?.expressionStyle || 'direct') as ExpressionStyle;
      const nextChartPromptDetailLevel = settings?.chartPromptDetailLevel || 'default';
      const nextCustomInstructions = (settings?.customInstructions || '').slice(0, CUSTOM_INSTRUCTIONS_LIMIT);

      const visualizationSettings = settings?.visualizationSettings || readLocalVisualizationSettings(localStorage);
      let nextSelectedDimensions = CORE_DIMENSIONS.slice(0, 6).map((dimension) => dimension.key);
      if (visualizationSettings?.selectedDimensions?.length) {
        nextSelectedDimensions = visualizationSettings.selectedDimensions;
      }
      let nextDayunPeriods = 5;
      if (typeof visualizationSettings?.dayunDisplayCount === 'number') {
        nextDayunPeriods = visualizationSettings.dayunDisplayCount;
      }
      let nextChartStyle: VisualizationChartStyle = 'modern';
      if (visualizationSettings?.chartStyle) {
        nextChartStyle = visualizationSettings.chartStyle;
      }

      const profile = settings?.userProfile;
      let nextUserProfile = EMPTY_USER_PROFILE;
      if (typeof profile === 'string') {
        nextUserProfile = {
          ...EMPTY_USER_PROFILE,
          focus: profile.slice(0, USER_PROFILE_LIMIT),
        };
      } else if (profile && typeof profile === 'object') {
        const typed = profile as Record<string, unknown>;
        nextUserProfile = {
          identity: typeof typed.identity === 'string' ? typed.identity.slice(0, USER_PROFILE_LIMIT) : '',
          occupation: typeof typed.occupation === 'string' ? typed.occupation.slice(0, USER_PROFILE_LIMIT) : '',
          focus: typeof typed.focus === 'string' ? typed.focus.slice(0, USER_PROFILE_LIMIT) : '',
          answerPreference: typeof typed.answerPreference === 'string' ? typed.answerPreference.slice(0, USER_PROFILE_LIMIT) : '',
          avoid: typeof typed.avoid === 'string' ? typed.avoid.slice(0, USER_PROFILE_LIMIT) : '',
        };
      }

      const snapshot = buildDraftSnapshot({
        expressionStyle: nextExpressionStyle,
        chartPromptDetailLevel: nextChartPromptDetailLevel,
        customInstructions: nextCustomInstructions,
        selectedDimensions: nextSelectedDimensions,
        dayunPeriods: nextDayunPeriods,
        chartStyle: nextChartStyle,
        userProfile: nextUserProfile,
      });

      applyDraftSnapshot(snapshot);
      setSavedSnapshot(snapshot);

      setLoading(false);
    };

    void init();
  }, [sessionLoading, user]);

  const allDimensions = useMemo(
    () => [...CORE_DIMENSIONS, ...ADVANCED_DIMENSIONS],
    [],
  );
  const draftSnapshot = useMemo(() => buildDraftSnapshot({
    expressionStyle,
    chartPromptDetailLevel,
    customInstructions,
    selectedDimensions,
    dayunPeriods,
    chartStyle,
    userProfile,
  }), [chartPromptDetailLevel, chartStyle, customInstructions, dayunPeriods, expressionStyle, selectedDimensions, userProfile]);
  const isDirty = useMemo(() => (
    savedSnapshot ? JSON.stringify(draftSnapshot) !== JSON.stringify(savedSnapshot) : false
  ), [draftSnapshot, savedSnapshot]);

  const handleToggleDimension = (key: FortuneDimensionKey) => {
    const alreadySelected = selectedDimensions.includes(key);
    if (alreadySelected) {
      if (selectedDimensions.length <= 3) {
        return;
      }
      setSelectedDimensions(selectedDimensions.filter((item) => item !== key));
      return;
    }

    if (selectedDimensions.length >= 12) {
      return;
    }
    setSelectedDimensions([...selectedDimensions, key]);
  };

  const handleSave = async () => {
    if (!user || settingsLoadFailed) return;

    setError(null);
    setSaving(true);

    const nextSavedSnapshot = draftSnapshot;
    const profileValue = nextSavedSnapshot.userProfile;
    const profilePayload = Object.values(profileValue).some((value) => value.length > 0) ? profileValue : null;

    const saved = await updateCurrentUserSettings({
      expressionStyle: nextSavedSnapshot.expressionStyle,
      chartPromptDetailLevel: nextSavedSnapshot.chartPromptDetailLevel,
      customInstructions: nextSavedSnapshot.customInstructions || null,
      userProfile: profilePayload,
      visualizationSettings: {
        selectedDimensions: nextSavedSnapshot.selectedDimensions,
        dayunDisplayCount: nextSavedSnapshot.dayunPeriods,
        chartStyle: nextSavedSnapshot.chartStyle,
      },
    });

    setSaving(false);

    const synced = syncVisualizationPreferencesAfterSave(
      localStorage,
      {
        selectedDimensions: nextSavedSnapshot.selectedDimensions,
        dayunDisplayCount: nextSavedSnapshot.dayunPeriods,
        chartStyle: nextSavedSnapshot.chartStyle,
      },
      saved,
    );

    if (!synced || !saved) {
      setError('保存失败');
      showToast('error', '保存失败');
      return;
    }

    applyDraftSnapshot(nextSavedSnapshot);
    setSavedSnapshot(nextSavedSnapshot);
    showToast('success', '个性化设置已保存');
  };

  const handleCancel = () => {
    if (!savedSnapshot || saving) return;
    setError(null);
    applyDraftSnapshot(savedSnapshot);
  };

  if (loading || sessionLoading) {
    return (
      <div className="flex min-h-[240px] items-center justify-center rounded-lg border border-border bg-background">
        <SoundWaveLoader variant="inline" />
      </div>
    );
  }

  if (!user) {
    return <SettingsLoginRequired title="请先登录后配置 AI 个性化" />;
  }

  return (
    <div className={embedded ? 'space-y-8' : 'mx-auto max-w-4xl space-y-8 px-4 py-6'}>
      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      ) : null}

      <section className="space-y-4">
        <SectionTitle
          icon={<User className="h-4 w-4" />}
          title="关于你"
          description="这些信息会帮助 AI 更准确地理解你的背景和当前关注重点。"
        />

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <FieldLabel>身份</FieldLabel>
            <input
              value={userProfile.identity}
              onChange={(event) => setUserProfile((prev) => ({ ...prev, identity: event.target.value.slice(0, USER_PROFILE_LIMIT) }))}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none transition-colors duration-150 focus:ring-2 focus:ring-blue-500/30"
              placeholder="例如：创业者"
            />
          </div>

          <div className="space-y-2">
            <FieldLabel>职业</FieldLabel>
            <input
              value={userProfile.occupation}
              onChange={(event) => setUserProfile((prev) => ({ ...prev, occupation: event.target.value.slice(0, USER_PROFILE_LIMIT) }))}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none transition-colors duration-150 focus:ring-2 focus:ring-blue-500/30"
              placeholder="例如：产品经理"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <FieldLabel>当前关注点</FieldLabel>
            <input
              value={userProfile.focus}
              onChange={(event) => setUserProfile((prev) => ({ ...prev, focus: event.target.value.slice(0, USER_PROFILE_LIMIT) }))}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none transition-colors duration-150 focus:ring-2 focus:ring-blue-500/30"
              placeholder="例如：事业发展、人际关系"
            />
          </div>

          <div className="space-y-2">
            <FieldLabel>回答偏好</FieldLabel>
            <textarea
              value={userProfile.answerPreference}
              onChange={(event) => setUserProfile((prev) => ({ ...prev, answerPreference: event.target.value.slice(0, USER_PROFILE_LIMIT) }))}
              className="min-h-[96px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none transition-colors duration-150 focus:ring-2 focus:ring-blue-500/30"
              placeholder="例如：结论先行、给出明确建议"
            />
          </div>

          <div className="space-y-2">
            <FieldLabel>避讳与禁忌</FieldLabel>
            <textarea
              value={userProfile.avoid}
              onChange={(event) => setUserProfile((prev) => ({ ...prev, avoid: event.target.value.slice(0, USER_PROFILE_LIMIT) }))}
              className="min-h-[96px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none transition-colors duration-150 focus:ring-2 focus:ring-blue-500/30"
              placeholder="例如：避免过于玄而不实、避免术语堆叠"
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <SectionTitle
          icon={<MessageCircleHeart className="h-4 w-4" />}
          title="对话偏好"
          description="设置 AI 的表达风格与系统级自定义指令。"
        />

        <div className="space-y-4">
          <div className="space-y-2">
            <FieldLabel>表达风格</FieldLabel>
            <div className="flex flex-wrap gap-2">
              <ToggleButton active={expressionStyle === 'direct'} onClick={() => setExpressionStyle('direct')}>
                直接干练
              </ToggleButton>
              <ToggleButton active={expressionStyle === 'gentle'} onClick={() => setExpressionStyle('gentle')}>
                温和委婉
              </ToggleButton>
            </div>
          </div>

          <div className="space-y-2">
            <FieldLabel>命盘注入详细级别</FieldLabel>
            <div className="flex flex-wrap gap-2">
              {CHART_TEXT_DETAIL_OPTIONS.map((option) => (
                <ToggleButton
                  key={option.value}
                  active={chartPromptDetailLevel === option.value}
                  onClick={() => setChartPromptDetailLevel(option.value)}
                >
                  {option.label}
                </ToggleButton>
              ))}
            </div>
            <p className="text-xs text-foreground-secondary">
              用于聊天命盘注入与结果页 AI 解读 prompt。建议保留默认，默认经过微调能降低噪音。
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <FieldLabel>自定义指令</FieldLabel>
              <span className="text-xs text-foreground/50">
                {customInstructions.length}/{CUSTOM_INSTRUCTIONS_LIMIT}
              </span>
            </div>
            <textarea
              value={customInstructions}
              onChange={(event) => setCustomInstructions(event.target.value.slice(0, CUSTOM_INSTRUCTIONS_LIMIT))}
              className="min-h-[140px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none transition-colors duration-150 focus:ring-2 focus:ring-blue-500/30"
              placeholder="例如：先给结论，再给依据；对职业规划问题优先给可执行建议。"
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <SectionTitle
          icon={<SlidersHorizontal className="h-4 w-4" />}
          title="运势可视化偏好"
          description="控制 AI 输出时默认关注的维度、图表风格和大运展示数量。"
        />

        <div className="space-y-4">
          <div className="space-y-2">
            <FieldLabel>维度选择（至少 3 个，最多 12 个）</FieldLabel>
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
              {allDimensions.map((dimension) => {
                const active = selectedDimensions.includes(dimension.key);
                return (
                  <button
                    key={dimension.key}
                    type="button"
                    onClick={() => handleToggleDimension(dimension.key)}
                    className={`flex items-center justify-between rounded-md border px-3 py-2 text-sm transition-colors duration-150 ${
                      active
                        ? 'border-border bg-[#e3e1db] text-[#37352f] dark:bg-background-tertiary dark:text-foreground'
                        : 'border-border bg-background text-foreground-secondary hover:bg-[#efedea] dark:hover:bg-background-secondary'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span>{dimension.icon}</span>
                      <span>{dimension.label}</span>
                    </span>
                    {/* <span className="text-xs text-foreground/40">{active ? '已选' : '未选'}</span> */}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <FieldLabel>默认展示大运期数</FieldLabel>
              <select
                value={dayunPeriods}
                onChange={(event) => setDayunPeriods(Number(event.target.value))}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none transition-colors duration-150 focus:ring-2 focus:ring-blue-500/30"
              >
                {[3, 4, 5, 6, 7, 8, 9, 10].map((count) => (
                  <option key={count} value={count}>{count} 期</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <FieldLabel>图表风格</FieldLabel>
              <select
                value={chartStyle}
                onChange={(event) => setChartStyle(event.target.value as VisualizationChartStyle)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none transition-colors duration-150 focus:ring-2 focus:ring-blue-500/30"
              >
                {CHART_STYLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </section>

      {isDirty ? (
        <div className="sticky bottom-0 z-20 pb-2">
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-background/95 px-4 py-3 shadow-sm backdrop-blur md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">个性化设置已修改</p>
              <p className="text-xs text-foreground-secondary">保存后才会影响后续 AI 对话和可视化偏好。</p>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleCancel}
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-transparent px-3 py-2 text-sm font-medium text-foreground-secondary transition-colors duration-150 hover:bg-[#efedea] hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-background-secondary"
              >
                <X className="h-4 w-4" />
                取消
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || settingsLoadFailed}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-[#e3e1db] px-3 py-2 text-sm font-medium text-[#37352f] transition-colors duration-150 hover:bg-[#d9d6ce] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-background-tertiary dark:text-foreground dark:hover:bg-background-secondary"
              >
                {saving ? <SoundWaveLoader variant="inline" /> : <Save className="h-4 w-4" />}
                保存
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function AISettingsPage() {
  return <SettingsRouteLauncher tab="personalization" />;
}
