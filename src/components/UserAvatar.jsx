import React from 'react';

const UserAvatar = ({ user, size = 32, showStatus = false }) => {
    if (!user) return <div style={{ width: size, height: size }} className="rounded-full bg-slate-200 animate-pulse" />;

    const initials = user.username
        ? user.username.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
        : '??';
    const bgColor = user.color || '#64748b';
    const isOnline = user.last_seen && (new Date() - new Date(user.last_seen) < 2 * 60 * 1000);
    const avatarUrl = user.avatar_url;

    return (
        <div className="relative inline-block" title={user.username || 'Usuário'}>
            <div
                className="rounded-full flex items-center justify-center text-white font-bold shadow-sm border border-white/20 overflow-hidden shrink-0"
                style={{ width: size, height: size, backgroundColor: avatarUrl ? 'transparent' : bgColor, fontSize: size * 0.4 }}
            >
                {avatarUrl ? (
                    <img src={avatarUrl} alt={user.username} className="w-full h-full object-cover" />
                ) : (
                    initials
                )}
            </div>
            {showStatus && isOnline && (
                <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full ring-2 ring-white bg-green-500" />
            )}
        </div>
    );
};

export default UserAvatar;
