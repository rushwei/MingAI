/**
 * 侧边栏自定义组件
 * 
 * 用户可以隐藏/显示和拖拽排序侧边栏导航项
 * 使用 @dnd-kit 实现拖拽排序
 */
'use client';

import { useState, useMemo } from 'react';
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
    Eye,
    EyeOff,
    GripVertical,
    RotateCcw,
    Check,
} from 'lucide-react';
import { SoundWaveLoader } from '@/components/ui/SoundWaveLoader';
import { useSidebarConfigSafe, type SidebarConfig } from '@/components/layout/SidebarConfigContext';
import { useFeatureToggles } from '@/lib/hooks/useFeatureToggles';
import { getCustomizerNavItems, getCustomizerToolItems, type NavIcon } from '@/lib/navigation/registry';

const TOOL_LABEL_OVERRIDE: Record<string, string> = {
    daily: '每日运势',
    monthly: '月度运势',
    community: '命理社区',
};

const ALL_NAV_ITEMS = getCustomizerNavItems().map(n => ({ id: n.id, label: n.label, icon: n.icon }));
const ALL_TOOL_ITEMS = getCustomizerToolItems().map(n => ({
    id: n.id,
    label: TOOL_LABEL_OVERRIDE[n.id] ?? n.label,
    icon: n.icon,
}));

// 可排序项组件
function SortableItem({
    item,
    isHidden,
    onToggle,
}: {
    item: { id: string; label: string; icon: NavIcon };
    isHidden: boolean;
    onToggle: () => void;
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
            className={`flex items-center justify-between p-3 rounded-xl border transition-all select-none ${isDragging
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
            <button
                onClick={onToggle}
                className={`p-2 rounded-lg transition-colors ${isHidden
                        ? 'hover:bg-green-500/10 text-foreground-secondary hover:text-green-500'
                        : 'hover:bg-red-500/10 text-foreground-secondary hover:text-red-500'
                    }`}
                title={isHidden ? '显示' : '隐藏'}
            >
                {isHidden ? (
                    <EyeOff className="w-4 h-4" />
                ) : (
                    <Eye className="w-4 h-4" />
                )}
            </button>
        </div>
    );
}

function DragOverlayItem({
    item,
}: {
    item: { id: string; label: string; icon: NavIcon };
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

interface SidebarCustomizerProps {
    userId: string | null;
}

export function SidebarCustomizer({ userId }: SidebarCustomizerProps) {
    const { config, setConfig, saveConfig, loading } = useSidebarConfigSafe();
    const { isFeatureEnabled } = useFeatureToggles();
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [activeNavId, setActiveNavId] = useState<string | null>(null);
    const [activeToolId, setActiveToolId] = useState<string | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 4,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // 排序后的导航项
    const sortedNavItems = useMemo(() => {
        const navOrder = config.navOrder ?? [];
        const navOrderIndex = new Map(navOrder.map((id, index) => [id, index]));
        const fallbackIndex = new Map(ALL_NAV_ITEMS.map((item, index) => [item.id, index]));

        const getIndex = (id: string) => {
            const explicit = navOrderIndex.get(id);
            if (explicit !== undefined) return explicit;
            return fallbackIndex.get(id) ?? Number.MAX_SAFE_INTEGER;
        };

        return [...ALL_NAV_ITEMS]
            .filter(item => isFeatureEnabled(item.id))
            .sort((a, b) => {
            return getIndex(a.id) - getIndex(b.id);
        });
    }, [config.navOrder, isFeatureEnabled]);

    const navItemMap = useMemo(() => {
        return new Map(ALL_NAV_ITEMS.map(item => [item.id, item]));
    }, []);

    const sortedToolItems = useMemo(() => {
        const toolOrder = config.toolOrder ?? [];
        const toolOrderIndex = new Map(toolOrder.map((id, index) => [id, index]));
        const fallbackIndex = new Map(ALL_TOOL_ITEMS.map((item, index) => [item.id, index]));

        const getIndex = (id: string) => {
            const explicit = toolOrderIndex.get(id);
            if (explicit !== undefined) return explicit;
            return fallbackIndex.get(id) ?? Number.MAX_SAFE_INTEGER;
        };

        return [...ALL_TOOL_ITEMS]
            .filter(item => isFeatureEnabled(item.id))
            .sort((a, b) => {
            return getIndex(a.id) - getIndex(b.id);
        });
    }, [config.toolOrder, isFeatureEnabled]);

    const toolItemMap = useMemo(() => {
        return new Map(ALL_TOOL_ITEMS.map(item => [item.id, item]));
    }, []);

    const handleSave = async (newConfig: SidebarConfig) => {
        if (!userId) return;
        setSaving(true);
        try {
            await saveConfig(newConfig);
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch (error) {
            console.error('Failed to save sidebar config:', error);
        } finally {
            setSaving(false);
        }
    };

    const handleNavDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveNavId(null);
        if (!over || active.id === over.id) return;

        const oldOrder = sortedNavItems.map(item => item.id);
        const oldIndex = oldOrder.indexOf(active.id as string);
        const newIndex = oldOrder.indexOf(over.id as string);

        if (oldIndex === -1 || newIndex === -1) return;

        const newOrder = arrayMove(oldOrder, oldIndex, newIndex);
        const newConfig = { ...config, navOrder: newOrder };
        setConfig(newConfig);
        handleSave(newConfig);
    };

    const handleToolDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveToolId(null);
        if (!over || active.id === over.id) return;

        const oldOrder = sortedToolItems.map(item => item.id);
        const oldIndex = oldOrder.indexOf(active.id as string);
        const newIndex = oldOrder.indexOf(over.id as string);

        if (oldIndex === -1 || newIndex === -1) return;

        const newOrder = arrayMove(oldOrder, oldIndex, newIndex);
        const newConfig = { ...config, toolOrder: newOrder };
        setConfig(newConfig);
        handleSave(newConfig);
    };

    const toggleNavItem = (itemId: string) => {
        const hidden = config.hiddenNavItems || [];
        const newHidden = hidden.includes(itemId)
            ? hidden.filter(id => id !== itemId)
            : [...hidden, itemId];
        const newConfig = { ...config, hiddenNavItems: newHidden };
        setConfig(newConfig);
        handleSave(newConfig);
    };

    const toggleToolItem = (itemId: string) => {
        const hidden = config.hiddenToolItems || [];
        const newHidden = hidden.includes(itemId)
            ? hidden.filter(id => id !== itemId)
            : [...hidden, itemId];
        const newConfig = { ...config, hiddenToolItems: newHidden };
        setConfig(newConfig);
        handleSave(newConfig);
    };

    const handleReset = async () => {
        if (!confirm('确定恢复默认设置？')) return;
        const defaultConfig: SidebarConfig = {
            hiddenNavItems: [],
            hiddenToolItems: [],
            navOrder: ALL_NAV_ITEMS.map(i => i.id),
            toolOrder: ALL_TOOL_ITEMS.map(i => i.id),
            // 保留移动端配置不变
            mobileMainItems: config.mobileMainItems,
            mobileDrawerOrder: config.mobileDrawerOrder,
            hiddenMobileItems: config.hiddenMobileItems,
        };
        setConfig(defaultConfig);
        await handleSave(defaultConfig);
    };

    const handleNavDragStart = (event: DragStartEvent) => {
        setActiveNavId(event.active.id as string);
    };

    const handleToolDragStart = (event: DragStartEvent) => {
        setActiveToolId(event.active.id as string);
    };

    if (loading) {
        return (
            <div className="space-y-6">
                {/* 头部骨架 */}
                <div className="flex items-center justify-between">
                    <div className="space-y-2">
                        <div className="h-5 w-28 rounded bg-foreground/10 animate-pulse" />
                        <div className="h-4 w-48 rounded bg-foreground/5 animate-pulse" />
                    </div>
                    <div className="h-8 w-20 rounded-lg bg-foreground/5 animate-pulse" />
                </div>
                {/* 列表骨架 */}
                <div className="space-y-3">
                    <div className="h-4 w-16 rounded bg-foreground/5 animate-pulse" />
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-border">
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
                    <h3 className="font-bold">侧边栏自定义</h3>
                    <p className="text-sm text-foreground-secondary mt-1">
                        拖拽调整顺序，点击眼睛图标显示/隐藏
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {saving && <SoundWaveLoader variant="inline" />}
                    {saved && <Check className="w-4 h-4 text-green-500" />}
                    <button
                        onClick={handleReset}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-foreground-secondary hover:bg-background-secondary transition-colors"
                    >
                        <RotateCcw className="w-4 h-4" />
                        恢复默认
                    </button>
                </div>
            </div>

            {/* 命理体系 */}
            <div>
                <h4 className="text-sm font-medium text-foreground-secondary mb-3">命理体系</h4>
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleNavDragStart}
                    onDragEnd={handleNavDragEnd}
                    onDragCancel={() => setActiveNavId(null)}
                >
                    <SortableContext
                        items={sortedNavItems.map(i => i.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        <div className="grid gap-2">
                            {sortedNavItems.map(item => (
                                <SortableItem
                                    key={item.id}
                                    item={item}
                                    isHidden={config.hiddenNavItems?.includes(item.id) || false}
                                    onToggle={() => toggleNavItem(item.id)}
                                />
                            ))}
                        </div>
                    </SortableContext>
                    <DragOverlay>
                        {activeNavId && navItemMap.get(activeNavId) ? (
                            <DragOverlayItem item={navItemMap.get(activeNavId)!} />
                        ) : null}
                    </DragOverlay>
                </DndContext>
            </div>

            {/* 工具 */}
            <div>
                <h4 className="text-sm font-medium text-foreground-secondary mb-3">工具</h4>
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleToolDragStart}
                    onDragEnd={handleToolDragEnd}
                    onDragCancel={() => setActiveToolId(null)}
                >
                    <SortableContext
                        items={sortedToolItems.map(i => i.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        <div className="grid gap-2">
                            {sortedToolItems.map(item => (
                                <SortableItem
                                    key={item.id}
                                    item={item}
                                    isHidden={config.hiddenToolItems?.includes(item.id) || false}
                                    onToggle={() => toggleToolItem(item.id)}
                                />
                            ))}
                        </div>
                    </SortableContext>
                    <DragOverlay>
                        {activeToolId && toolItemMap.get(activeToolId) ? (
                            <DragOverlayItem item={toolItemMap.get(activeToolId)!} />
                        ) : null}
                    </DragOverlay>
                </DndContext>
            </div>
        </div>
    );
}
