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
                a: ({ href, children }) => (
                    <a href={href} className="text-accent underline underline-offset-2">
                        {children}
                    </a>
                ),
                code: ({ inline, children }) => (
                    <code
                        className={inline
                            ? 'px-1 py-0.5 rounded bg-background-secondary text-xs'
                            : 'block p-3 rounded-lg bg-background-secondary text-xs overflow-x-auto'}
                    >
                        {children}
                    </code>
                ),
            }}
        >
            {content}
        </ReactMarkdown>
    );
}
