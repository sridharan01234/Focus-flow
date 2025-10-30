import { getFirebaseApp, firebaseConfig } from './config';
import {
  getAuth,
  connectAuthEmulator,
  setPersistence,
  browserLocalPersistence,
  Auth,
} from 'firebase/auth';
import {
  getFirestore,
  connectFirestoreEmulator,
  Firestore,
} from 'firebase/firestore';

export function initializeFirebase(): {
  app: any;
  auth: Auth;
  firestore: Firestore;
} {
  const app = getFirebaseApp();
  const auth = getAuth(app);
  const firestore = getFirestore(app);

  // Explicitly set persistence to LOCAL for auth state
  // This ensures user stays signed in after redirect (critical for iOS PWA)
  if (typeof window !== 'undefined') {
    // Detect iOS PWA
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isIOSPWA = isStandalone && isIOS;
    
    // Set persistence synchronously before any auth operations
    setPersistence(auth, browserLocalPersistence)
      .then(() => {
        console.log('✅ Auth persistence set to LOCAL (browserLocalPersistence)');
        if (isIOSPWA) {
          console.log('📱 Running in iOS PWA mode - auth configured for iOS compatibility');
        }
      })
      .catch((error) => {
        console.error('❌ Failed to set auth persistence:', error);
        if (isIOSPWA) {
          console.error('⚠️ iOS PWA detected - persistence failure may affect sign-in');
        }
      });
  }

  if (process.env.NEXT_PUBLIC_EMULATOR_HOST) {
    // Check if the emulators are already connected
    if (!(auth as any).emulatorConfig) {
      // It's safe to connect the emulators
      connectAuthEmulator(auth, `http://${process.env.NEXT_PUBLIC_EMULATOR_HOST}:9099`, {
        disableWarnings: true,
      });
    }

    if (!(firestore as any).emulator) {
      const host = process.env.NEXT_PUBLIC_EMULATOR_HOST;
      const port = parseInt(process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_PORT || '8080');
      connectFirestoreEmulator(firestore, host, port);
    }
  }

  return { app, auth, firestore };
}

export * from './provider';
export * from './client-provider';
export * from './auth/use-user';
