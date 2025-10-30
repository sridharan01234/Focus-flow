'use client';

import { useEffect, useState } from 'react';
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

  useEffect(() => {
    if (!userId) return;

    const pusher = getPusherClient();
    const channel = pusher.subscribe(`user-${userId}`);

    channel.bind('pusher:subscription_succeeded', () => {
      setIsConnected(true);
      console.log('Successfully subscribed to notifications');
    });

    channel.bind('pusher:subscription_error', (error: any) => {
      console.error('Subscription error:', error);
      setIsConnected(false);
    });

    // Listen for task notifications
    channel.bind('task-added', (data: NotificationData) => {
      toast({
        title: data.title,
        description: data.description,
        variant: data.type === 'error' ? 'destructive' : 'default',
      });
    });

    channel.bind('task-updated', (data: NotificationData) => {
      toast({
        title: data.title,
        description: data.description,
        variant: data.type === 'error' ? 'destructive' : 'default',
      });
    });

    channel.bind('task-deleted', (data: NotificationData) => {
      toast({
        title: data.title,
        description: data.description,
        variant: data.type === 'error' ? 'destructive' : 'default',
      });
    });

    channel.bind('tasks-prioritized', (data: NotificationData) => {
      toast({
        title: data.title,
        description: data.description,
        variant: data.type === 'error' ? 'destructive' : 'default',
      });
    });

    return () => {
      channel.unbind_all();
      channel.unsubscribe();
    };
  }, [userId, toast]);

  return { isConnected };
}
