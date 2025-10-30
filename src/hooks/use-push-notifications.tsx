'use client';

import { useEffect, useState } from 'react';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { getApp } from 'firebase/app';
import { useToast } from '@/hooks/use-toast';

export function usePushNotifications(userId: string | null) {
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [isIOS, setIsIOS] = useState(false);
  const [needsHTTPS, setNeedsHTTPS] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      console.log('Not in browser environment');
      return;
    }

    // Better iOS detection - check multiple ways
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) 
      || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
      || /iPad|iPhone|iPod/.test(navigator.platform);
    
    // Check for Safari browser (required for iOS push notifications)
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    
    setIsIOS(isIOSDevice);
    
    // Check if running on HTTPS (required for iPhone)
    const isHTTPS = window.location.protocol === 'https:';
    setNeedsHTTPS(isIOSDevice && !isHTTPS);
    
    console.log('📱 Device Detection:', {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      isIOSDevice,
      isSafari,
      isHTTPS,
      notificationAPI: 'Notification' in window,
      permission: typeof Notification !== 'undefined' ? Notification.permission : 'N/A',
    });
    
    if (isIOSDevice && !isHTTPS) {
      console.warn('⚠️ iPhone requires HTTPS for push notifications.');
    }
    
    if (isIOSDevice && !isSafari) {
      console.warn('⚠️ iPhone requires Safari browser for push notifications. Chrome/Firefox on iOS do not support web push.');
    }

    if (typeof Notification !== 'undefined') {
      setNotificationPermission(Notification.permission);
      
      console.log('📱 Push Notifications Hook Initialized:', {
        userId,
        permission: Notification.permission,
        isIOS: isIOSDevice,
        isSafari,
        needsHTTPS: isIOSDevice && !isHTTPS,
      });

      // Auto-register if permission already granted and we have a userId
      if (Notification.permission === 'granted' && userId && !fcmToken) {
        console.log('🔄 Permission already granted, auto-registering FCM token...');
        registerServiceWorkerAndGetToken();
      }
    } else {
      console.error('❌ Notification API not available in this browser');
    }
  }, [userId]);

  const requestPermission = async () => {
    if (typeof Notification === 'undefined' || !('Notification' in window)) {
      console.error('❌ Notification API not available');
      toast({
        title: 'Not Supported',
        description: 'Push notifications are not supported in this browser. Please use Safari on iOS 16.4+',
        variant: 'destructive',
      });
      return null;
    }
    
    // Check if we're in Safari on iOS
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    if (isIOS && !isSafari) {
      toast({
        title: 'Safari Required',
        description: 'Please use Safari browser. Chrome/Firefox on iOS do not support web push notifications.',
        variant: 'destructive',
      });
      return null;
    }

    // Check for HTTPS requirement on iOS
    if (needsHTTPS) {
      toast({
        title: 'HTTPS Required',
        description: 'iPhone requires HTTPS. Please use the deployed website, not localhost.',
        variant: 'destructive',
      });
      return null;
    }

    try {
      // On iOS, check for specific Safari requirements
      if (isIOS) {
        console.log('📱 Requesting notification permission on iOS Safari...');
        console.log('User agent:', navigator.userAgent);
        console.log('Protocol:', window.location.protocol);
        console.log('Notification API available:', 'Notification' in window);
        console.log('Current permission:', Notification.permission);
        
        // Check iOS version (needs 16.4+)
        const match = navigator.userAgent.match(/OS (\d+)_(\d+)/);
        if (match) {
          const version = parseFloat(`${match[1]}.${match[2]}`);
          console.log('iOS version:', version);
          if (version < 16.4) {
            toast({
              title: 'Update Required',
              description: 'iOS 16.4 or later is required for push notifications',
              variant: 'destructive',
            });
            return null;
          }
        }
        
        // Check if running as standalone (added to home screen)
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
        console.log('Running as standalone app:', isStandalone);
        if (!isStandalone) {
          console.log('⚠️ For best experience on iPhone, add this site to your Home Screen');
        }
      }

      console.log('🔔 Requesting notification permission...');
      console.log('Browser:', navigator.userAgent);
      console.log('HTTPS:', window.location.protocol === 'https:');
      
      const permission = await Notification.requestPermission();
      console.log('✅ Permission result:', permission);
      setNotificationPermission(permission);
      
      // Alert user of the result
      if (permission === 'granted') {
        console.log('🎉 Permission GRANTED! Registering for push notifications...');
      } else if (permission === 'denied') {
        console.log('❌ Permission DENIED. User must enable in browser settings.');
      } else {
        console.log('⚠️ Permission DISMISSED (user clicked away from popup).');
      }

      if (permission === 'granted') {
        console.log('✅ Notification permission granted');
        const token = await registerServiceWorkerAndGetToken();
        return token;
      } else if (permission === 'denied') {
        toast({
          title: 'Permission Denied',
          description: isIOS 
            ? 'Go to Settings > Safari > Websites > Notifications and allow this site'
            : 'Please enable notifications in your browser settings',
          variant: 'destructive',
        });
        return null;
      } else {
        console.log('Notification permission dismissed');
        return null;
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      toast({
        title: 'Error',
        description: isIOS
          ? 'Make sure you are using Safari browser on iOS 16.4+'
          : 'Failed to request notification permission',
        variant: 'destructive',
      });
      return null;
    }
  };

  const registerServiceWorkerAndGetToken = async () => {
    try {
      // Register service worker
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        console.log('Service Worker registered:', registration);

        // Wait for service worker to be ready
        await navigator.serviceWorker.ready;

        // Get FCM token
        const app = getApp();
        const messaging = getMessaging(app);
        
        const currentToken = await getToken(messaging, {
          vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
          serviceWorkerRegistration: registration,
        });

        if (currentToken) {
          console.log('✅ FCM Token received:', currentToken);
          setFcmToken(currentToken);
          
          // Save token to database
          if (userId) {
            console.log('💾 Saving token for userId:', userId);
            await saveFCMToken(userId, currentToken);
          } else {
            console.warn('⚠️ No userId available yet. Token will be saved when user signs in.');
          }

          // Listen for foreground messages
          // Note: We don't show a toast here because Pusher already handles in-app notifications
          // This just logs that we received the push notification
          onMessage(messaging, (payload) => {
            console.log('Foreground push notification received:', payload);
            console.log('(Toast already shown by Pusher real-time notification)');
          });

          return currentToken;
        } else {
          console.log('No registration token available.');
          return null;
        }
      } else {
        console.log('Service workers are not supported');
        return null;
      }
    } catch (error) {
      console.error('Error getting FCM token:', error);
      return null;
    }
  };

  const saveFCMToken = async (userId: string, token: string) => {
    try {
      console.log('💾 Saving FCM token for user:', userId);
      const response = await fetch('/api/fcm-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, token }),
      });
      const result = await response.json();
      console.log('✅ FCM token saved:', result);
    } catch (error) {
      console.error('❌ Error saving FCM token:', error);
    }
  };

  // Effect to save token when user signs in (if we already have a token)
  useEffect(() => {
    if (userId && fcmToken) {
      console.log('👤 User signed in with existing token, saving to database...');
      console.log('   User ID:', userId);
      console.log('   Token:', fcmToken.substring(0, 20) + '...');
      saveFCMToken(userId, fcmToken);
    } else if (userId && !fcmToken) {
      console.log('👤 User signed in but no FCM token yet. Please click "Enable" to grant notification permission.');
    }
  }, [userId, fcmToken]);

  return {
    fcmToken,
    notificationPermission,
    requestPermission,
    isSupported: typeof window !== 'undefined' && typeof Notification !== 'undefined' && 'Notification' in window,
    isIOS,
    needsHTTPS,
  };
}

// Export for debugging
if (typeof window !== 'undefined') {
  (window as any).debugNotifications = () => {
    console.log('=== NOTIFICATION DEBUG INFO ===');
    console.log('Notification API available:', 'Notification' in window);
    console.log('Current permission:', Notification.permission);
    console.log('User Agent:', navigator.userAgent);
    console.log('Protocol:', window.location.protocol);
    console.log('Service Worker supported:', 'serviceWorker' in navigator);
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(regs => {
        console.log('Service Worker registrations:', regs.length);
      });
    }
    console.log('==============================');
  };
}
