import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getAdminApp } from '@/lib/firebase-admin';

// Simple authentication endpoint for bypassing iOS PWA issues
export async function POST(request: NextRequest) {
  try {
    const { email, action } = await request.json();
    
    // Only allow your email
    if (email !== 'sridharan01234@gmail.com') {
      return NextResponse.json(
        { error: 'Unauthorized email' },
        { status: 403 }
      );
    }

    const adminApp = getAdminApp();
    const auth = getAuth(adminApp);

    if (action === 'getOrCreate') {
      try {
        // Try to get existing user
        const user = await auth.getUserByEmail(email);
        
        // Create custom token
        const customToken = await auth.createCustomToken(user.uid);
        
        return NextResponse.json({
          success: true,
          customToken,
          uid: user.uid,
          email: user.email
        });
      } catch (error: any) {
        // User doesn't exist, create them
        if (error.code === 'auth/user-not-found') {
          const newUser = await auth.createUser({
            email: email,
            emailVerified: true,
            displayName: 'Sridharan',
          });
          
          const customToken = await auth.createCustomToken(newUser.uid);
          
          return NextResponse.json({
            success: true,
            customToken,
            uid: newUser.uid,
            email: newUser.email,
            created: true
          });
        }
        
        throw error;
      }
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Simple auth error:', error);
    return NextResponse.json(
      { error: error.message || 'Authentication failed' },
      { status: 500 }
    );
  }
}
