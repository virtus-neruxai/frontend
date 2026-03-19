import { useState, useEffect } from 'react';

export const useBrowserNotifications = () => {
  const [permission, setPermission] = useState('default');
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    // Check if browser supports notifications
    if ('Notification' in window) {
      setSupported(true);
      setPermission(Notification.permission);

      // Listen for permission changes (polling every 2 seconds)
      const interval = setInterval(() => {
        if (Notification.permission !== permission) {
          console.log('[useBrowserNotifications] Permission changed:', Notification.permission);
          setPermission(Notification.permission);
        }
      }, 2000);

      return () => clearInterval(interval);
    } else {
      setSupported(false);
    }
  }, [permission]);

  const requestPermission = async () => {
    if (!supported) {
      console.warn('Browser does not support notifications');
      return 'denied';
    }

    if (permission === 'granted') {
      return 'granted';
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result;
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      return 'denied';
    }
  };

  return {
    supported,
    permission,
    requestPermission,
    isGranted: permission === 'granted',
    isDenied: permission === 'denied',
    isDefault: permission === 'default',
  };
};
