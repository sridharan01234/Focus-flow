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
    // Use service account JSON directly embedded in code
    const serviceAccount = {
      type: "service_account",
      project_id: "studio-2705179619-e376d",
      private_key_id: "8461ebf08deaa191267044ff78d0b6c411e50a49",
      private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDJ1+Vt4prKAEzv\n4B45jzyQz/Y+pBJXOPniPqeZyWOghrBUv9+L2kwNugOWHjl7B1CATMilbvWh5Gcr\ni8RGRwCssvbQQri/ZwIPqDHIUx/tEkvcJ+wQ7PAJ9J/N2pyFLZKzBax4loteeKwR\nnptWZVc1zJL4NVCNPsXq4v5isk0rpHzCnBpEKFtU9Ly/VXW/dEbKuYaFb6WtO8ZY\nY1UyrvxgR2bGYaXOBQ1doxo1cwp5RoEAB3P7whkKS0IiWQUVDRMD7TuvXrH3lwjv\ncWgopobHcL8n74u13Fj5o5X7oKd0MfJyOhYc2+i+N2F7o3ICQNmFVogXDJ5uV4vi\np2Qjs63ZAgMBAAECggEADhN+HCJw5d73qUU23mVAlZ8cfrmtpMMOsX+UlnXpZSps\nytBBvFdU3/fbDwGcbm8avFkpJ1kHDMtTWEGsRl67wOTPL8QYwxJhiKrTuUh2F2/5\nSzPGiQH5FdH8lgbQTRJZ+B2lwu10Go/C/OHpK9vaj+Asggj3zTiK5Wqp+m3m/Kt2\nq+P7ewhLSV560qD7+gaWQUwV5phXXgn2GvI0nia5yZaDKtUKxaSP53PBcv4L+TIa\nV3OEFjOKkzzTfOmahBLHTe0eL3UM046DlA4vh876QTFGCEr3o5T5yTz8hpa7Mivc\neVXJvgMIekC73PNW8v+eictqrxxyv6idv7nNU8M6DQKBgQD7XuGVhrtjko1gtaGn\np9uOAsMLW8ygR7lKViMPmUN9QdIPV9QWdhX0QLt7Wdhkh+HOY7gtcOhnc+EduKHM\nbivFQISU3SjV4Y1LOPe3Y8rS76QqB7o9g8lh5Y2BrEEZs4CwH70RUpIHOYvexJAy\nFb1tYrbZYBrxH0s7sK/aBaSKvQKBgQDNj4MoUGHTqg0rN439owWZTdA5DtJBcaCX\noy48qfwpTe5Foh6L/ugp95iic7q1OILFBFeNzlVeGqf1PLWT3hPsJ6gbgTefSbkc\n7OGbfA4+2M0WierqXC39O4W63QYHq01DnkD4FipRi7JvhnWGP0b1qh2YShhgGox4\nWwfQFSZvTQKBgAoPhxnT9aYLlIr9WgX6yufJJoNK3kq/9COMhQS3zqKxwrWIf12S\nxlgrSxWpx+ZmJdx700BGV5bkZWsqG5eyBSB075mBrIO67kvHcOqvHMwKeViRTJvv\nrVy0slAxU72ymID0FD4gPuX5IKb+2QKYKie5nrXeidWCuiEedjtUpHxFAoGAc3AY\ns9cQWRGye4ajUsDuL/2m5aQRJ3dsPDwDh0XeukNtf+VfSjdIoejN6s0bGRI3PfUG\nRjiNcF9/2xTQ081vWruaiHe0iNuZ/Uh6Ghs81MZjxjiFmD9UBFYc76eX706gAU0q\nJygrc8gD2OWlslJuwx9Zp2BU+ANwx1Y3uP9nqjECgYEAgQ2rXC6bh/TE5Vbu0IS2\n1Xi8YnkPdA20t5kFRlubwK9w8Dw7UjeK73Ky6YroMM0sb13L/V8tqqDAGWIe4Jff\nwqof5hm/SFXt9ViITmRnQJJ5tecpsF+SkahKFiZvRCfPpYp35OJD9uueCEapFiXa\nfte2STwC1bxjDP24aOmOXyw=\n-----END PRIVATE KEY-----\n",
      client_email: "firebase-adminsdk-fbsvc@studio-2705179619-e376d.iam.gserviceaccount.com",
      client_id: "107210595465302737992",
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40studio-2705179619-e376d.iam.gserviceaccount.com",
      universe_domain: "googleapis.com"
    };

    console.log('🔑 Initializing Firebase Admin with service account...');

    adminApp = initializeApp({
      credential: cert(serviceAccount as any),
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

    // Send data-only message (no notification payload)
    // This prevents automatic notification display and gives full control to the service worker
    const message = {
      data: {
        title,
        body,
        ...(data || {}),
      },
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
