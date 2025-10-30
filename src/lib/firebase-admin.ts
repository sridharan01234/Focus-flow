import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

let adminApp: App | undefined;

export function getAdminApp() {
  if (adminApp) return adminApp;
  
  if (getApps().length > 0) {
    adminApp = getApps()[0];
    return adminApp;
  }

  // Initialize with service account credentials
  try {
    const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    let privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

    if (!clientEmail || !privateKey || !projectId) {
      throw new Error('Firebase Admin credentials not found in environment variables');
    }

    // Handle both quoted and unquoted private keys
    // Remove surrounding quotes if present
    privateKey = privateKey.replace(/^["']|["']$/g, '');
    
    // Replace literal \n with actual newlines
    privateKey = privateKey.replace(/\\n/g, '\n');

    console.log('🔑 Initializing Firebase Admin with credentials...');
    console.log('Project ID:', projectId);
    console.log('Client Email:', clientEmail);
    console.log('Private Key starts with:', privateKey.substring(0, 30) + '...');

    adminApp = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
    
    console.log('✅ Firebase Admin initialized successfully');
    return adminApp;
  } catch (error) {
    console.error('❌ Error initializing Firebase Admin:', error);
    throw error;
  }
}

export async function sendPushNotification(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, string>
) {
  try {
    const app = getAdminApp();
    const messaging = getMessaging(app);

    const message = {
      notification: {
        title,
        body,
      },
      data: data || {},
      tokens,
    };

    console.log(`📱 Sending push notification to ${tokens.length} device(s)...`);

    const response = await messaging.sendEachForMulticast(message);
    
    console.log('✅ Push notification sent:', {
      success: response.successCount,
      failure: response.failureCount,
    });

    return {
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
      failedTokens: response.responses
        .map((resp, idx) => (!resp.success ? tokens[idx] : null))
        .filter(Boolean) as string[],
    };
  } catch (error) {
    console.error('❌ Error sending push notification:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
