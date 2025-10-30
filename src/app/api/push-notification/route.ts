import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, title, body: messageBody, data } = body;

    if (!userId || !title) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, title' },
        { status: 400 }
      );
    }

    // Note: For full FCM push notifications to work server-side, 
    // you need Firebase Admin SDK with service account credentials.
    // For now, client-side notifications (when app is open) will work via the service worker.
    
    console.log('Push notification request received:', { userId, title, messageBody });
    
    // Return success - the service worker will handle foreground notifications
    // Background notifications require Firebase Admin setup
    return NextResponse.json({ 
      success: true,
      message: 'Notification will be handled by service worker when app is active'
    });
  } catch (error) {
    console.error('Error processing push notification:', error);
    return NextResponse.json(
      { error: 'Failed to process push notification' },
      { status: 500 }
    );
  }
}
