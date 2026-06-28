import React from 'react';
import { NotificationProvider } from '../contexts/NotificationContext';
import { useWebSocket } from '../hooks/useWebSocket';
import { useAuth } from '../context/AuthContext';
import { NotificationToast } from './NotificationToast';

// Component that initializes WebSocket connection
const WebSocketInitializer = ({ children }) => {
  const { user } = useAuth();
  const userId = user?.username || '';

  // Determine WebSocket URL based on environment
  const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8008/ws/notifications';

  // Initialize WebSocket connection
  useWebSocket({
    url: wsUrl,
    userId,
  });

  return children;
};

// Combined provider that wraps NotificationProvider and WebSocket initialization
export const NotificationSystem = ({ children }) => {
  return (
    <NotificationProvider>
      <WebSocketInitializer>
        {children}
        <NotificationToast />
      </WebSocketInitializer>
    </NotificationProvider>
  );
};
