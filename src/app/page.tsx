'use client';

import { useState, useEffect } from 'react';
import type { Task } from '@/lib/types';
import { AppHeader } from '@/components/app/header';
import { TaskForm } from '@/components/app/task-form';
import { TaskList } from '@/components/app/task-list';
import { useUser } from '@/firebase';
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
  updateDoc,
  doc,
  deleteDoc,
  writeBatch,
} from 'firebase/firestore';
import { useCollection } from 'react-firebase-hooks/firestore';
import { Button } from '@/components/ui/button';
import { getAuth, GoogleAuthProvider, signInWithRedirect, signInWithPopup, getRedirectResult, signOut, setPersistence, browserLocalPersistence, indexedDBLocalPersistence, signInWithCredential, signInWithCustomToken } from 'firebase/auth';
import { useNotifications } from '@/hooks/use-notifications';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { sendNotification } from '@/lib/notifications';
import { Toaster } from '@/components/ui/toaster';
import { Bell } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { isIOSPWA, logAuthEnvironment } from '@/lib/auth-helpers';
import { signInWithGoogleIdentityServices, waitForGoogleIdentityServices } from '@/lib/google-identity-services';
import { generateAISuggestions, getOverdueTasks } from '@/lib/ai-suggestions';

export default function Home() {
  const { user, loading: userLoading } = useUser();
  const db = getFirestore();
  const { isConnected } = useNotifications(user?.uid || null);
  const { notificationPermission, requestPermission, isSupported, isIOS, needsHTTPS, fcmToken } = usePushNotifications(user?.uid || null);
  const [showNotificationDebug, setShowNotificationDebug] = useState(false);
  const [authInProgress, setAuthInProgress] = useState(true);
  const [loadingAI, setLoadingAI] = useState(false);

  useEffect(() => {
    logAuthEnvironment();
    const auth = getAuth();
    let timeoutId: NodeJS.Timeout | null = null;

    const initializeAuth = async () => {
      console.log('🚀 Initializing Auth...');
      const isiOSPWA = isIOSPWA();
      
      // Set a global timeout to ensure we never get stuck
      timeoutId = setTimeout(() => {
        console.warn('⏱️ Auth initialization timeout - forcing completion');
        sessionStorage.removeItem('auth_redirect_pending');
        setAuthInProgress(false);
      }, 15000); // 15 second absolute timeout
      
      try {
        // Set persistence FIRST. This is critical for iOS PWA.
        const persistence = isiOSPWA ? indexedDBLocalPersistence : browserLocalPersistence;
        await setPersistence(auth, persistence);
        console.log(`✅ Persistence set to ${isiOSPWA ? 'indexedDB' : 'browserLocal'}`);

        // For iOS PWA, we should NOT process redirects as GIS handles auth
        // Only check redirect for non-iOS environments
        if (!isiOSPWA && sessionStorage.getItem('auth_redirect_pending')) {
          console.log('🔍 Checking for redirect result...');
          
          try {
            const result = await getRedirectResult(auth);
            sessionStorage.removeItem('auth_redirect_pending');
            
            if (result) {
              console.log('✅ Successfully signed in after redirect!', result.user.email);
            } else {
              console.log('ℹ️ No redirect result found.');
            }
          } catch (redirectError: any) {
            console.error('❌ Redirect error:', redirectError.code, redirectError.message);
            sessionStorage.removeItem('auth_redirect_pending');
            
            if (redirectError.code === 'auth/network-request-failed') {
              // Don't show alert during initialization, just log it
              console.error('Network error during redirect. User can try signing in again.');
            }
          }
        } else if (isiOSPWA) {
          // For iOS PWA, clear any stale redirect flags
          sessionStorage.removeItem('auth_redirect_pending');
        }
      } catch (error: any) {
        console.error('❌ Auth initialization error:', error.code, error.message);
        sessionStorage.removeItem('auth_redirect_pending');
      } finally {
        // Clear the timeout and mark auth as complete
        if (timeoutId) clearTimeout(timeoutId);
        console.log('🏁 Auth initialization finished.');
        setAuthInProgress(false);
      }
    };

    initializeAuth();

    // Cleanup function
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  // Check for overdue tasks periodically
  useEffect(() => {
    if (!user) return;
    
    const checkOverdue = async () => {
      try {
        await fetch('/api/check-overdue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.uid })
        });
      } catch (error) {
        console.error('Failed to check overdue tasks:', error);
      }
    };
    
    // Check immediately
    checkOverdue();
    
    // Then check every 15 minutes
    const interval = setInterval(checkOverdue, 15 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [user]);

  const [tasksSnapshot, loading, error] = useCollection(
    user ? collection(db, 'users', user.uid, 'tasks') : null
  );

  const tasks: Task[] =
    tasksSnapshot?.docs.map(doc => ({
      id: doc.id,
      ...(doc.data() as Omit<Task, 'id'>),
    })) || [];

  const handleAddTask = async (description: string, deadline?: string, estimatedDuration?: number) => {
    if (!user) return;
    const newTask: Omit<Task, 'id' | 'createdAt'> & { createdAt: any } = {
      description,
      status: 'active',
      userId: user.uid,
      createdAt: serverTimestamp(),
      ...(deadline && { deadline }),
      ...(estimatedDuration && { estimatedDuration }),
    };
    await addDoc(collection(db, 'users', user.uid, 'tasks'), newTask);
    
    try {
      await sendNotification(user.uid, 'task-added', {
        title: 'Task Added',
        description: `Added: ${description}${deadline ? ` (Due: ${new Date(deadline).toLocaleString()})` : ''}`,
        type: 'success',
      });
    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  };

  const handleUpdateTask = async (id: string, updates: Partial<Task>) => {
    if (!user) return;
    const taskRef = doc(db, 'users', user.uid, 'tasks', id);
    await updateDoc(taskRef, updates);
    
    try {
      await sendNotification(user.uid, 'task-updated', {
        title: 'Task Updated',
        description: updates.status ? `Status changed to ${updates.status}` : 'Task details updated',
        type: 'info',
      });
    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (!user) return;
    const taskRef = doc(db, 'users', user.uid, 'tasks', id);
    await deleteDoc(taskRef);
    
    try {
      await sendNotification(user.uid, 'task-deleted', {
        title: 'Task Deleted',
        description: 'Task removed successfully',
        type: 'info',
      });
    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  };

  const handleSetTasks = async (newTasks: Task[]) => {
    if (!user) return;
    const batch = writeBatch(db);
    newTasks.forEach(task => {
      const taskRef = doc(db, 'users', user.uid, 'tasks', task.id);
      batch.set(taskRef, task, { merge: true });
    });
    await batch.commit();
    
    try {
      await sendNotification(user.uid, 'tasks-prioritized', {
        title: 'Tasks Prioritized',
        description: 'Your tasks have been intelligently organized',
        type: 'success',
      });
    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  };

  const handleSignIn = async () => {
    setAuthInProgress(true);
    const auth = getAuth();
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ 
      prompt: 'select_account'
    });

    try {
      const persistence = isIOSPWA() ? indexedDBLocalPersistence : browserLocalPersistence;
      await setPersistence(auth, persistence);
      console.log(`✅ Persistence set to ${isIOSPWA() ? 'indexedDB' : 'browserLocal'}`);

      if (isIOSPWA()) {
        console.log('🔑 iOS PWA detected - trying POPUP (not redirect!)');
        
        // CRITICAL FIX: Try popup FIRST even on iOS PWA
        // iOS 16.4+ actually supports popups in PWA mode
        try {
          console.log('🪟 Attempting popup sign-in...');
          const result = await signInWithPopup(auth, provider);
          console.log('✅ Popup sign-in successful!', result.user.email);
          setAuthInProgress(false);
          return;
        } catch (popupError: any) {
          console.error('❌ Popup failed:', popupError.code, popupError.message);
          
          // If popup truly doesn't work, show helpful message
          if (popupError.code === 'auth/popup-blocked') {
            alert('⚠️ Pop-up blocked\n\niOS PWA requires opening in Safari for first-time sign-in.\n\nSteps:\n1. Copy your app URL\n2. Open in Safari (not PWA)\n3. Sign in there\n4. Return to PWA - you\'ll be signed in!');
            setAuthInProgress(false);
            return;
          }
          
          if (popupError.code === 'auth/network-request-failed') {
            // Last resort: instruct user to sign in via Safari
            const shouldOpenSafari = confirm(
              '⚠️ iOS PWA Sign-In Issue\n\n' +
              'iOS PWA has strict security. Would you like to:\n\n' +
              '• TAP OK to copy the URL and sign in via Safari\n' +
              '• TAP CANCEL to try again later\n\n' +
              'After signing in via Safari, return to this PWA and you\'ll be signed in automatically.'
            );
            
            if (shouldOpenSafari) {
              // Copy URL to clipboard
              const url = window.location.href;
              navigator.clipboard.writeText(url).then(() => {
                alert('✅ URL copied!\n\nNow:\n1. Open Safari\n2. Paste the URL\n3. Sign in\n4. Come back to this PWA');
              }).catch(() => {
                alert(`Please open this URL in Safari:\n\n${url}\n\nSign in there, then return to this PWA.`);
              });
            }
            setAuthInProgress(false);
            return;
          }
          
          // Unknown error
          alert(`Sign-in error: ${popupError.message}\n\nTry opening the app in Safari instead of PWA mode.`);
          setAuthInProgress(false);
          return;
        }
      } else {
        // Non-iOS PWA: use standard popup
        console.log('🔑 Attempting sign-in with popup...');
        try {
          await signInWithPopup(auth, provider);
          setAuthInProgress(false);
        } catch (popupError: any) {
          if (popupError.code === 'auth/popup-blocked' || popupError.code === 'auth/cancelled-popup-request') {
            console.log('🔑 Popup blocked/cancelled, falling back to redirect...');
            sessionStorage.setItem('auth_redirect_pending', 'true');
            await signInWithRedirect(auth, provider);
          } else {
            throw popupError;
          }
        }
      }
    } catch (error: any) {
      console.error('❌ Sign-in error:', error.code, error.message);
      sessionStorage.removeItem('auth_redirect_pending');
      
      if (error.code === 'auth/network-request-failed') {
        alert('⚠️ Network error during sign-in.\n\nPlease check your internet connection and try again.');
        setAuthInProgress(false);
      } else {
        alert(`Sign-in failed: ${error.message}`);
        setAuthInProgress(false);
      }
    }
  };

  const handleSimpleSignIn = async () => {
    setAuthInProgress(true);
    try {
      console.log('🔐 Using simple DB auth...');
      
      // Call the simple auth API
      const response = await fetch('/api/simple-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'sridharan01234@gmail.com',
          action: 'getOrCreate'
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Authentication failed');
      }

      const data = await response.json();
      console.log('✅ Got custom token from server');

      // Sign in with the custom token
      const auth = getAuth();
      await signInWithCustomToken(auth, data.customToken);
      
      console.log('✅ Signed in successfully with custom token!');
      setAuthInProgress(false);
    } catch (error: any) {
      console.error('❌ Simple sign-in error:', error);
      alert(`Sign-in failed: ${error.message}`);
      setAuthInProgress(false);
    }
  };

  const handleGetAISuggestions = async () => {
    if (!user) return;
    setLoadingAI(true);
    
    try {
      console.log('🤖 Getting AI suggestions...');
      const suggestions = await generateAISuggestions(tasks, new Date());
      
      if (suggestions.length === 0) {
        alert('No new suggestions at the moment. Check back later!');
        setLoadingAI(false);
        return;
      }
      
      // Add AI suggested tasks
      for (const suggestion of suggestions) {
        const newTask = {
          description: suggestion.description,
          status: 'active' as const,
          userId: user.uid,
          createdAt: serverTimestamp(),
          deadline: suggestion.deadline,
          estimatedDuration: suggestion.estimatedDuration,
          priority: suggestion.priority,
          scheduledTime: suggestion.scheduledTime,
          reason: suggestion.reason,
          aiSuggested: true,
          aiPriority: suggestion.priority
        };
        
        await addDoc(collection(db, 'users', user.uid, 'tasks'), newTask);
      }
      
      // Send notification
      try {
        await sendNotification(user.uid, 'ai-suggestions', {
          title: '🤖 AI Suggestions Added',
          description: `${suggestions.length} new task suggestions based on your schedule`,
          type: 'success',
        });
      } catch (error) {
        console.error('Failed to send notification:', error);
      }
      
      alert(`✅ Added ${suggestions.length} AI-suggested tasks!\n\nCheck your task list for smart recommendations based on the current time and your existing tasks.`);
      
    } catch (error: any) {
      console.error('❌ AI suggestions error:', error);
      alert('Failed to get AI suggestions. Please try again.');
    } finally {
      setLoadingAI(false);
    }
  };

  const handleSignOut = async () => {
    const auth = getAuth();
    await signOut(auth);
  };

  if (userLoading || authInProgress) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <AppHeader user={user || null} onSignOut={handleSignOut} />
      <main className="flex-1 container mx-auto px-4 md:px-6 py-8">
        {user ? (
          <div className="max-w-3xl mx-auto flex flex-col gap-8">
            <Button 
              onClick={() => setShowNotificationDebug(!showNotificationDebug)} 
              variant="outline" 
              size="sm"
              className="self-start"
            >
              <Bell className="mr-2 h-4 w-4" />
              Notification Status
            </Button>

            {showNotificationDebug && (
              <Alert>
                <AlertTitle>🔍 Notification Debug Info</AlertTitle>
                <AlertDescription className="text-xs space-y-1 mt-2">
                  <div>Permission: <strong>{notificationPermission}</strong></div>
                  <div>Supported: <strong>{isSupported ? 'Yes' : 'No'}</strong></div>
                  <div>iOS: <strong>{isIOS ? 'Yes' : 'No'}</strong></div>
                  <div>HTTPS: <strong>{needsHTTPS ? 'No (Required!)' : 'Yes'}</strong></div>
                  <div>FCM Token: <strong>{fcmToken ? 'Registered ✅' : 'Not registered'}</strong></div>
                  <div>Standalone Mode: <strong>{typeof window !== 'undefined' && (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) ? 'Yes ✅' : 'No (Add to Home Screen!)'}</strong></div>
                  {isIOS && !isSupported && (
                    <div className="pt-2 text-amber-600 font-semibold">
                      ⚠️ On iOS, you must ADD TO HOME SCREEN first, then open from home screen icon!
                    </div>
                  )}
                  <div className="pt-2">
                    <Button onClick={requestPermission} size="sm" className="w-full">
                      Request Permission Now
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {!isSupported && isIOS && (
              <Alert className="border-2 border-amber-500 bg-amber-50 dark:bg-amber-950">
                <Bell className="h-5 w-5 text-amber-600" />
                <AlertTitle className="text-lg font-bold text-amber-800 dark:text-amber-200">
                  📱 Add to Home Screen Required
                </AlertTitle>
                <AlertDescription className="flex flex-col gap-3 mt-2">
                  <div className="text-sm text-amber-700 dark:text-amber-300">
                    <p className="font-semibold mb-2">On iPhone, push notifications only work for apps added to Home Screen:</p>
                    <ol className="list-decimal list-inside space-y-1 text-xs">
                      <li>Tap the Share button (square with arrow) at the bottom</li>
                      <li>Scroll down and tap "Add to Home Screen"</li>
                      <li>Tap "Add" in the top right</li>
                      <li>Open the app from your Home Screen (not Safari)</li>
                      <li>Then you can enable notifications!</li>
                    </ol>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {isSupported && notificationPermission !== 'granted' && (
              <Alert className="border-2 border-primary">
                <Bell className="h-5 w-5" />
                <AlertTitle className="text-lg font-bold">
                  {needsHTTPS ? '🔒 HTTPS Required' : '🔔 Enable Push Notifications'}
                </AlertTitle>
                <AlertDescription className="flex flex-col gap-3 mt-2">
                  {needsHTTPS ? (
                    <div className="text-sm">
                      <p className="font-semibold">iPhone requires HTTPS for push notifications.</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Please deploy to Firebase Hosting and use the deployed URL instead of localhost.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="text-sm">
                        <p className="font-semibold mb-1">
                          {isIOS 
                            ? '📱 Get system notifications on your iPhone like WhatsApp'
                            : '📱 Get system notifications on all your devices'
                          }
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {isIOS 
                            ? "Requires Safari browser & iOS 16.4+. You'll see a permission popup."
                            : 'Click Enable and allow notifications when prompted by your browser.'
                          }
                        </p>
                      </div>
                      <Button onClick={requestPermission} className="w-full" size="lg">
                        <Bell className="mr-2 h-4 w-4" />
                        Enable Push Notifications
                      </Button>
                    </>
                  )}
                </AlertDescription>
              </Alert>
            )}
            {notificationPermission === 'granted' && (
              <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
                <Bell className="h-5 w-5 text-green-600" />
                <AlertTitle className="text-green-800 dark:text-green-200">
                  ✅ Push Notifications Active
                </AlertTitle>
                <AlertDescription>
                  <div className="text-sm text-green-700 dark:text-green-300">
                    You'll receive system notifications (like WhatsApp) when tasks are added, updated, or deleted.
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* AI Suggestions Button */}
            <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950 dark:to-blue-950 rounded-lg border border-purple-200 dark:border-purple-800">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-purple-900 dark:text-purple-100">✨ AI Task Suggestions</h3>
                  <p className="text-sm text-purple-700 dark:text-purple-300">Get smart recommendations based on time and context</p>
                </div>
                <Button
                  onClick={handleGetAISuggestions}
                  disabled={loadingAI}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {loadingAI ? '🤖 Thinking...' : '✨ Get Suggestions'}
                </Button>
              </div>
            </div>

            <TaskForm onAddTask={handleAddTask} />
            <TaskList
              tasks={tasks}
              onUpdateTask={handleUpdateTask}
              onDeleteTask={handleDeleteTask}
              onSetTasks={handleSetTasks}
              loading={loading}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-[60vh] gap-6 text-center px-4">
            <h2 className="text-2xl font-bold">Welcome to FocusFlow</h2>
            <p className="text-muted-foreground">Please sign in to manage your tasks.</p>
            <div className="flex flex-col gap-3 w-full max-w-sm">
              <Button onClick={handleSimpleSignIn} disabled={authInProgress} size="lg" variant="default">
                {authInProgress ? 'Signing in...' : '🔐 Quick Sign In (iOS Fix)'}
              </Button>
              <div className="text-xs text-muted-foreground">or</div>
              <Button onClick={handleSignIn} disabled={authInProgress} size="sm" variant="outline">
                Sign in with Google
              </Button>
              {isIOSPWA() && (
                <Button 
                  onClick={() => window.location.href = '/safari-signin'} 
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                >
                  Having trouble? Try Safari sign-in →
                </Button>
              )}
            </div>
          </div>
        )}
      </main>
      <Toaster />
    </div>
  );
}
