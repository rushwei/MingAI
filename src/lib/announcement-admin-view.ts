import type { Announcement } from '@/lib/announcement';

export interface AnnouncementEditorState {
    mode: 'create' | 'edit';
    selectedId: string | null;
}

export function resolveAnnouncementEditorStateAfterLoad(
    current: AnnouncementEditorState,
    announcements: Announcement[],
    preferred?: AnnouncementEditorState,
): AnnouncementEditorState {
    if (preferred?.mode === 'edit' && preferred.selectedId) {
        const preferredExists = announcements.some((item) => item.id === preferred.selectedId);
        if (preferredExists) {
            return preferred;
        }
    }

    if (current.mode === 'create') {
        return current;
    }

    if (!current.selectedId) {
        return announcements[0]
            ? { mode: 'edit', selectedId: announcements[0].id }
            : { mode: 'create', selectedId: null };
    }

    const selectedExists = announcements.some((item) => item.id === current.selectedId);
    if (selectedExists) {
        return current;
    }

    return announcements[0]
        ? { mode: 'edit', selectedId: announcements[0].id }
        : { mode: 'create', selectedId: null };
}
