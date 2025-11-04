import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/firebase-admin';
import { sendNotification } from '@/lib/notifications';

const NOTIFICATION_INTERVAL = 30 * 60 * 1000; // 30 minutes between repeat notifications

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      );
    }

    const adminApp = getAdminApp();
    const db = getFirestore(adminApp);
    
    const currentTime = Date.now();
    const tasksRef = db.collection('users').doc(userId).collection('tasks');
    const snapshot = await tasksRef.where('status', '!=', 'completed').get();
    
    const overdueTasks: any[] = [];
    const updates: Promise<any>[] = [];
    
    snapshot.forEach(doc => {
      const task: any = { id: doc.id, ...doc.data() };
      
      // Check if task has a deadline
      if (!task.deadline) return;
      
      const deadline = new Date(task.deadline).getTime();
      
      // Task is overdue
      if (currentTime > deadline) {
        const lastNotification = task.lastMissingNotification || 0;
        const timeSinceLastNotification = currentTime - lastNotification;
        
        // Check if we should send a notification (first time or after interval)
        if (timeSinceLastNotification > NOTIFICATION_INTERVAL || lastNotification === 0) {
          overdueTasks.push(task);
          
          // Update task status to 'missed' and record notification time
          updates.push(
            tasksRef.doc(doc.id).update({
              status: 'missed',
              lastMissingNotification: currentTime
            })
          );
        }
      }
    });
    
    // Execute all updates
    await Promise.all(updates);
    
    // Send notifications for overdue tasks
    for (const task of overdueTasks) {
      try {
        const deadlineDate = new Date(task.deadline);
        const hoursOverdue = Math.floor((currentTime - deadlineDate.getTime()) / (1000 * 60 * 60));
        
        await sendNotification(userId, 'task-missed', {
          title: 'Task Missed!',
          description: `"${task.description}" was due ${hoursOverdue}h ago`,
          type: 'warning',
        });
      } catch (notifError) {
        console.error(`Failed to send notification for task ${task.id}:`, notifError);
      }
    }
    
    return NextResponse.json({
      success: true,
      overdueCount: overdueTasks.length,
      overdueTasks: overdueTasks.map(t => ({
        id: t.id,
        description: t.description,
        deadline: t.deadline
      }))
    });
  } catch (error: any) {
    console.error('Check overdue tasks error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check overdue tasks' },
      { status: 500 }
    );
  }
}
