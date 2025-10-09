'use client';

import { initializeFirebase } from './index';
import { FirebaseProvider } from './provider';

// This is a workaround for a bug in Next.js where the provider is
// initialized multiple times.
let firebase: any;
if (typeof window !== 'undefined') {
  if (!firebase) {
    firebase = initializeFirebase();
  }
}

export function FirebaseClientProvider({ children }: { children: React.ReactNode }) {
  if (!firebase) {
    firebase = initializeFirebase();
  }
  return <FirebaseProvider value={firebase}>{children}</FirebaseProvider>;
}
