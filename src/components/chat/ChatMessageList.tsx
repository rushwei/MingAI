import { RefreshCw, User } from 'lucide-react';
import type { AIPersonalityConfig, ChatMessage } from '@/types';

export function ChatMessageList({
    messages,
    currentPersonality,
    isLoading,
    quickQuestions,
    onQuickQuestion,
    messagesEndRef,
}: {
    messages: ChatMessage[];
    currentPersonality: AIPersonalityConfig;
    isLoading: boolean;
    quickQuestions: string[];
    onQuickQuestion: (question: string) => void;
    messagesEndRef: React.RefObject<HTMLDivElement>;
}) {
    if (messages.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 rounded-2xl bg-accent/10 flex items-center justify-center mb-4">
                    <span className="text-4xl">{currentPersonality.emoji}</span>
                </div>
                <h2 className="text-xl font-bold mb-2">{currentPersonality.name}</h2>
                <p className="text-foreground-secondary max-w-md mb-6">
                    {currentPersonality.description}
                </p>

                <div className="grid grid-cols-2 gap-2 max-w-md">
                    {quickQuestions.map((question) => (
                        <button
                            key={question}
                            onClick={() => onQuickQuestion(question)}
                            className="p-3 text-sm text-left rounded-lg bg-background-secondary border border-border hover:border-accent hover:text-accent transition-colors"
                        >
                            {question}
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4 max-w-3xl mx-auto">
            {messages.map((message) => (
                <div
                    key={message.id}
                    className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                    <div
                        className={`
                  w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
                  ${message.role === 'user'
                                ? 'bg-accent/20 text-accent'
                                : 'bg-background-secondary'
                            }
                `}
                    >
                        {message.role === 'user' ? (
                            <User className="w-4 h-4" />
                        ) : (
                            <span>{currentPersonality.emoji}</span>
                        )}
                    </div>

                    <div
                        className={`
                  max-w-[80%] px-4 py-3 rounded-2xl
                  ${message.role === 'user'
                                ? 'bg-accent text-white rounded-tr-sm'
                                : 'bg-background-secondary border border-border rounded-tl-sm'
                            }
                `}
                    >
                        <p className="whitespace-pre-wrap text-sm leading-relaxed">
                            {message.content}
                        </p>
                    </div>
                </div>
            ))}

            {isLoading && (
                <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-background-secondary flex items-center justify-center">
                        <span>{currentPersonality.emoji}</span>
                    </div>
                    <div className="px-4 py-3 rounded-2xl bg-background-secondary border border-border rounded-tl-sm">
                        <div className="flex items-center gap-2 text-foreground-secondary">
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span className="text-sm">正在思考...</span>
                        </div>
                    </div>
                </div>
            )}

            <div ref={messagesEndRef} />
        </div>
    );
}
