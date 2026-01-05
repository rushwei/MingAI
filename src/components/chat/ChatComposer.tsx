import { Send } from 'lucide-react';

export function ChatComposer({
    inputValue,
    isLoading,
    onInputChange,
    onSend,
}: {
    inputValue: string;
    isLoading: boolean;
    onInputChange: (value: string) => void;
    onSend: () => void;
}) {
    return (
        <div className="border-t border-border p-4">
            <div className="max-w-3xl mx-auto">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => onInputChange(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && onSend()}
                        placeholder="输入您的问题..."
                        className="flex-1 px-4 py-3 rounded-xl bg-background-secondary border border-border
                       focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent
                       transition-all duration-200"
                        disabled={isLoading}
                    />
                    <button
                        onClick={onSend}
                        disabled={!inputValue.trim() || isLoading}
                        className="px-4 py-3 rounded-xl bg-accent text-white
                       hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed
                       transition-all duration-200"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </div>
                <p className="text-center text-xs text-foreground-secondary mt-2">
                    AI 回复仅供参考，请理性看待命理分析结果
                </p>
            </div>
        </div>
    );
}
