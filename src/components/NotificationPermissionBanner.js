import React, { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { useBrowserNotifications } from '../hooks/useBrowserNotifications';
import { Button } from './ui/button';

export const NotificationPermissionBanner = () => {
  const { supported, isDefault, requestPermission } = useBrowserNotifications();
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if user has already dismissed the banner
    const hasDisimissed = localStorage.getItem('notificationBannerDismissed') === 'true';
    
    if (supported && isDefault && !hasDisimissed) {
      // Show banner after 3 seconds
      const timer = setTimeout(() => {
        setVisible(true);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [supported, isDefault]);

  const handleEnable = async () => {
    try {
      const result = await requestPermission();
      console.log('[NotificationBanner] Permission result:', result);
      
      // Hide banner regardless of result (if denied, user made a choice)
      setVisible(false);
      
      // If denied, show brief feedback
      if (result === 'denied') {
        console.warn('[NotificationBanner] User denied permission');
        // Could show a toast here if needed
      } else if (result === 'granted') {
        console.log('[NotificationBanner] Permission granted successfully');
      }
    } catch (error) {
      console.error('[NotificationBanner] Error requesting permission:', error);
      setVisible(false);
    }
  };

  const handleDismiss = () => {
    setVisible(false);
    setDismissed(true);
    localStorage.setItem('notificationBannerDismissed', 'true');
  };

  if (!visible || dismissed) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-50 animate-slide-in-right">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg shadow-lg p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-800">
            <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-1">
              Activa las notificaciones
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
              Recibe alertas cuando tus tareas estén próximas a finalizar, incluso cuando estés en otra pestaña.
            </p>
            
            <div className="flex gap-2">
              <Button
                onClick={handleEnable}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Activar
              </Button>
              <Button
                onClick={handleDismiss}
                size="sm"
                variant="ghost"
                className="text-gray-600 dark:text-gray-400"
              >
                Ahora no
              </Button>
            </div>
          </div>
          
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
