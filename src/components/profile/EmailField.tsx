import { Mail } from 'lucide-react';

export function EmailField({ email }: { email: string }) {
    return (
        <div className="space-y-2">
            <label className="text-sm font-medium text-foreground-secondary">
                邮箱
            </label>
            <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-secondary" />
                <input
                    type="email"
                    value={email}
                    disabled
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-background-secondary border border-border text-foreground-secondary cursor-not-allowed"
                />
            </div>
        </div>
    );
}
