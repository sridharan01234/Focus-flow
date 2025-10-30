/**
 * Authentication helpers for iOS PWA compatibility
 * 
 * iOS PWAs have strict security that prevents Firebase Auth popups/redirects
 * from working properly. This file contains workarounds.
 */

export function isIOSPWA(): boolean {
  if (typeof window === 'undefined') return false;
  
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                       (window.navigator as any).standalone;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  
  return isStandalone && isIOS;
}

export function isIOS(): boolean {
  if (typeof window === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

/**
 * Opens a URL in Safari from an iOS PWA
 * This is necessary because iOS PWAs can't properly handle OAuth redirects
 */
export function openInSafari(url: string): void {
  // Create a link that opens in Safari
  const link = document.createElement('a');
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  
  // For iOS PWA, we need to set a special attribute
  if (isIOSPWA()) {
    // This will open in Safari instead of the in-app browser
    (link as any).download = '';
  }
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Shows iOS-specific instructions for authentication
 */
export function showIOSAuthInstructions(): boolean {
  if (!isIOSPWA()) return false;
  
  const proceed = confirm(
    '📱 iOS PWA Sign-In\n\n' +
    'To sign in securely:\n\n' +
    '1. Tap OK to open Safari\n' +
    '2. Complete Google sign-in in Safari\n' +
    '3. Return here via Home Screen icon\n\n' +
    'Your session will persist automatically.\n\n' +
    'Ready to proceed?'
  );
  
  return proceed;
}

/**
 * Waits for auth state to be ready (useful after redirect)
 */
export async function waitForAuthReady(
  checkAuth: () => boolean,
  maxAttempts: number = 10,
  delayMs: number = 500
): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    if (checkAuth()) {
      console.log(`✅ Auth ready after ${i + 1} attempts`);
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }
  
  console.warn(`⚠️ Auth not ready after ${maxAttempts} attempts`);
  return false;
}

/**
 * Gets the appropriate auth method for the current environment
 */
export function getAuthMethod(): 'popup' | 'redirect' {
  if (isIOSPWA()) {
    return 'redirect'; // iOS PWA must use redirect
  }
  return 'popup'; // Desktop/web can use popup
}

/**
 * Logs diagnostic information about the environment
 */
export function logAuthEnvironment(): void {
  if (typeof window === 'undefined') return;
  
  const standalone = window.matchMedia('(display-mode: standalone)').matches;
  const navigatorStandalone = (window.navigator as any).standalone;
  const userAgent = navigator.userAgent;
  const isIOSDevice = /iPad|iPhone|iPod/.test(userAgent);
  const isPWA = standalone || navigatorStandalone;
  
  console.log('🔍 Auth Environment:', {
    isIOSDevice,
    isPWA,
    standalone,
    navigatorStandalone,
    isIOSPWA: isIOSPWA(),
    recommendedMethod: getAuthMethod(),
    userAgent: userAgent.substring(0, 50) + '...'
  });
}
