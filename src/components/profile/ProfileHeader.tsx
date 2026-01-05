import { ArrowLeft } from 'lucide-react';

export function ProfileHeader({ onBack }: { onBack: () => void }) {
    return (
        <div className="flex items-center gap-3 mb-6">
            <button
                onClick={onBack}
                className="p-2 rounded-lg hover:bg-background-secondary transition-colors"
            >
                <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold">个人资料</h1>
        </div>
    );
}
