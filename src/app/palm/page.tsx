/**
 * 手相分析页面
 * 
 * 上传手相图片，选择分析类型，获取AI分析
 */
'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, Upload, Hand, ChevronRight, AlertCircle, Loader2 } from 'lucide-react';
import { LoginOverlay } from '@/components/auth/LoginOverlay';
import { PALM_ANALYSIS_TYPES, type HandType } from '@/lib/palm';
import { useToast } from '@/components/ui/Toast';
import { supabase } from '@/lib/supabase';
import { DEFAULT_VISION_MODEL_ID } from '@/lib/ai-config';
import { VisionModelSelector } from '@/components/ui/VisionModelSelector';
import dynamic from 'next/dynamic';

const HistoryDrawer = dynamic(
    () => import('@/components/layout/HistoryDrawer').then(mod => mod.HistoryDrawer),
    { ssr: false }
);

export default function PalmPage() {
    const router = useRouter();
    const { showToast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [accessToken, setAccessToken] = useState<string | null>(null);

    const [selectedType, setSelectedType] = useState('full');
    const [handType, setHandType] = useState<HandType>('left');
    const [question, setQuestion] = useState('');
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [imageBase64, setImageBase64] = useState<string | null>(null);
    const [imageMimeType, setImageMimeType] = useState<string>('image/jpeg');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [selectedModel, setSelectedModel] = useState(DEFAULT_VISION_MODEL_ID);

    useEffect(() => {
        const loadSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setAccessToken(session?.access_token || null);
        };
        loadSession();
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // 检查文件类型
        if (!file.type.startsWith('image/')) {
            showToast('error', '请上传图片文件');
            return;
        }

        // 检查文件大小 (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            showToast('error', '图片大小不能超过 10MB');
            return;
        }

        setImageMimeType(file.type);

        // 读取并压缩图片
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                // 压缩图片
                const canvas = document.createElement('canvas');
                const maxSize = 1024; // 最大尺寸
                let width = img.width;
                let height = img.height;

                if (width > height && width > maxSize) {
                    height = (height * maxSize) / width;
                    width = maxSize;
                } else if (height > maxSize) {
                    width = (width * maxSize) / height;
                    height = maxSize;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);

                // 转换为 base64
                const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
                setImagePreview(compressedDataUrl);
                // 移除 data:image/jpeg;base64, 前缀
                setImageBase64(compressedDataUrl.split(',')[1]);
                setImageMimeType('image/jpeg');
            };
            img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);
    };

    const handleAnalyze = async () => {
        if (!imageBase64) {
            showToast('error', '请先上传手相图片');
            return;
        }

        if (!accessToken) {
            showToast('error', '请先登录');
            return;
        }

        setIsAnalyzing(true);

        try {
            const response = await fetch('/api/palm', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`,
                },
                body: JSON.stringify({
                    action: 'analyze',
                    imageBase64,
                    imageMimeType,
                    analysisType: selectedType,
                    handType,
                    question: question.trim() || undefined,
                    modelId: selectedModel,
                }),
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                showToast('error', data.error || '分析失败');
                return;
            }

            // 跳转到结果页面
            if (data.data?.readingId || data.data?.analysis) {
                // 存储分析结果到 sessionStorage
                sessionStorage.setItem('palm_result', JSON.stringify({
                    readingId: data.data.readingId,
                    conversationId: data.data.conversationId,
                    analysisType: selectedType,
                    handType,
                    analysis: data.data.analysis,
                    // 如果没有 readingId，说明保存失败，添加标记
                    isTemporary: !data.data.readingId
                }));
                router.push('/palm/result');
            } else {
                showToast('error', '未获取到分析结果');
            }
        } catch (error) {
            console.error('分析失败:', error);
            showToast('error', '分析失败，请稍后重试');
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <LoginOverlay message="登录后体验手相分析">
            <div className="max-w-2xl mx-auto px-4 py-8 animate-fade-in">
                {/* 标题 */}
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center mb-4">
                        <Hand className="w-12 h-12 text-amber-500" />
                    </div>
                    <h1 className="text-2xl font-bold mb-2">手相分析</h1>
                    <p className="text-foreground-secondary">上传手掌照片，AI 解读您的手相</p>
                </div>

                {/* 模型选择 */}
                <div className="mb-6">
                    <label className="block text-sm text-foreground-secondary mb-2">
                        选择分析模型
                    </label>
                    <VisionModelSelector
                        selectedModel={selectedModel}
                        onModelChange={setSelectedModel}
                    />
                </div>

                {/* 图片上传区 */}
                <div className="mb-6">
                    <label className="block text-sm text-foreground-secondary mb-2">
                        上传手掌照片
                    </label>
                    <div
                        className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
                            ${imagePreview
                                ? 'border-amber-500/50 bg-amber-500/5'
                                : 'border-border hover:border-accent hover:bg-background-secondary'
                            }`}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        {imagePreview ? (
                            <div className="relative">
                                <img
                                    src={imagePreview}
                                    alt="手相预览"
                                    className="max-h-64 mx-auto rounded-lg"
                                />
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setImagePreview(null);
                                        setImageBase64(null);
                                    }}
                                    className="absolute top-2 right-2 px-3 py-1 bg-background/80 rounded-lg text-sm hover:bg-background"
                                >
                                    更换图片
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div className="flex justify-center gap-4">
                                    <Camera className="w-8 h-8 text-foreground-secondary" />
                                    <Upload className="w-8 h-8 text-foreground-secondary" />
                                </div>
                                <p className="text-foreground-secondary">
                                    点击上传或拖拽图片到此处
                                </p>
                                <p className="text-xs text-foreground-secondary/70">
                                    支持 JPG、PNG 格式，建议清晰正面照
                                </p>
                            </div>
                        )}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={handleFileChange}
                            className="hidden"
                        />
                    </div>
                </div>

                {/* 手型选择 */}
                <div className="mb-6">
                    <label className="block text-sm text-foreground-secondary mb-2">
                        选择手型
                    </label>
                    <div className="flex gap-3">
                        {[
                            { value: 'left', label: '左手' },
                            { value: 'right', label: '右手' },
                        ].map(option => (
                            <button
                                key={option.value}
                                onClick={() => setHandType(option.value as HandType)}
                                className={`flex-1 py-3 px-4 rounded-xl text-center transition-all
                                    ${handType === option.value
                                        ? 'bg-amber-500/10 border-2 border-amber-500 text-amber-600'
                                        : 'bg-background-secondary border-2 border-transparent hover:bg-background-tertiary'
                                    }`}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                    <p className="text-xs text-foreground-secondary/70 mt-2">
                        💡 左手代表先天命格，右手代表后天发展
                    </p>
                </div>

                {/* 分析类型选择 */}
                <div className="mb-6">
                    <label className="block text-sm text-foreground-secondary mb-2">
                        选择分析类型
                    </label>
                    <div className="space-y-2">
                        {PALM_ANALYSIS_TYPES.map(type => (
                            <button
                                key={type.id}
                                onClick={() => setSelectedType(type.id)}
                                className={`w-full p-4 rounded-xl text-left transition-all flex items-center justify-between
                                    ${selectedType === type.id
                                        ? 'bg-amber-500/10 border-2 border-amber-500'
                                        : 'bg-background-secondary border-2 border-transparent hover:bg-background-tertiary'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">{type.icon}</span>
                                    <div>
                                        <div className="font-medium">{type.name}</div>
                                        <p className="text-sm text-foreground-secondary">{type.description}</p>
                                    </div>
                                </div>
                                <ChevronRight className={`w-5 h-5 transition-colors ${selectedType === type.id ? 'text-amber-500' : 'text-foreground-secondary'}`} />
                            </button>
                        ))}
                    </div>
                </div>

                {/* 问题输入 */}
                <div className="mb-6">
                    <label className="block text-sm text-foreground-secondary mb-2">
                        您想了解什么？（可选）
                    </label>
                    <input
                        type="text"
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        placeholder="例如：我的事业运势如何？"
                        className="w-full px-4 py-3 bg-background-secondary rounded-xl border border-border focus:border-accent focus:outline-none transition-colors"
                    />
                </div>

                {/* 提示信息 */}
                <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                    <div className="flex gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-foreground-secondary">
                            <p className="font-medium text-foreground mb-1">拍照建议</p>
                            <ul className="list-disc list-inside space-y-1">
                                <li>手掌自然展开，五指分开</li>
                                <li>光线充足，避免阴影</li>
                                <li>正面拍摄，掌纹清晰可见</li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* 分析按钮 */}
                <button
                    onClick={handleAnalyze}
                    disabled={!imageBase64 || isAnalyzing}
                    className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-medium
                        hover:from-amber-600 hover:to-orange-600 transition-all
                        disabled:opacity-50 disabled:cursor-not-allowed
                        flex items-center justify-center gap-2"
                >
                    {isAnalyzing ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            分析中...
                        </>
                    ) : (
                        <>
                            <Hand className="w-5 h-5" />
                            开始分析
                        </>
                    )}
                </button>

                <p className="text-center text-xs text-foreground-secondary/70 mt-4">
                    手相分析需要 Plus 会员或以上，每次消耗 1 次对话次数
                </p>
            </div>
            <HistoryDrawer type="palm" />
        </LoginOverlay>
    );
}
