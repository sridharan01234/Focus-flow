import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { userId, token } = await request.json();

    if (!userId || !token) {
      return NextResponse.json(
        { error: 'Missing userId or token' },
        { status: 400 }
      );
    }

    // Use Firebase Admin SDK (has full access)
    const app = getAdminApp();
    const db = getFirestore(app);
    
    // Save FCM token to user's document
    const userRef = db.collection('users').doc(userId);
    await userRef.set(
      {
        fcmTokens: {
          [token]: {
            token,
            updatedAt: new Date().toISOString(),
            platform: 'web',
          },
        },
      },
      { merge: true }
    );

    console.log('✅ FCM token saved for user:', userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Error saving FCM token:', error);
    return NextResponse.json(
      { error: 'Failed to save FCM token' },
      { status: 500 }
    );
  }
}
