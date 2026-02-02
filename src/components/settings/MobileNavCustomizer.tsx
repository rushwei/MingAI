/**
 * 移动端导航自定义组件
 *
 * 用户可以自定义底部导航栏显示的项目（0-4个）和抽屉中项目的排序/隐藏
 * 使用 @dnd-kit 实现拖拽排序
 */
'use client';

import { useState, useMemo, useCallback } from 'react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    DragOverlay,
    useSensor,
    useSensors,
    type DragEndEvent,
    type DragStartEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
    Orbit,
    Sparkles,
    Gem,
    Dices,
    HeartHandshake,
    BotMessageSquare,
    Brain,
    Compass,
    Sun,
    User,
    ScanFace,
    Hand,
    CalendarRange,
    Aperture,
    Tags,
    Settings,
    Eye,
    EyeOff,
    GripVertical,
    RotateCcw,
    Loader2,
    Check,
    Plus,
    X,
    type LucideIcon,
    CircleStar,
    Bell,
    CreditCard,
    MessageCircleHeart,
    BookOpenText,
    CircleQuestionMark,
    Scroll,
} from 'lucide-react';
import { useSidebarConfigSafe, type SidebarConfig } from '@/components/layout/SidebarConfigContext';

// 所有可配置的移动端项目
const ALL_MOBILE_ITEMS = [
    { id: 'fortune-hub', label: '运势中心', icon: Compass },
    { id: 'bazi', label: '八字', icon: Orbit },
    { id: 'records', label: '命理记录', icon: Tags },
    { id: 'community', label: '社区', icon: Aperture },
    { id: 'hepan', label: '八字合盘', icon: HeartHandshake },
    { id: 'ziwei', label: '紫微斗数', icon: Sparkles },
    { id: 'tarot', label: '塔罗', icon: Gem },
    { id: 'liuyao', label: '六爻', icon: Dices },
    { id: 'face', label: '面相', icon: ScanFace },
    { id: 'palm', label: '手相', icon: Hand },
    { id: 'mbti', label: 'MBTI', icon: Brain },
    { id: 'chat', label: 'AI', icon: BotMessageSquare },
    { id: 'daily', label: '日运', icon: Sun },
    { id: 'monthly', label: '月运', icon: CalendarRange },
    { id: 'user', label: '我的', icon: User },
    { id: 'user/settings', label: '设置', icon: Settings },
    { id: 'user/upgrade', label: '订阅', icon: CircleStar },
    { id: 'user/charts', label: '命盘', icon: Scroll },
    { id: 'user/notifications', label: '通知', icon: Bell },
    { id: 'user/orders', label: '订单', icon: CreditCard },
    { id: 'user/settings/ai', label: '个性化', icon: MessageCircleHeart },
    { id: 'user/knowledge-base', label: '知识库', icon: BookOpenText },
    { id: 'user/help', label: '帮助中心', icon: CircleQuestionMark },
];

const DEFAULT_MAIN_ITEMS = ['fortune-hub', 'liuyao', 'chat', 'daily'];
const DEFAULT_DRAWER_ORDER = [
    'bazi', 'records', 'community', 'hepan', 'ziwei', 'tarot',
    'face', 'palm', 'mbti', 'monthly', 'user', 'user/settings',
    'user/upgrade', 'user/charts', 'user/notifications', 'user/orders',
    'user/settings/ai', 'user/knowledge-base', 'user/help'
];

interface MobileNavCustomizerProps {
    userId: string | null;
}

export function MobileNavCustomizer({ userId }: MobileNavCustomizerProps) {
    const { config, setConfig, saveConfig, loading } = useSidebarConfigSafe();
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [activeDrawerId, setActiveDrawerId] = useState<string | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 4 },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // 当前底部导航栏项目
    const mainItems = useMemo(() => {
        return config.mobileMainItems || DEFAULT_MAIN_ITEMS;
    }, [config.mobileMainItems]);

    // 抽屉中的项目（排除底部导航栏的项目）
    const drawerItems = useMemo(() => {
        const order = config.mobileDrawerOrder || DEFAULT_DRAWER_ORDER;
        const mainSet = new Set(mainItems);
        const orderSet = new Set(order);

        // 按顺序排列已有的项目
        const orderedItems = order
            .filter(id => !mainSet.has(id))
            .map(id => ALL_MOBILE_ITEMS.find(item => item.id === id))
            .filter((item): item is typeof ALL_MOBILE_ITEMS[0] => !!item);

        // 添加不在 order 中的新项目（追加到末尾）
        const newItems = ALL_MOBILE_ITEMS
            .filter(item => !orderSet.has(item.id) && !mainSet.has(item.id));

        return [...orderedItems, ...newItems];
    }, [config.mobileDrawerOrder, mainItems]);

    const itemMap = useMemo(() => {
        return new Map(ALL_MOBILE_ITEMS.map(item => [item.id, item]));
    }, []);

    const handleSave = useCallback(async (newConfig: SidebarConfig) => {
        if (!userId) return;
        setSaving(true);
        try {
            await saveConfig(newConfig);
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch (error) {
            console.error('Failed to save mobile nav config:', error);
        } finally {
            setSaving(false);
        }
    }, [userId, saveConfig]);

    // 添加项目到底部导航栏
    const addToMain = useCallback((itemId: string) => {
        if (mainItems.length >= 4) return;
        const newMainItems = [...mainItems, itemId];
        const newConfig = { ...config, mobileMainItems: newMainItems };
        setConfig(newConfig);
        handleSave(newConfig);
    }, [mainItems, config, setConfig, handleSave]);

    // 从底部导航栏移除项目
    const removeFromMain = useCallback((itemId: string) => {
        const newMainItems = mainItems.filter(id => id !== itemId);
        // 确保移除的项目在抽屉顺序中（添加到开头）
        const currentDrawerOrder = config.mobileDrawerOrder || DEFAULT_DRAWER_ORDER;
        const newDrawerOrder = currentDrawerOrder.includes(itemId)
            ? currentDrawerOrder
            : [itemId, ...currentDrawerOrder];
        const newConfig = {
            ...config,
            mobileMainItems: newMainItems,
            mobileDrawerOrder: newDrawerOrder,
        };
        setConfig(newConfig);
        handleSave(newConfig);
    }, [mainItems, config, setConfig, handleSave]);

    // 切换抽屉项目的显示/隐藏
    const toggleDrawerItem = useCallback((itemId: string) => {
        const hidden = config.hiddenMobileItems || [];
        const newHidden = hidden.includes(itemId)
            ? hidden.filter(id => id !== itemId)
            : [...hidden, itemId];
        const newConfig = { ...config, hiddenMobileItems: newHidden };
        setConfig(newConfig);
        handleSave(newConfig);
    }, [config, setConfig, handleSave]);

    // 抽屉项目拖拽排序
    const handleDrawerDragEnd = useCallback((event: DragEndEvent) => {
        const { active, over } = event;
        setActiveDrawerId(null);
        if (!over || active.id === over.id) return;

        // 使用当前显示的 drawerItems 顺序作为基础，确保新项目也能被拖拽
        const currentOrder = drawerItems.map(item => item.id);
        const oldIndex = currentOrder.indexOf(active.id as string);
        const newIndex = currentOrder.indexOf(over.id as string);

        if (oldIndex === -1 || newIndex === -1) return;

        const newOrder = arrayMove(currentOrder, oldIndex, newIndex);
        const newConfig = { ...config, mobileDrawerOrder: newOrder };
        setConfig(newConfig);
        handleSave(newConfig);
    }, [drawerItems, config, setConfig, handleSave]);

    const handleDrawerDragStart = useCallback((event: DragStartEvent) => {
        setActiveDrawerId(event.active.id as string);
    }, []);

    // 恢复默认设置
    const handleReset = useCallback(async () => {
        if (!confirm('确定恢复默认设置？')) return;
        const defaultConfig: SidebarConfig = {
            ...config,
            mobileMainItems: DEFAULT_MAIN_ITEMS,
            mobileDrawerOrder: DEFAULT_DRAWER_ORDER,
            hiddenMobileItems: [],
        };
        setConfig(defaultConfig);
        await handleSave(defaultConfig);
    }, [config, setConfig, handleSave]);

    if (loading) {
        return (
            <div className="space-y-6">
                {/* 头部骨架 */}
                <div className="flex items-center justify-between">
                    <div className="space-y-2">
                        <div className="h-5 w-32 rounded bg-foreground/10 animate-pulse" />
                        <div className="h-4 w-52 rounded bg-foreground/5 animate-pulse" />
                    </div>
                    <div className="h-8 w-20 rounded-lg bg-foreground/5 animate-pulse" />
                </div>
                {/* 底部导航栏骨架 */}
                <div>
                    <div className="h-4 w-20 rounded bg-foreground/5 animate-pulse mb-3" />
                    <div className="grid grid-cols-4 gap-2">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="h-16 rounded-xl bg-foreground/5 animate-pulse" />
                        ))}
                    </div>
                </div>
                {/* 更多菜单骨架 */}
                <div>
                    <div className="h-4 w-16 rounded bg-foreground/5 animate-pulse mb-3" />
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-border mb-2">
                            <div className="flex items-center gap-3">
                                <div className="w-6 h-6 rounded bg-foreground/5 animate-pulse" />
                                <div className="w-4 h-4 rounded bg-foreground/5 animate-pulse" />
                                <div className="h-4 w-16 rounded bg-foreground/10 animate-pulse" />
                            </div>
                            <div className="w-8 h-8 rounded-lg bg-foreground/5 animate-pulse" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* 头部 */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="font-bold">底部导航自定义</h3>
                    <p className="text-sm text-foreground-secondary mt-1">
                        选择底部显示的入口，拖拽调整更多菜单顺序
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {saving && (
                        <div className="flex items-center gap-1.5">
                            <Loader2 className="w-4 h-4 animate-spin text-accent" />
                            <span className="text-xs text-foreground-secondary whitespace-nowrap">保存中</span>
                        </div>
                    )}
                    {saved && (
                        <div className="flex items-center gap-1.5">
                            <Check className="w-4 h-4 text-green-500" />
                            <span className="text-xs text-green-500 whitespace-nowrap">已保存</span>
                        </div>
                    )}
                    <button
                        onClick={handleReset}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-foreground-secondary hover:bg-background-secondary transition-colors whitespace-nowrap"
                    >
                        <RotateCcw className="w-4 h-4" />
                        <span>恢复默认</span>
                    </button>
                </div>
            </div>

            {/* 底部导航栏配置 */}
            <MainItemsSection
                mainItems={mainItems}
                itemMap={itemMap}
                onRemove={removeFromMain}
            />

            {/* 更多菜单配置 */}
            <DrawerItemsSection
                drawerItems={drawerItems}
                mainItems={mainItems}
                hiddenItems={config.hiddenMobileItems || []}
                sensors={sensors}
                activeDrawerId={activeDrawerId}
                itemMap={itemMap}
                onDragStart={handleDrawerDragStart}
                onDragEnd={handleDrawerDragEnd}
                onDragCancel={() => setActiveDrawerId(null)}
                onToggleHidden={toggleDrawerItem}
                onAddToMain={addToMain}
            />
        </div>
    );
}

// 底部导航栏配置区域
function MainItemsSection({
    mainItems,
    itemMap,
    onRemove,
}: {
    mainItems: string[];
    itemMap: Map<string, { id: string; label: string; icon: LucideIcon }>;
    onRemove: (itemId: string) => void;
}) {
    return (
        <div>
            <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-foreground-secondary">
                    底部导航栏
                </h4>
                <span className="text-xs text-foreground-secondary">
                    {mainItems.length}/4 个入口
                </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
                {mainItems.map(itemId => {
                    const item = itemMap.get(itemId);
                    if (!item) return null;
                    const Icon = item.icon;
                    return (
                        <div
                            key={itemId}
                            className="relative flex flex-col items-center p-2 rounded-xl bg-accent/10 border border-accent/30"
                        >
                            <button
                                onClick={() => onRemove(itemId)}
                                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
                            >
                                <X className="w-3 h-3" />
                            </button>
                            <Icon className="w-5 h-5 text-accent mb-1" />
                            <span className="text-xs text-center font-medium">{item.label}</span>
                        </div>
                    );
                })}
                {/* 空槽位 */}
                {Array.from({ length: 4 - mainItems.length }).map((_, i) => (
                    <div
                        key={`empty-${i}`}
                        className="flex flex-col items-center justify-center p-3 rounded-xl border-2 border-dashed border-border/50 text-foreground-secondary/50"
                    >
                        <Plus className="w-5 h-5 mb-1" />
                        <span className="text-xs">添加</span>
                    </div>
                ))}
            </div>
            <p className="text-xs text-foreground-secondary mt-2">
                点击下方项目的 + 按钮添加到底部导航栏
            </p>
        </div>
    );
}

// 可排序的抽屉项目
function SortableDrawerItem({
    item,
    isHidden,
    canAddToMain,
    onToggleHidden,
    onAddToMain,
}: {
    item: { id: string; label: string; icon: LucideIcon };
    isHidden: boolean;
    canAddToMain: boolean;
    onToggleHidden: () => void;
    onAddToMain: () => void;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: item.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition: isDragging ? undefined : transition,
        zIndex: isDragging ? 10 : undefined,
        willChange: 'transform',
    };

    const Icon = item.icon;

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`flex items-center justify-between p-3 rounded-xl border transition-all select-none ${
                isDragging
                    ? 'bg-accent/10 border-accent shadow-lg scale-[1.02]'
                    : isHidden
                        ? 'bg-background-secondary/50 border-border/50 opacity-60'
                        : 'bg-background border-border'
            }`}
        >
            <div className="flex items-center gap-3">
                <button
                    {...attributes}
                    {...listeners}
                    className="p-1 rounded hover:bg-background-secondary cursor-grab active:cursor-grabbing touch-none"
                    title="拖动排序"
                >
                    <GripVertical className="w-4 h-4 text-foreground-secondary" />
                </button>
                <Icon className="w-4 h-4 text-foreground-secondary" />
                <span className="text-sm font-medium">{item.label}</span>
            </div>
            <div className="flex items-center gap-1">
                {canAddToMain && (
                    <button
                        onClick={onAddToMain}
                        className="p-2 rounded-lg hover:bg-accent/10 text-foreground-secondary hover:text-accent transition-colors"
                        title="添加到底部导航"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                )}
                <button
                    onClick={onToggleHidden}
                    className={`p-2 rounded-lg transition-colors ${
                        isHidden
                            ? 'hover:bg-green-500/10 text-foreground-secondary hover:text-green-500'
                            : 'hover:bg-red-500/10 text-foreground-secondary hover:text-red-500'
                    }`}
                    title={isHidden ? '显示' : '隐藏'}
                >
                    {isHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
            </div>
        </div>
    );
}

// 拖拽时的覆盖层项目
function DragOverlayItem({
    item,
}: {
    item: { id: string; label: string; icon: LucideIcon };
}) {
    const Icon = item.icon;
    return (
        <div className="flex items-center justify-between p-3 rounded-xl border bg-background shadow-xl border-accent/40 select-none">
            <div className="flex items-center gap-3">
                <span className="p-1 rounded bg-background-secondary">
                    <GripVertical className="w-4 h-4 text-foreground-secondary" />
                </span>
                <Icon className="w-4 h-4 text-foreground-secondary" />
                <span className="text-sm font-medium">{item.label}</span>
            </div>
        </div>
    );
}

// 更多菜单配置区域
function DrawerItemsSection({
    drawerItems,
    mainItems,
    hiddenItems,
    sensors,
    activeDrawerId,
    itemMap,
    onDragStart,
    onDragEnd,
    onDragCancel,
    onToggleHidden,
    onAddToMain,
}: {
    drawerItems: { id: string; label: string; icon: LucideIcon }[];
    mainItems: string[];
    hiddenItems: string[];
    sensors: ReturnType<typeof useSensors>;
    activeDrawerId: string | null;
    itemMap: Map<string, { id: string; label: string; icon: LucideIcon }>;
    onDragStart: (event: DragStartEvent) => void;
    onDragEnd: (event: DragEndEvent) => void;
    onDragCancel: () => void;
    onToggleHidden: (itemId: string) => void;
    onAddToMain: (itemId: string) => void;
}) {
    const canAddMore = mainItems.length < 4;

    return (
        <div>
            <h4 className="text-sm font-medium text-foreground-secondary mb-3">
                更多菜单
            </h4>
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                onDragCancel={onDragCancel}
            >
                <SortableContext
                    items={drawerItems.map(i => i.id)}
                    strategy={verticalListSortingStrategy}
                >
                    <div className="grid gap-2">
                        {drawerItems.map(item => (
                            <SortableDrawerItem
                                key={item.id}
                                item={item}
                                isHidden={hiddenItems.includes(item.id)}
                                canAddToMain={canAddMore}
                                onToggleHidden={() => onToggleHidden(item.id)}
                                onAddToMain={() => onAddToMain(item.id)}
                            />
                        ))}
                    </div>
                </SortableContext>
                <DragOverlay>
                    {activeDrawerId && itemMap.get(activeDrawerId) ? (
                        <DragOverlayItem item={itemMap.get(activeDrawerId)!} />
                    ) : null}
                </DragOverlay>
            </DndContext>
        </div>
    );
}
