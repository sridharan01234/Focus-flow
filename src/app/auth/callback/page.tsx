'use client';

import { useEffect, useState } from 'react';
import { getAuth, getRedirectResult } from 'firebase/auth';
import { useRouter } from 'next/navigation';

/**
 * Auth callback page for iOS PWA
 * This page handles the redirect after Google Sign-In completes in Safari
 */
export default function AuthCallback() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing sign-in...');
  const router = useRouter();

  useEffect(() => {
    const handleAuthCallback = async () => {
      const auth = getAuth();
      
      try {
        console.log('🔄 Auth callback page: Checking redirect result...');
        const result = await getRedirectResult(auth);
        
        if (result) {
          console.log('✅ Sign-in successful:', result.user.email);
          setStatus('success');
          setMessage(`Welcome, ${result.user.displayName || result.user.email}!`);
          
          // Clear the redirect pending flag
          sessionStorage.removeItem('auth_redirect_pending');
          sessionStorage.removeItem('auth_redirect_time');
          
          // Redirect to home after a brief delay
          setTimeout(() => {
            router.push('/');
          }, 2000);
        } else {
          // No result means redirect was already handled or this is not a redirect
          console.log('ℹ️ No redirect result, redirecting to home...');
          router.push('/');
        }
      } catch (error: any) {
        console.error('❌ Error handling auth callback:', error);
        setStatus('error');
        setMessage(`Error: ${error.message}`);
        
        // Redirect to home after error
        setTimeout(() => {
          router.push('/');
        }, 3000);
      }
    };

    handleAuthCallback();
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4">
      <div className="w-full max-w-md space-y-8 text-center">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold text-gray-900">FocusFlow</h1>
          
          {status === 'loading' && (
            <>
              <div className="flex justify-center">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600"></div>
              </div>
              <p className="text-lg text-gray-600">{message}</p>
            </>
          )}
          
          {status === 'success' && (
            <>
              <div className="flex justify-center">
                <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                  <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <p className="text-lg font-medium text-green-600">{message}</p>
              <p className="text-sm text-gray-500">Redirecting...</p>
            </>
          )}
          
          {status === 'error' && (
            <>
              <div className="flex justify-center">
                <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                  <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              </div>
              <p className="text-lg font-medium text-red-600">{message}</p>
              <p className="text-sm text-gray-500">Redirecting to home...</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
