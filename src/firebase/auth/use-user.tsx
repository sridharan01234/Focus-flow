'use client';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useAuth } from '@/firebase/provider';

export function useUser() {
  const auth = useAuth();
  const [user, loading, error] = useAuthState(auth);

  return { user, loading, error };
}
