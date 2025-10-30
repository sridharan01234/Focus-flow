import { Task } from './types';

export interface AISuggestion {
  description: string;
  priority: number;
  estimatedDuration: number; // in minutes
  deadline: string; // ISO date string
  reason: string;
  scheduledTime?: string;
}

/**
 * Analyzes existing tasks and generates AI suggestions
 */
export async function generateAISuggestions(
  existingTasks: Task[],
  currentDate: Date
): Promise<AISuggestion[]> {
  try {
    // Get incomplete tasks
    const incompleteTasks = existingTasks.filter(t => t.status !== 'completed');
    
    // Prepare context for AI
    const tasksContext = incompleteTasks.map(t => ({
      description: t.description,
      status: t.status,
      deadline: t.deadline,
      createdAt: typeof t.createdAt === 'number' ? new Date(t.createdAt).toISOString() : 'unknown'
    }));

    const currentDateStr = currentDate.toISOString();
    
    // Call the Genkit flow via API
    const response = await fetch('/api/ai-suggestions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tasks: tasksContext,
        currentDate: currentDateStr
      })
    });

    if (!response.ok) {
      throw new Error('Failed to get AI suggestions');
    }

    const data = await response.json();
    return data.suggestions || [];
  } catch (error) {
    console.error('Error generating AI suggestions:', error);
    return [];
  }
}

/**
 * Check for overdue tasks and return them
 */
export function getOverdueTasks(tasks: Task[], currentDate: Date): Task[] {
  return tasks.filter(task => {
    if (task.status === 'completed') return false;
    if (!task.deadline) return false;
    
    const deadline = new Date(task.deadline);
    return currentDate > deadline;
  });
}

/**
 * Calculate time-based priority
 */
export function calculateTimePriority(task: Task, currentDate: Date): number {
  if (!task.deadline) return task.priority || 5;
  
  const deadline = new Date(task.deadline);
  const now = currentDate.getTime();
  const deadlineTime = deadline.getTime();
  const timeLeft = deadlineTime - now;
  
  // Less than 1 hour: priority 10
  if (timeLeft < 60 * 60 * 1000) return 10;
  // Less than 4 hours: priority 9
  if (timeLeft < 4 * 60 * 60 * 1000) return 9;
  // Less than 12 hours: priority 8
  if (timeLeft < 12 * 60 * 60 * 1000) return 8;
  // Less than 24 hours: priority 7
  if (timeLeft < 24 * 60 * 60 * 1000) return 7;
  // Less than 3 days: priority 6
  if (timeLeft < 3 * 24 * 60 * 60 * 1000) return 6;
  
  return task.priority || 5;
}

/**
 * Generate smart task suggestions based on patterns
 */
export function generateSmartSuggestions(
  tasks: Task[],
  currentDate: Date
): AISuggestion[] {
  const suggestions: AISuggestion[] = [];
  const currentHour = currentDate.getHours();
  
  // Morning routine suggestion (if no morning tasks)
  if (currentHour < 12) {
    const hasMorningTask = tasks.some(t => 
      t.description.toLowerCase().includes('morning') ||
      t.description.toLowerCase().includes('breakfast')
    );
    
    if (!hasMorningTask) {
      suggestions.push({
        description: 'Review today\'s goals and priorities',
        priority: 8,
        estimatedDuration: 10,
        deadline: new Date(currentDate.getTime() + 2 * 60 * 60 * 1000).toISOString(),
        reason: 'Morning planning helps set the day\'s direction',
        scheduledTime: '09:00'
      });
    }
  }
  
  // End of day review (if evening and no review task)
  if (currentHour >= 17 && currentHour < 21) {
    const hasReviewTask = tasks.some(t => 
      t.description.toLowerCase().includes('review') ||
      t.description.toLowerCase().includes('summary')
    );
    
    if (!hasReviewTask) {
      suggestions.push({
        description: 'End-of-day task review and planning for tomorrow',
        priority: 7,
        estimatedDuration: 15,
        deadline: new Date(currentDate.getTime() + 3 * 60 * 60 * 1000).toISOString(),
        reason: 'Daily reflection improves productivity',
        scheduledTime: '20:00'
      });
    }
  }
  
  // Check for stale tasks (older than 7 days)
  const staleTasks = tasks.filter(t => {
    if (t.status === 'completed') return false;
    const createdAt = typeof t.createdAt === 'number' ? t.createdAt : Date.now();
    const age = currentDate.getTime() - createdAt;
    return age > 7 * 24 * 60 * 60 * 1000; // 7 days
  });
  
  if (staleTasks.length > 0) {
    suggestions.push({
      description: `Review ${staleTasks.length} old task(s) - complete or postpone`,
      priority: 6,
      estimatedDuration: 5 * staleTasks.length,
      deadline: new Date(currentDate.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      reason: 'Stale tasks clutter your list and reduce focus',
      scheduledTime: 'flexible'
    });
  }
  
  return suggestions;
}
