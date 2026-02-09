/**
 * 地点输入模态框组件
 *
 * 'use client' 标记说明：
 * - 使用 useState 管理模态框状态
 * - 包含交互式地点选择
 */
'use client';

import { useState } from 'react';
import { MapPin, X } from 'lucide-react';
import type { BaziFormData } from '@/types';
import { RegionPicker } from '@/components/bazi/form/RegionPicker';

interface PlaceInputModalProps {
    isOpen: boolean;
    onClose: () => void;
    formData: BaziFormData;
    onUpdate: <K extends keyof BaziFormData>(field: K, value: BaziFormData[K]) => void;
}

export function PlaceInputModal({
    isOpen,
    onClose,
    formData,
    onUpdate,
}: PlaceInputModalProps) {
    // 使用 isOpen 作为 key 的一部分，每次打开时重新初始化状态
    const [localPlace, setLocalPlace] = useState(formData.birthPlace || '');

    // 当模态框打开时，同步外部值到本地状态
    // 使用条件初始化而非 useEffect
    const [lastIsOpen, setLastIsOpen] = useState(isOpen);
    if (isOpen && !lastIsOpen) {
        setLocalPlace(formData.birthPlace || '');
    }
    if (isOpen !== lastIsOpen) {
        setLastIsOpen(isOpen);
    }

    const handleConfirm = () => {
        onUpdate('birthPlace', localPlace);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
            {/* 遮罩层 */}
            <div
                className="absolute inset-0 bg-black/50"
                onClick={onClose}
            />

            {/* 模态框内容 */}
            <div className="relative bg-background rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* 头部 */}
                <div className="sticky top-0 bg-background border-b border-border px-6 py-4 flex items-center justify-between">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-accent" />
                        出生地点
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-foreground-secondary hover:text-foreground transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* 内容 */}
                <div className="p-6 space-y-6">
                    {/* 省市区选择 */}
                    <RegionPicker
                        value={localPlace}
                        onChange={setLocalPlace}
                    />

                    {/* 说明 */}
                    <div className="bg-blue-50/50 text-blue-600/90 p-3 rounded-lg text-sm flex items-start gap-2">
                        <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <p className="leading-relaxed">
                            出生地点用于真太阳时修正。如果不确定，可以留空，系统将使用北京时间（东八区）进行排盘。
                        </p>
                    </div>
                </div>

                {/* 底部按钮 */}
                <div className="sticky bottom-0 bg-background border-t border-border px-6 py-4 flex gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-4 py-2 border border-border rounded-lg text-sm font-medium
                            hover:bg-background-secondary transition-colors"
                    >
                        取消
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        className="flex-1 px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium
                            hover:bg-accent/90 transition-colors"
                    >
                        确定
                    </button>
                </div>
            </div>
        </div>
    );
}
