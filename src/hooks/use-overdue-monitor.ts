'use client';

import { useEffect, useRef } from 'react';
import type { Task } from '@/lib/types';

const CHECK_INTERVAL = 10 * 1000; // Check every 10 seconds

export function useOverdueMonitor(tasks: Task[], userId: string | null) {
    const lastCheckRef = useRef<number>(Date.now());
    const isCheckingRef = useRef(false);

    useEffect(() => {
        if (!userId) return;

        const checkOverdue = async () => {
            // Prevent concurrent checks
            if (isCheckingRef.current) return;

            const now = Date.now();

            // Client-side pre-check to avoid unnecessary API calls
            // We only want to call the API if we actually see something that looks overdue locally
            // AND it hasn't been marked as missed yet
            const hasPotentialOverdue = tasks.some(task => {
                if (task.status === 'completed' || task.status === 'missing') return false;
                if (!task.deadline) return false;

                const deadline = new Date(task.deadline).getTime();
                return now > deadline;
            });

            if (hasPotentialOverdue) {
                isCheckingRef.current = true;
                try {
                    await fetch('/api/check-overdue', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userId })
                    });
                } catch (error) {
                    console.error('Failed to check overdue tasks:', error);
                } finally {
                    isCheckingRef.current = false;
                    lastCheckRef.current = now;
                }
            }
        };

        // Initial check
        checkOverdue();

        // Periodic check
        const intervalId = setInterval(checkOverdue, CHECK_INTERVAL);

        return () => clearInterval(intervalId);
    }, [tasks, userId]);
}
