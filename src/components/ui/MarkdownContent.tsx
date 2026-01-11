import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownContentProps {
    content: string;
    className?: string;
}

export function MarkdownContent({ content, className }: MarkdownContentProps) {
    const textClass = `leading-relaxed ${className ?? 'text-sm text-foreground'}`;

    return (
        <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
                // 标题样式 - 从大到小
                h1: ({ children }) => (
                    <h1 className="text-2xl font-bold mt-6 mb-4 text-foreground">{children}</h1>
                ),
                h2: ({ children }) => (
                    <h2 className="text-xl font-bold mt-5 mb-3 text-foreground">{children}</h2>
                ),
                h3: ({ children }) => (
                    <h3 className="text-lg font-semibold mt-4 mb-2 text-foreground">{children}</h3>
                ),
                h4: ({ children }) => (
                    <h4 className="text-base font-semibold mt-3 mb-2 text-foreground">{children}</h4>
                ),
                h5: ({ children }) => (
                    <h5 className="text-sm font-semibold mt-2 mb-1 text-foreground">{children}</h5>
                ),
                h6: ({ children }) => (
                    <h6 className="text-sm font-medium mt-2 mb-1 text-foreground-secondary">{children}</h6>
                ),
                // 段落和列表
                p: ({ children }) => (
                    <p className={`${textClass} whitespace-pre-wrap`}>{children}</p>
                ),
                ul: ({ children }) => (
                    <ul className={`${textClass} list-disc pl-5 space-y-1`}>{children}</ul>
                ),
                ol: ({ children }) => (
                    <ol className={`${textClass} list-decimal pl-5 space-y-1`}>{children}</ol>
                ),
                li: ({ children }) => <li className={textClass}>{children}</li>,
                // 链接
                a: ({ href, children }) => (
                    <a href={href} className="text-accent underline underline-offset-2">
                        {children}
                    </a>
                ),
                // 代码
                code: ({ className, children }) => {
                    const isInline = !className;
                    return (
                        <code
                            className={isInline
                                ? 'px-1 py-0.5 rounded bg-background-secondary text-xs'
                                : 'block p-3 rounded-lg bg-background-secondary text-xs overflow-x-auto'}
                        >
                            {children}
                        </code>
                    );
                },
                // 引用块
                blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-accent/50 pl-4 py-1 my-3 italic text-foreground-secondary">
                        {children}
                    </blockquote>
                ),
                // 分隔线
                hr: () => <hr className="my-6 border-border" />,
                // 强调
                strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                em: ({ children }) => <em className="italic">{children}</em>,
            }}
        >
            {content}
        </ReactMarkdown>
    );
}
