import React, { useState } from 'react';
import { Bell } from 'lucide-react';
import { useNotificationContext } from '../contexts/NotificationContext';
import { NotificationPanel } from './NotificationPanel';

export const NotificationBell = () => {
  const { unreadCount, isConnected } = useNotificationContext();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      {/* Bell Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full hover:bg-accent transition-colors"
        aria-label="Notificaciones"
      >
        <Bell className="w-6 h-6 text-muted-foreground" />

        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-destructive rounded-full">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}

        {/* Connection Status Indicator */}
        {!isConnected && (
          <span
            className="absolute bottom-0 right-0 w-3 h-3 bg-[hsl(var(--warning))] border-2 border-card rounded-full"
            title="Reconectando..."
          />
        )}
      </button>

      {/* Notification Panel (dropdown) */}
      {isOpen && (
        <div className="absolute right-0 mt-2 z-50">
          <NotificationPanel onClose={() => setIsOpen(false)} />
        </div>
      )}
    </div>
  );
};
