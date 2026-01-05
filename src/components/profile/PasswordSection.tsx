import { Eye, EyeOff, Loader2, Lock } from 'lucide-react';

export function PasswordSection({
    showPasswordSection,
    onToggleSection,
    newPassword,
    confirmPassword,
    showNewPassword,
    showConfirmPassword,
    onChangeNewPassword,
    onChangeConfirmPassword,
    onToggleShowNewPassword,
    onToggleShowConfirmPassword,
    onCancel,
    onSubmit,
    changingPassword,
}: {
    showPasswordSection: boolean;
    onToggleSection: () => void;
    newPassword: string;
    confirmPassword: string;
    showNewPassword: boolean;
    showConfirmPassword: boolean;
    onChangeNewPassword: (value: string) => void;
    onChangeConfirmPassword: (value: string) => void;
    onToggleShowNewPassword: () => void;
    onToggleShowConfirmPassword: () => void;
    onCancel: () => void;
    onSubmit: () => void;
    changingPassword: boolean;
}) {
    return (
        <div className="space-y-2">
            <label className="text-sm font-medium text-foreground-secondary">
                密码
            </label>
            {!showPasswordSection ? (
                <button
                    onClick={onToggleSection}
                    className="w-full px-4 py-3 rounded-xl bg-background-secondary border border-border text-left flex items-center gap-3 hover:border-accent transition-colors"
                >
                    <Lock className="w-5 h-5 text-foreground-secondary" />
                    <span>修改密码</span>
                </button>
            ) : (
                <div className="space-y-3 p-4 rounded-xl bg-background-secondary border border-border">
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-secondary" />
                        <input
                            type={showNewPassword ? 'text' : 'password'}
                            value={newPassword}
                            onChange={(e) => onChangeNewPassword(e.target.value)}
                            placeholder="新密码（至少6位）"
                            className="w-full pl-10 pr-10 py-3 rounded-lg bg-background border border-border focus:border-accent focus:outline-none transition-colors"
                        />
                        <button
                            type="button"
                            onClick={onToggleShowNewPassword}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-secondary"
                        >
                            {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                    </div>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-secondary" />
                        <input
                            type={showConfirmPassword ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => onChangeConfirmPassword(e.target.value)}
                            placeholder="确认新密码"
                            className="w-full pl-10 pr-10 py-3 rounded-lg bg-background border border-border focus:border-accent focus:outline-none transition-colors"
                        />
                        <button
                            type="button"
                            onClick={onToggleShowConfirmPassword}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-secondary"
                        >
                            {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={onCancel}
                            className="flex-1 py-2 rounded-lg border border-border hover:border-foreground-secondary transition-colors"
                        >
                            取消
                        </button>
                        <button
                            onClick={onSubmit}
                            disabled={changingPassword || !newPassword || !confirmPassword}
                            className="flex-1 py-2 rounded-lg bg-accent text-white font-medium hover:bg-accent/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {changingPassword && <Loader2 className="w-4 h-4 animate-spin" />}
                            {changingPassword ? '修改中...' : '确认修改'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
