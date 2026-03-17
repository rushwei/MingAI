/**
 * 全局加载组件
 *
 * Next.js App Router 会在页面加载时自动显示此组件
 */

export default function Loading() {
    return (
        <div className="flex min-h-[60vh] items-center justify-center bg-background">
            <div className="flex flex-col items-center justify-center">
                <div className="flex items-center gap-[3px] h-8">
                    {[0, 1, 2, 3, 4].map((i) => (
                        <span
                            key={i}
                            className="sound-wave-bar w-[3px] rounded-full bg-accent"
                            style={{ animationDelay: `${i * 0.12}s` }}
                        />
                    ))}
                </div>
                <span className="mt-4 text-foreground-secondary text-xs tracking-widest">
                    加载中
                </span>
            </div>
        </div>
    );
}
