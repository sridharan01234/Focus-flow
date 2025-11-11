'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { getPusherClient } from '@/lib/pusher-client';
import { useToast } from '@/hooks/use-toast';

export interface NotificationData {
  title: string;
  description?: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

export function useNotifications(userId: string | null) {
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<any>(null);
  
  // Use a ref to track if we're already subscribed to prevent duplicate subscriptions
  const isSubscribedRef = useRef(false);

  // Stable notification handler that won't change on re-renders
  const handleNotification = useCallback((data: NotificationData) => {
    console.log('📬 Pusher notification received:', data);
    toast({
      title: data.title,
      description: data.description,
      variant: data.type === 'error' ? 'destructive' : 'default',
    });
  }, [toast]);

  useEffect(() => {
    if (!userId) {
      // Reset subscription state when userId is null
      isSubscribedRef.current = false;
      return;
    }

    // Prevent duplicate subscriptions
    if (isSubscribedRef.current && channelRef.current) {
      console.log('⚠️ Already subscribed to notifications, skipping duplicate subscription');
      return;
    }

    console.log('📡 Setting up Pusher notification channel for user:', userId);
    const pusher = getPusherClient();
    const channel = pusher.subscribe(`user-${userId}`);
    channelRef.current = channel;
    isSubscribedRef.current = true;

    channel.bind('pusher:subscription_succeeded', () => {
      setIsConnected(true);
      console.log('✅ Successfully subscribed to notifications channel');
    });

    channel.bind('pusher:subscription_error', (error: any) => {
      console.error('❌ Pusher subscription error:', error);
      setIsConnected(false);
      isSubscribedRef.current = false;
    });

    // Bind all notification events to the same handler
    channel.bind('task-added', handleNotification);
    channel.bind('task-updated', handleNotification);
    channel.bind('task-deleted', handleNotification);
    channel.bind('tasks-prioritized', handleNotification);

    return () => {
      console.log('🧹 Cleaning up Pusher notification channel');
      channel.unbind_all();
      channel.unsubscribe();
      channelRef.current = null;
      isSubscribedRef.current = false;
    };
  }, [userId, handleNotification]);

  return { isConnected };
}
