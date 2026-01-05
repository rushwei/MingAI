import Link from 'next/link';

export function ResultFooterLinks() {
    return (
        <div className="mt-6 flex justify-center gap-4">
            <Link href="/bazi" className="text-sm text-foreground-secondary hover:text-accent transition-colors">
                新建排盘
            </Link>
            <span className="text-foreground-secondary">•</span>
            <Link href="/user/charts" className="text-sm text-foreground-secondary hover:text-accent transition-colors">
                我的命盘
            </Link>
            <span className="text-foreground-secondary">•</span>
            <Link href="/chat" className="text-sm text-foreground-secondary hover:text-accent transition-colors">
                AI 对话
            </Link>
        </div>
    );
}
