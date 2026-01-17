/**
 * 面相分析页面
 * 
 * 上传面部照片，选择分析类型，获取AI分析
 */
'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, Upload, AlertTriangle, Loader2, X, ScanFace } from 'lucide-react';
import { LoginOverlay } from '@/components/auth/LoginOverlay';
import { FACE_ANALYSIS_TYPES, FACE_DISCLAIMER } from '@/lib/face';
import { useToast } from '@/components/ui/Toast';
import { supabase } from '@/lib/supabase';
import { DEFAULT_VISION_MODEL_ID } from '@/lib/ai-config';
import { VisionModelSelector } from '@/components/ui/VisionModelSelector';
import dynamic from 'next/dynamic';

const HistoryDrawer = dynamic(
    () => import('@/components/layout/HistoryDrawer').then(mod => mod.HistoryDrawer),
    { ssr: false }
);

export default function FacePage() {
    const router = useRouter();
    const { showToast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [accessToken, setAccessToken] = useState<string | null>(null);

    const [selectedType, setSelectedType] = useState('full');
    const [question, setQuestion] = useState('');
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [imageBase64, setImageBase64] = useState<string | null>(null);
    const [imageMimeType, setImageMimeType] = useState<string>('image/jpeg');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [showDisclaimer, setShowDisclaimer] = useState(false);
    const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
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

        // 显示免责声明
        if (!disclaimerAccepted) {
            setShowDisclaimer(true);
        }

        setImageMimeType(file.type);

        // 读取并压缩图片
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                // 压缩图片
                const canvas = document.createElement('canvas');
                const maxSize = 1024;
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

                const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
                setImagePreview(compressedDataUrl);
                setImageBase64(compressedDataUrl.split(',')[1]);
                setImageMimeType('image/jpeg');
            };
            img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);
    };

    const handleAnalyze = async () => {
        if (!imageBase64) {
            showToast('error', '请先上传面部照片');
            return;
        }

        if (!accessToken) {
            showToast('error', '请先登录');
            return;
        }

        if (!disclaimerAccepted) {
            setShowDisclaimer(true);
            return;
        }

        setIsAnalyzing(true);

        try {
            const response = await fetch('/api/face', {
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
                sessionStorage.setItem('face_result', JSON.stringify({
                    readingId: data.data.readingId,
                    conversationId: data.data.conversationId,
                    analysisType: selectedType,
                    analysis: data.data.analysis,
                    // 如果没有 readingId，说明保存失败，添加标记
                    isTemporary: !data.data.readingId
                }));
                router.push('/face/result');
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
        <LoginOverlay message="登录后体验面相分析">
            <div className="max-w-2xl mx-auto px-4 py-8 animate-fade-in">
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center mb-4">
                        <ScanFace className="w-12 h-12 text-purple-500" />
                    </div>
                    <h1 className="text-2xl font-bold mb-2">面相分析</h1>
                    <p className="text-foreground-secondary">上传正面照片，AI 解读您的面相</p>
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

                {/* 免责声明弹窗 */}
                {showDisclaimer && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-background rounded-2xl max-w-md w-full p-6 animate-scale-in">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <AlertTriangle className="w-6 h-6 text-amber-500" />
                                    <h3 className="text-lg font-semibold">重要提醒</h3>
                                </div>
                                <button
                                    onClick={() => setShowDisclaimer(false)}
                                    className="p-1 hover:bg-background-secondary rounded-lg"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="text-sm text-foreground-secondary whitespace-pre-line mb-6">
                                {FACE_DISCLAIMER}
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowDisclaimer(false)}
                                    className="flex-1 py-2.5 bg-background-secondary rounded-xl hover:bg-background-tertiary transition-colors"
                                >
                                    取消
                                </button>
                                <button
                                    onClick={() => {
                                        setDisclaimerAccepted(true);
                                        setShowDisclaimer(false);
                                    }}
                                    className="flex-1 py-2.5 bg-purple-500 text-white rounded-xl hover:bg-purple-600 transition-colors"
                                >
                                    我已了解
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* 图片上传区 */}
                <div className="mb-6">
                    <label className="block text-sm text-foreground-secondary mb-2">
                        上传正面照片
                    </label>
                    <div
                        className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
                            ${imagePreview
                                ? 'border-purple-500/50 bg-purple-500/5'
                                : 'border-border hover:border-accent hover:bg-background-secondary'
                            }`}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        {imagePreview ? (
                            <div className="relative">
                                <img
                                    src={imagePreview}
                                    alt="面相预览"
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
                                    请上传清晰的正面照片，光线充足
                                </p>
                            </div>
                        )}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            capture="user"
                            onChange={handleFileChange}
                            className="hidden"
                        />
                    </div>
                </div>

                {/* 分析类型选择 */}
                <div className="mb-6">
                    <label className="block text-sm text-foreground-secondary mb-2">
                        选择分析类型
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                        {FACE_ANALYSIS_TYPES.map(type => (
                            <button
                                key={type.id}
                                onClick={() => setSelectedType(type.id)}
                                className={`p-3 rounded-xl text-left transition-all
                                    ${selectedType === type.id
                                        ? 'bg-purple-500/10 border-2 border-purple-500'
                                        : 'bg-background-secondary border-2 border-transparent hover:bg-background-tertiary'
                                    }`}
                            >
                                <div className="flex items-center gap-2">
                                    <span className="text-xl">{type.icon}</span>
                                    <div>
                                        <div className="font-medium text-sm">{type.name}</div>
                                        <p className="text-xs text-foreground-secondary line-clamp-1">{type.description}</p>
                                    </div>
                                </div>
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
                        placeholder="例如：我适合什么样的工作？"
                        className="w-full px-4 py-3 bg-background-secondary rounded-xl border border-border focus:border-accent focus:outline-none transition-colors"
                    />
                </div>

                {/* 分析按钮 */}
                <button
                    onClick={handleAnalyze}
                    disabled={!imageBase64 || isAnalyzing}
                    className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium
                        hover:from-purple-600 hover:to-pink-600 transition-all
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
                            <ScanFace className="w-5 h-5" />
                            开始分析
                        </>
                    )}
                </button>

                <p className="text-center text-xs text-foreground-secondary/70 mt-4">
                    面相分析需要 Plus 会员或以上，每次消耗 1 次对话次数
                </p>
            </div>
            <HistoryDrawer type="face" />
        </LoginOverlay>
    );
}
