import { ArrowRight } from 'lucide-react';

export function SubmitSection({ isSubmitting }: { isSubmitting: boolean }) {
    return (
        <>
            <button
                type="submit"
                disabled={isSubmitting}
                className="
            lg:col-span-2
            w-full py-4 rounded-xl font-semibold text-lg
            bg-accent text-white
            hover:bg-accent/90
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-all duration-300
            shadow-lg shadow-accent/25
            hover:shadow-xl hover:shadow-accent/30
            hover:-translate-y-0.5
            flex items-center justify-center gap-2
          "
            >
                {isSubmitting ? (
                    <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        正在排盘...
                    </>
                ) : (
                    <>
                        排盘
                        <ArrowRight className="w-5 h-5" />
                    </>
                )}
            </button>

            <p className="lg:col-span-2 text-center text-sm text-foreground-secondary">
                命理分析仅供参考，不代表科学预测，请理性看待
            </p>
        </>
    );
}
