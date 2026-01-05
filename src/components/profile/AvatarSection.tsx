import { Camera, Loader2, User as UserIcon } from 'lucide-react';

export function AvatarSection({
    fileInputRef,
    avatarUrl,
    uploadingAvatar,
    onAvatarClick,
    onAvatarChange,
}: {
    fileInputRef: React.RefObject<HTMLInputElement | null>;
    avatarUrl: string | null;
    uploadingAvatar: boolean;
    onAvatarClick: () => void;
    onAvatarChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}) {
    return (
        <div className="flex justify-center mb-8">
            <div className="relative">
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={onAvatarChange}
                    className="hidden"
                />
                <div
                    className="w-24 h-24 rounded-full bg-accent/20 flex items-center justify-center overflow-hidden cursor-pointer"
                    onClick={onAvatarClick}
                >
                    {uploadingAvatar ? (
                        <Loader2 className="w-8 h-8 animate-spin text-accent" />
                    ) : avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={avatarUrl} alt="头像" className="w-full h-full object-cover" />
                    ) : (
                        <UserIcon className="w-12 h-12 text-accent" />
                    )}
                </div>
                <button
                    onClick={onAvatarClick}
                    disabled={uploadingAvatar}
                    className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center shadow-lg hover:bg-accent/90 transition-colors disabled:opacity-50"
                >
                    <Camera className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
