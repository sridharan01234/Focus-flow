'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAuth } from 'firebase/auth';
import { useUser } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ExternalLink, Copy, CheckCircle } from 'lucide-react';

export default function SafariSignInHelper() {
  const router = useRouter();
  const { user } = useUser();
  const [copied, setCopied] = useState(false);
  const appUrl = typeof window !== 'undefined' ? window.location.origin : '';

  useEffect(() => {
    // If user is signed in, redirect to home
    if (user) {
      router.push('/');
    }
  }, [user, router]);

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(appUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (error) {
      alert(`Copy this URL:\n\n${appUrl}`);
    }
  };

  const openInSafari = () => {
    // This will prompt to open in Safari
    window.location.href = appUrl;
  };

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground p-6">
      <div className="max-w-md mx-auto mt-12 space-y-6">
        <h1 className="text-3xl font-bold text-center">iOS PWA Sign-In Workaround</h1>
        
        <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950">
          <AlertTitle className="text-lg font-bold text-amber-800 dark:text-amber-200">
            📱 iOS PWA Limitation
          </AlertTitle>
          <AlertDescription className="mt-2 space-y-2">
            <p className="text-sm text-amber-700 dark:text-amber-300">
              iOS Progressive Web Apps have strict security that prevents direct Google Sign-In.
            </p>
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
              Solution: Sign in via Safari, then return to the PWA!
            </p>
          </AlertDescription>
        </Alert>

        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          <h2 className="text-xl font-semibold">Quick Fix Steps:</h2>
          
          <ol className="list-decimal list-inside space-y-3 text-sm">
            <li>Copy the app URL below</li>
            <li>Open Safari browser</li>
            <li>Paste and go to the URL</li>
            <li>Sign in with Google there</li>
            <li>Return to this PWA - you'll be signed in!</li>
          </ol>

          <div className="space-y-2">
            <label className="text-sm font-medium">App URL:</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={appUrl}
                readOnly
                className="flex-1 px-3 py-2 border border-border rounded-md bg-muted text-sm"
              />
              <Button
                onClick={copyUrl}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Copied!' : 'Copy'}
              </Button>
            </div>
          </div>

          <Button
            onClick={openInSafari}
            className="w-full flex items-center justify-center gap-2"
            size="lg"
          >
            <ExternalLink className="h-5 w-5" />
            Open in Safari
          </Button>
        </div>

        <Alert className="border-blue-500 bg-blue-50 dark:bg-blue-950">
          <AlertTitle className="text-blue-800 dark:text-blue-200">
            💡 Why does this work?
          </AlertTitle>
          <AlertDescription className="mt-2 text-sm text-blue-700 dark:text-blue-300">
            Safari and PWA share the same authentication state. Once you sign in via Safari,
            the PWA will automatically recognize you're authenticated!
          </AlertDescription>
        </Alert>

        <div className="text-center">
          <Button
            onClick={() => router.push('/')}
            variant="ghost"
            size="sm"
          >
            ← Back to Home
          </Button>
        </div>
      </div>
    </div>
  );
}
