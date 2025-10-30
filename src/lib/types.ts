import { FieldValue } from 'firebase/firestore';

export type TaskStatus = 'active' | 'completed' | 'follow-up' | 'missing';

export interface Task {
  id: string;
  description: string;
  status: TaskStatus;
  createdAt: FieldValue | number;
  priority?: number;
  scheduledTime?: string;
  deadline?: string; // ISO date string
  estimatedDuration?: number; // minutes
  reason?: string;
  userId: string;
  aiSuggested?: boolean;
  aiPriority?: number;
  lastMissingNotification?: number; // timestamp
}
