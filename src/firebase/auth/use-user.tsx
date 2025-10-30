'use client';
import { useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useAuth } from '@/firebase/provider';

export function useUser() {
  const auth = useAuth();
  const [user, loading, error] = useAuthState(auth);

  useEffect(() => {
    console.log('👤 Auth state changed:', { 
      userId: user?.uid, 
      email: user?.email, 
      loading, 
      error: error?.message 
    });
  }, [user, loading, error]);

  return { user, loading, error };
}
