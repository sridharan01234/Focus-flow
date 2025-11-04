'use client';

import { useState, useMemo, useTransition } from 'react';
import { BrainCircuit, Loader, Sparkles } from 'lucide-react';

import type { Task, TaskStatus } from '@/lib/types';
import { prioritizeAndScheduleTasks } from '@/ai/flows/intelligent-task-prioritization';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TaskCard } from '@/components/app/task-card';

interface TaskListProps {
  tasks: Task[];
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
  onDeleteTask: (id: string) => void;
  onSetTasks: (tasks: Task[]) => void;
  loading: boolean;
}

type FilterValue = TaskStatus | 'all';

export function TaskList({ tasks, onUpdateTask, onDeleteTask, onSetTasks, loading }: TaskListProps) {
  const [filter, setFilter] = useState<FilterValue>('all');
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handlePrioritize = () => {
    startTransition(async () => {
      const tasksToPrioritize = tasks.filter(t => t.status !== 'completed');
      if (tasksToPrioritize.length === 0) {
        toast({
          title: 'No Active Tasks',
          description: 'There are no active tasks to prioritize.',
        });
        return;
      }

      try {
        const taskInput = {
          tasks: tasksToPrioritize.map(({ id, description }) => ({
            id,
            description,
          })),
          userBehaviorProfile: 'User tends to procrastinate on complex tasks. Prefers to tackle smaller items in the morning.',
          currentDateTime: new Date().toISOString(),
        };
        const result = await prioritizeAndScheduleTasks(taskInput);

        if (result && result.prioritizedTasks) {
          const prioritizedIds = new Set(result.prioritizedTasks.map(pt => pt.id));
          const updatedTasks = tasks.map(task => {
            const aiTask = result.prioritizedTasks.find(p => p.id === task.id);
            return aiTask ? { ...task, ...aiTask } : task;
          });

          // Reset priority for tasks not in the AI response
          const finalTasks = updatedTasks.map(task => 
            !prioritizedIds.has(task.id) && task.status !== 'completed'
              ? { ...task, priority: undefined, scheduledTime: undefined, reason: undefined }
              : task
          );

          onSetTasks(finalTasks);
          toast({
            title: 'Tasks Prioritized',
            description: 'Your tasks have been intelligently scheduled.',
          });
        }
      } catch (error) {
        console.error('AI Prioritization Error:', error);
        toast({
          variant: 'destructive',
          title: 'AI Error',
          description: 'Could not prioritize tasks at this time.',
        });
      }
    });
  };

  const filteredTasks = useMemo(() => {
    if (filter === 'all') {
      return tasks.filter(task => task.status !== 'completed');
    }
    return tasks.filter(task => task.status === filter);
  }, [tasks, filter]);

  const sortedTasks = useMemo(() => {
    const tasksToSort = [...filteredTasks];
    
    // Convert Firestore Timestamp to number if needed
    const getCreatedAt = (task: Task) => {
        if (task.createdAt && typeof task.createdAt === 'object' && 'seconds' in task.createdAt) {
            // It's a Firestore Timestamp
            return (task.createdAt as any).toMillis();
        }
        return task.createdAt as number;
    };

    return tasksToSort.sort((a, b) => {
      if (a.priority && b.priority) {
        return a.priority - b.priority;
      }
      if (a.priority) return -1;
      if (b.priority) return 1;

      const aCreatedAt = getCreatedAt(a);
      const bCreatedAt = getCreatedAt(b);

      return bCreatedAt - aCreatedAt;
    });
  }, [filteredTasks]);

  if (loading) {
    return (
      <div className="flex justify-center items-center p-12">
        <Loader className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <Tabs value={filter} onValueChange={value => setFilter(value as FilterValue)}>
          <TabsList>
            <TabsTrigger value="all">Active</TabsTrigger>
            <TabsTrigger value="follow-up">Follow-up</TabsTrigger>
            <TabsTrigger value="missed">Missed</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button onClick={handlePrioritize} disabled={isPending}>
          {isPending ? (
            <Loader className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="mr-2 h-4 w-4" />
          )}
          Prioritize with AI
        </Button>
      </div>

      <div className="space-y-3">
        {sortedTasks.length > 0 ? (
          sortedTasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onUpdateTask={onUpdateTask}
              onDeleteTask={onDeleteTask}
            />
          ))
        ) : (
          <div className="text-center py-12 px-6 bg-card rounded-lg border border-dashed">
            <BrainCircuit className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold text-foreground">No tasks here</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {filter === 'all' ? 'Add a task to get started!' : `You have no ${filter} tasks.`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
