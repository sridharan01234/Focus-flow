import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { getFirebaseApp } from '@/firebase/config';
import { sendPushNotification } from '@/lib/firebase-admin';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

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

    console.log('Push notification request received:', { userId, title, messageBody });

    // Get user's FCM tokens from Firestore
    const app = getFirebaseApp();
    const db = getFirestore(app);
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      console.log('User document not found:', userId);
      return NextResponse.json({
        success: false,
        message: 'User not found'
      });
    }

    const userData = userDoc.data();
    const fcmTokens = userData?.fcmTokens || {};

    if (Object.keys(fcmTokens).length === 0) {
      console.log('No FCM tokens found for user:', userId);
      return NextResponse.json({
        success: false,
        message: 'No FCM tokens registered'
      });
    }

    // Extract token strings from the fcmTokens object
    const tokens = Object.values(fcmTokens).map((t: any) => t.token);

    console.log(`Sending push notification to ${tokens.length} device(s)`);

    // Send push notification via Firebase Admin
    const result = await sendPushNotification(
      tokens,
      title,
      messageBody || '',
      data
    );

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error,
      }, { status: 500 });
    }

    // Clean up failed tokens
    if (result.failedTokens && result.failedTokens.length > 0) {
      console.log('Removing failed tokens:', result.failedTokens);
      // Note: Token cleanup can be done here if needed
    }

    return NextResponse.json({
      success: true,
      successCount: result.successCount,
      failureCount: result.failureCount,
    });
  } catch (error) {
    console.error('Error sending push notification:', error);
    return NextResponse.json(
      { error: 'Failed to send push notification', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
