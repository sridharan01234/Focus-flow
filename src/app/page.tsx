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
import { getAuth, GoogleAuthProvider, signInWithRedirect, signInWithPopup, getRedirectResult, signOut, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { useNotifications } from '@/hooks/use-notifications';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { sendNotification } from '@/lib/notifications';
import { Toaster } from '@/components/ui/toaster';
import { Bell } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function Home() {
  const { user, loading: userLoading } = useUser();
  const db = getFirestore();
  const { isConnected } = useNotifications(user?.uid || null);
  const { notificationPermission, requestPermission, isSupported, isIOS, needsHTTPS, fcmToken } = usePushNotifications(user?.uid || null);
  const [showNotificationDebug, setShowNotificationDebug] = useState(false);
  const [redirectHandled, setRedirectHandled] = useState(false);

  // Handle redirect result after Google Sign-In (critical for iOS PWA)
  useEffect(() => {
    if (redirectHandled) return;
    
    // Check localStorage availability
    try {
      localStorage.setItem('test', 'test');
      localStorage.removeItem('test');
      console.log('✅ localStorage is available');
    } catch (e) {
      console.error('❌ localStorage is NOT available:', e);
    }
    
    const auth = getAuth();
    console.log('🔍 Checking for redirect result...');
    console.log('🔍 Current auth.currentUser:', auth.currentUser?.email || 'null');
    
    // Set a flag in sessionStorage to track if we just completed a redirect
    const justRedirected = sessionStorage.getItem('auth_redirect_pending');
    console.log('🔍 Auth redirect pending flag:', justRedirected);
    
    getRedirectResult(auth)
      .then((result) => {
        setRedirectHandled(true);
        
        if (result) {
          console.log('✅ ✅ ✅ Successfully signed in after redirect!');
          console.log('✅ User email:', result.user.email);
          console.log('✅ User ID:', result.user.uid);
          console.log('✅ Display name:', result.user.displayName);
          sessionStorage.removeItem('auth_redirect_pending');
          // Force a reload to ensure the UI updates
          window.location.reload();
        } else {
          console.log('ℹ️ No redirect result (normal page load or redirect already processed)');
          
          // If we were expecting a redirect result but didn't get one, there might be an issue
          if (justRedirected) {
            console.warn('⚠️ Expected redirect result but got null - checking current user...');
            if (auth.currentUser) {
              console.log('✅ User is actually signed in:', auth.currentUser.email);
              sessionStorage.removeItem('auth_redirect_pending');
            } else {
              console.error('❌ Redirect completed but no user signed in');
              sessionStorage.removeItem('auth_redirect_pending');
              alert('Sign-in may have failed. Please try again.');
            }
          }
          
          console.log('🔍 Checking localStorage for existing auth...');
          const keys = Object.keys(localStorage).filter(key => key.includes('firebase'));
          console.log('🔍 Firebase localStorage keys:', keys.length, 'keys found');
          if (keys.length > 0) {
            console.log('🔍 Sample keys:', keys.slice(0, 3));
          }
        }
      })
      .catch((error) => {
        setRedirectHandled(true);
        sessionStorage.removeItem('auth_redirect_pending');
        console.error('❌ ❌ ❌ Error handling redirect result!');
        console.error('❌ Error code:', error.code);
        console.error('❌ Error message:', error.message);
        console.error('❌ Full error:', error);
        
        if (error.code !== 'auth/popup-closed-by-user' && error.code !== 'auth/cancelled-popup-request') {
          alert(`Sign-in failed: ${error.message}\nError code: ${error.code}`);
        }
      });
  }, [redirectHandled]);

  const [tasksSnapshot, loading, error] = useCollection(
    user ? collection(db, 'users', user.uid, 'tasks') : null
  );

  const tasks: Task[] =
    tasksSnapshot?.docs.map(doc => ({
      id: doc.id,
      ...(doc.data() as Omit<Task, 'id'>),
    })) || [];

  const handleAddTask = async (description: string) => {
    if (!user) return;
    const newTask: Omit<Task, 'id' | 'createdAt'> & { createdAt: any } = {
      description,
      status: 'active',
      userId: user.uid,
      createdAt: serverTimestamp(),
    };
    await addDoc(collection(db, 'users', user.uid, 'tasks'), newTask);
    
    // Send notification
    try {
      await sendNotification(user.uid, 'task-added', {
        title: 'Task Added',
        description: `Added: ${description}`,
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
    
    // Send notification
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
    
    // Send notification
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
    
    // Send notification for prioritization
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
    const auth = getAuth();
    const provider = new GoogleAuthProvider();
    
    // Add custom parameters to ensure fresh sign-in
    provider.setCustomParameters({
      prompt: 'select_account'
    });
    
    try {
      console.log('🔑 Starting Google Sign-In flow...');
      console.log('🔑 Setting auth persistence to LOCAL...');
      
      // CRITICAL: Set persistence BEFORE sign-in
      await setPersistence(auth, browserLocalPersistence);
      console.log('✅ Persistence set to browserLocalPersistence');
      
      // Detect if we're in standalone mode (PWA on iOS)
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      
      console.log('📱 Device mode:', { isStandalone, isIOS });
      
      // Try popup first (works better with third-party cookies),
      // fallback to redirect if popup fails (iOS PWA blocks popups)
      try {
        console.log('🔑 Attempting popup sign-in...');
        const result = await signInWithPopup(auth, provider);
        console.log('✅ ✅ ✅ Popup sign-in successful!');
        console.log('✅ User email:', result.user.email);
        console.log('✅ User ID:', result.user.uid);
        // No need to reload, auth state will update automatically
      } catch (popupError: any) {
        console.log('⚠️ Popup failed, trying redirect...', popupError.code);
        
        // If popup was blocked or closed, try redirect
        if (popupError.code === 'auth/popup-blocked' || 
            popupError.code === 'auth/popup-closed-by-user' ||
            popupError.code === 'auth/cancelled-popup-request') {
          
          console.log('🔑 Using redirect sign-in instead...');
          sessionStorage.setItem('auth_redirect_pending', 'true');
          await signInWithRedirect(auth, provider);
          console.log('⚠️ If you see this, redirect did not happen!');
        } else {
          // Re-throw if it's a different error
          throw popupError;
        }
      }
      
    } catch (error: any) {
      console.error('❌ ❌ ❌ Error signing in with Google!');
      console.error('❌ Error code:', error.code);
      console.error('❌ Error message:', error.message);
      console.error('❌ Full error:', error);
      
      sessionStorage.removeItem('auth_redirect_pending');
      
      // More specific error handling
      if (error.code === 'auth/operation-not-allowed') {
        alert('Google Sign-In is not enabled. Please enable it in Firebase Console.');
      } else if (error.code === 'auth/unauthorized-domain') {
        alert(`This domain is not authorized. Please add "${window.location.hostname}" to Firebase Console authorized domains.`);
      } else {
        alert(`Sign-in failed: ${error.message}\nError code: ${error.code}`);
      }
    }
  };

  const handleSignOut = async () => {
    const auth = getAuth();
    await signOut(auth);
  };

  if (userLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <AppHeader user={user || null} onSignOut={handleSignOut} />
      <main className="flex-1 container mx-auto px-4 md:px-6 py-8">
        {user ? (
          <div className="max-w-3xl mx-auto flex flex-col gap-8">
            {/* Always show notification status button */}
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
                            ? 'Requires Safari browser & iOS 16.4+. You\'ll see a permission popup.'
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
          <div className="flex flex-col items-center justify-center h-[60vh] gap-4 text-center">
            <h2 className="text-2xl font-bold">Welcome to FocusFlow</h2>
            <p className="text-muted-foreground">Please sign in to manage your tasks.</p>
            <Button onClick={handleSignIn}>Sign in with Google</Button>
          </div>
        )}
      </main>
      <Toaster />
    </div>
  );
}
