/**
 * Google Identity Services (GIS) Authentication
 * 
 * This module provides iOS PWA-compatible authentication using Google's
 * Identity Services SDK which bypasses third-party cookie restrictions.
 * 
 * Reference: https://developers.google.com/identity/gsi/web/guides/overview
 */

import { getAuth, GoogleAuthProvider, signInWithCredential } from 'firebase/auth';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: GoogleIdentityConfig) => void;
          prompt: (callback?: (notification: any) => void) => void;
          renderButton: (parent: HTMLElement, options: GoogleButtonConfig) => void;
          disableAutoSelect: () => void;
          revoke: (email: string, callback: (response: any) => void) => void;
        };
      };
    };
  }
}

interface GoogleIdentityConfig {
  client_id: string;
  callback: (response: GoogleCredentialResponse) => void;
  auto_select?: boolean;
  cancel_on_tap_outside?: boolean;
  use_fedcm_for_prompt?: boolean;
}

interface GoogleCredentialResponse {
  credential: string; // JWT ID token
  select_by?: string;
}

interface GoogleButtonConfig {
  type?: 'standard' | 'icon';
  theme?: 'outline' | 'filled_blue' | 'filled_black';
  size?: 'large' | 'medium' | 'small';
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
  shape?: 'rectangular' | 'pill' | 'circle' | 'square';
  logo_alignment?: 'left' | 'center';
  width?: number;
  local?: string;
}

/**
 * Get Google Client ID from environment or Firebase config
 */
export function getGoogleClientId(): string | null {
  // Check environment variable first
  if (process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) {
    return process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  }
  
  // For Firebase, the Client ID format is typically:
  // {PROJECT_NUMBER}-{RANDOM}.apps.googleusercontent.com
  // You can find this in Firebase Console → Authentication → Sign-in method → Google
  
  console.warn(
    '⚠️ NEXT_PUBLIC_GOOGLE_CLIENT_ID not set. ' +
    'Please add it to your .env.local file.\n' +
    'Find it in Firebase Console → Authentication → Sign-in method → Google → Web SDK configuration'
  );
  
  return null;
}

/**
 * Initialize Google Identity Services
 * Must be called after the google.accounts.id library loads
 */
export function initializeGoogleIdentity(
  onSuccess: (idToken: string) => void,
  onError: (error: Error) => void
): boolean {
  const clientId = getGoogleClientId();
  
  if (!clientId) {
    onError(new Error('Google Client ID not configured'));
    return false;
  }
  
  if (!window.google?.accounts?.id) {
    console.error('❌ Google Identity Services not loaded');
    onError(new Error('Google Identity Services library not loaded'));
    return false;
  }
  
  try {
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: (response: GoogleCredentialResponse) => {
        console.log('✅ Google Identity Services: Received credential');
        onSuccess(response.credential);
      },
      auto_select: false,
      cancel_on_tap_outside: true,
      // Enable FedCM for iOS PWA compatibility
      use_fedcm_for_prompt: true,
    });
    
    console.log('✅ Google Identity Services initialized');
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize Google Identity Services:', error);
    onError(error as Error);
    return false;
  }
}

/**
 * Render Google Sign-In button
 */
export function renderGoogleButton(
  element: HTMLElement,
  onSuccess: (idToken: string) => void,
  onError: (error: Error) => void
): void {
  if (!window.google?.accounts?.id) {
    onError(new Error('Google Identity Services not loaded'));
    return;
  }
  
  // Initialize if not already done
  initializeGoogleIdentity(onSuccess, onError);
  
  // Render the button
  window.google.accounts.id.renderButton(element, {
    type: 'standard',
    theme: 'outline',
    size: 'large',
    text: 'signin_with',
    shape: 'rectangular',
    logo_alignment: 'left',
    width: element.offsetWidth || 280,
  });
  
  console.log('✅ Google Sign-In button rendered');
}

/**
 * Show One Tap prompt (auto sign-in)
 */
export function showOneTap(
  onSuccess: (idToken: string) => void,
  onError: (error: Error) => void
): void {
  if (!window.google?.accounts?.id) {
    onError(new Error('Google Identity Services not loaded'));
    return;
  }
  
  // Initialize if not already done
  initializeGoogleIdentity(onSuccess, onError);
  
  // Show One Tap
  window.google.accounts.id.prompt((notification: any) => {
    if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
      console.log('ℹ️ One Tap not displayed:', notification.getNotDisplayedReason());
    }
  });
}

/**
 * Sign in with Google using Identity Services
 * This is the iOS PWA-compatible method
 * IMPROVED: Creates a button programmatically for better reliability
 */
export async function signInWithGoogleIdentityServices(): Promise<void> {
  const clientId = getGoogleClientId();
  
  if (!clientId) {
    throw new Error(
      'Google Client ID not configured. Please set NEXT_PUBLIC_GOOGLE_CLIENT_ID in .env.local\n' +
      'Find it in: Firebase Console → Authentication → Sign-in method → Google'
    );
  }
  
  if (!window.google?.accounts?.id) {
    throw new Error('Google Identity Services not loaded');
  }
  
  return new Promise((resolve, reject) => {
    console.log('🔧 Initializing GIS for iOS PWA...');
    
    // Create a hidden button container
    const buttonContainer = document.createElement('div');
    buttonContainer.id = 'gis-signin-button';
    buttonContainer.style.position = 'fixed';
    buttonContainer.style.top = '-9999px';
    buttonContainer.style.left = '-9999px';
    document.body.appendChild(buttonContainer);
    
    // Initialize GIS with callback
    const initialized = initializeGoogleIdentity(
      async (idToken: string) => {
        try {
          console.log('🔄 Exchanging Google ID token with Firebase...');
          
          // Clean up the button
          if (buttonContainer.parentNode) {
            buttonContainer.parentNode.removeChild(buttonContainer);
          }
          
          // Create Firebase credential from Google ID token
          const credential = GoogleAuthProvider.credential(idToken);
          
          // Sign in to Firebase
          const auth = getAuth();
          const result = await signInWithCredential(auth, credential);
          
          console.log('✅ Successfully signed in with Firebase');
          console.log('✅ User:', result.user.email);
          
          resolve();
        } catch (error: any) {
          console.error('❌ Failed to sign in with Firebase:', error);
          // Clean up
          if (buttonContainer.parentNode) {
            buttonContainer.parentNode.removeChild(buttonContainer);
          }
          reject(error);
        }
      },
      (error: Error) => {
        console.error('❌ Google Identity Services error:', error);
        // Clean up
        if (buttonContainer.parentNode) {
          buttonContainer.parentNode.removeChild(buttonContainer);
        }
        reject(error);
      }
    );
    
    if (!initialized) {
      if (buttonContainer.parentNode) {
        buttonContainer.parentNode.removeChild(buttonContainer);
      }
      reject(new Error('Failed to initialize Google Identity Services'));
      return;
    }
    
    // Render the button (this will trigger the sign-in flow)
    try {
      console.log('🔘 Rendering GIS button...');
      if (!window.google?.accounts?.id) {
        throw new Error('GIS not available after initialization');
      }
      
      window.google.accounts.id.renderButton(buttonContainer, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'signin_with',
        shape: 'rectangular',
      });
      
      // Programmatically click the button
      setTimeout(() => {
        const button = buttonContainer.querySelector('div[role="button"]');
        if (button) {
          console.log('🖱️ Auto-clicking GIS button...');
          (button as HTMLElement).click();
        } else {
          console.warn('⚠️ GIS button not found, trying prompt...');
          // Fallback to One Tap
          if (window.google?.accounts?.id) {
            window.google.accounts.id.prompt((notification: any) => {
              if (notification.isNotDisplayed()) {
                const reason = notification.getNotDisplayedReason();
                console.error('❌ One Tap not displayed:', reason);
                if (buttonContainer.parentNode) {
                  buttonContainer.parentNode.removeChild(buttonContainer);
                }
                reject(new Error(`One Tap unavailable: ${reason}`));
              }
            });
          } else {
            if (buttonContainer.parentNode) {
              buttonContainer.parentNode.removeChild(buttonContainer);
            }
            reject(new Error('GIS no longer available'));
          }
        }
      }, 500);
      
    } catch (error) {
      console.error('❌ Failed to render GIS button:', error);
      if (buttonContainer.parentNode) {
        buttonContainer.parentNode.removeChild(buttonContainer);
      }
      reject(error);
    }
  });
}

/**
 * Check if Google Identity Services is available
 */
export function isGoogleIdentityServicesAvailable(): boolean {
  return typeof window !== 'undefined' && !!window.google?.accounts?.id;
}

/**
 * Wait for Google Identity Services to load
 */
export function waitForGoogleIdentityServices(timeout = 5000): Promise<boolean> {
  return new Promise((resolve) => {
    if (isGoogleIdentityServicesAvailable()) {
      resolve(true);
      return;
    }
    
    const startTime = Date.now();
    const checkInterval = setInterval(() => {
      if (isGoogleIdentityServicesAvailable()) {
        clearInterval(checkInterval);
        resolve(true);
      } else if (Date.now() - startTime > timeout) {
        clearInterval(checkInterval);
        console.warn('⚠️ Google Identity Services did not load within timeout');
        resolve(false);
      }
    }, 100);
  });
}
