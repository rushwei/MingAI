export function CreatedAtField({ createdAt }: { createdAt: string | null }) {
    return (
        <div className="space-y-2">
            <label className="text-sm font-medium text-foreground-secondary">
                注册时间
            </label>
            <div className="px-4 py-3 rounded-xl bg-background-secondary border border-border text-foreground-secondary">
                {createdAt
                    ? new Date(createdAt).toLocaleDateString('zh-CN', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                    })
                    : '未知'
                }
            </div>
        </div>
    );
}
