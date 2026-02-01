import Link from 'next/link';
import { Edit3, Save, Check, Loader2, Share2 } from 'lucide-react';

export function ResultHeader({
    chartId,
    saving,
    saved,
    onEdit,
    onSave,
    onShare,
}: {
    chartId: string | null;
    saving: boolean;
    saved: boolean;
    onEdit: () => void;
    onSave: () => void;
    onShare: () => void;
}) {
    const backHref = chartId ? '/user/charts' : '/bazi';

    return (
        <div className="hidden md:flex items-center justify-between mb-4">
            <Link
                href={backHref}
                className="inline-flex items-center gap-2 text-foreground-secondary hover:text-foreground transition-colors"
            >
                返回
            </Link>
            <div className="flex items-center gap-2">
                <button
                    onClick={onEdit}
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-border hover:border-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-border"
                >
                    <Edit3 className="w-4 h-4" />
                    修改
                </button>
                <button
                    onClick={onSave}
                    disabled={saving || saved}
                    className={`
                            inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                            ${saved
                            ? 'bg-green-500/10 text-green-500 cursor-default'
                            : 'bg-accent text-white hover:bg-accent/90 disabled:opacity-50'
                        }
                        `}
                >
                    {saved ? (
                        <><Check className="w-4 h-4" />已保存</>
                    ) : saving ? (
                        <><Loader2 className="w-4 h-4 animate-spin" />保存中</>
                    ) : (
                        <><Save className="w-4 h-4" />保存</>
                    )}
                </button>
                <button
                    onClick={onShare}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-border hover:border-accent transition-colors"
                >
                    <Share2 className="w-4 h-4" />
                    分享
                </button>
            </div>
        </div>
    );
}
