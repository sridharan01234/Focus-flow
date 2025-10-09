export type TaskStatus = 'active' | 'completed' | 'follow-up' | 'missing';

export interface Task {
  id: string;
  description: string;
  status: TaskStatus;
  createdAt: number;
  priority?: number;
  scheduledTime?: string;
  reason?: string;
}
