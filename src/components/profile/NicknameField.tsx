import { User as UserIcon } from 'lucide-react';

export function NicknameField({
    nickname,
    onChange,
    hasChanges,
    onSave,
    saving,
}: {
    nickname: string;
    onChange: (value: string) => void;
    hasChanges: boolean;
    onSave: () => void;
    saving: boolean;
}) {
    return (
        <div className="space-y-2">
            <label className="text-sm font-medium text-foreground-secondary">
                昵称
            </label>
            <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-secondary" />
                <input
                    type="text"
                    value={nickname}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="输入您的昵称"
                    maxLength={20}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-background-secondary border border-border focus:border-accent focus:outline-none transition-colors"
                />
            </div>
            <div className="flex items-center justify-between">
                <p className="text-xs text-foreground-secondary">
                    最多20个字符
                </p>
                {hasChanges && (
                    <button
                        onClick={onSave}
                        disabled={saving}
                        className="text-sm text-accent hover:text-accent/80 disabled:opacity-50"
                    >
                        {saving ? '保存中...' : '保存'}
                    </button>
                )}
            </div>
        </div>
    );
}
