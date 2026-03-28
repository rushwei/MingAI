'use client'; // 客户端组件：读取登录态并校验管理员权限

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { SoundWaveLoader } from '@/components/ui/SoundWaveLoader';
import { loadAdminClientAccessState } from '@/lib/admin/client';
import { AnnouncementManagementPanel } from '@/components/admin/AnnouncementManagementPanel';

type AdminState = {
    loading: boolean;
    isAuthed: boolean;
    isAdmin: boolean;
};

export default function AdminAnnouncementsPage() {
    const router = useRouter();
    const [state, setState] = useState<AdminState>({
        loading: true,
        isAuthed: false,
        isAdmin: false,
    });

    useEffect(() => {
        const checkAdmin = async () => {
            setState(await loadAdminClientAccessState());
        };

        void checkAdmin();
    }, []);

    if (state.loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <SoundWaveLoader variant="block" text="" />
            </div>
        );
    }

    if (!state.isAuthed) {
        return (
            <div className="max-w-2xl mx-auto px-6 py-12">
                <h1 className="text-2xl font-semibold text-[#37352f] mb-4">请先登录</h1>
                <p className="text-sm text-[#37352f]/60">
                    登录后系统会自动识别管理员账号。
                </p>
            </div>
        );
    }

    if (!state.isAdmin) {
        return (
            <div className="max-w-2xl mx-auto px-6 py-12">
                <h1 className="text-2xl font-semibold text-[#37352f] mb-4">无权限访问</h1>
                <p className="text-sm text-[#37352f]/60">
                    当前账号不在管理员名单中。
                </p>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto px-4 py-6 md:px-8 md:py-8 h-[calc(100vh-60px)] flex flex-col">
            <div className="flex items-center gap-4 mb-6 flex-shrink-0">
                <button
                    onClick={() => router.push('/user')}
                    className="p-1.5 rounded-md text-[#37352f]/60 hover:text-[#37352f] hover:bg-[#efedea] active:bg-[#e3e1db] transition-colors duration-150"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <h1 className="text-xl font-bold text-[#37352f]">公告管理</h1>
                    <p className="text-sm text-[#37352f]/60 mt-0.5">
                        管理系统公告；发布即生效，历史公告可随时编辑或删除。
                    </p>
                </div>
            </div>

            <div className="flex-1 min-h-0 pb-6">
                <AnnouncementManagementPanel />
            </div>
        </div>
    );
}
