import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { getFirebaseApp } from '@/firebase/config';

export async function POST(request: NextRequest) {
  try {
    const { userId, token } = await request.json();

    if (!userId || !token) {
      return NextResponse.json(
        { error: 'Missing userId or token' },
        { status: 400 }
      );
    }

    const app = getFirebaseApp();
    const db = getFirestore(app);
    
    // Save FCM token to user's document
    const userRef = doc(db, 'users', userId);
    await setDoc(
      userRef,
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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving FCM token:', error);
    return NextResponse.json(
      { error: 'Failed to save FCM token' },
      { status: 500 }
    );
  }
}
