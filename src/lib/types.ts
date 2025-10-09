import { FieldValue } from 'firebase/firestore';

export type TaskStatus = 'active' | 'completed' | 'follow-up' | 'missing';

export interface Task {
  id: string;
  description: string;
  status: TaskStatus;
  createdAt: FieldValue | number;
  priority?: number;
  scheduledTime?: string;
  reason?: string;
  userId: string;
}
