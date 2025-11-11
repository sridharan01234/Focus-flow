import type { NotificationData } from '@/hooks/use-notifications';

export async function sendNotification(
  userId: string,
  event: string,
  data: NotificationData
) {
  try {
    const notificationId =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    // Send real-time notification via Pusher
    const pusherResponse = await fetch('/api/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, event, data }),
    });

    if (!pusherResponse.ok) {
      throw new Error('Failed to send Pusher notification');
    }

    // Also send push notification via FCM
    // Note: All data values must be strings for FCM data-only messages
    const pushResponse = await fetch('/api/push-notification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        title: data.title,
        body: data.description || '',
        data: {
          event,
          type: data.type,
          notificationId,
        },
      }),
    });

    // Don't throw error if push fails - it's optional
    if (!pushResponse.ok) {
      console.warn('Push notification failed, but Pusher notification succeeded');
    }

    return { pusher: await pusherResponse.json(), push: pushResponse.ok };
  } catch (error) {
    console.error('Error sending notification:', error);
    throw error;
  }
}
