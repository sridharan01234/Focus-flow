'use client';

import { useState, useRef, useEffect } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Circle,
  Flag,
  MoreVertical,
  Pencil,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import type { Task, TaskStatus } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface TaskCardProps {
  task: Task;
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
  onDeleteTask: (id: string) => void;
}

const statusConfig: Record<
  TaskStatus,
  { icon: React.ElementType; label: string; color: string }
> = {
  active: { icon: Circle, label: 'Active', color: 'text-muted-foreground' },
  completed: { icon: CheckCircle2, label: 'Completed', color: 'text-green-500' },
  'follow-up': { icon: Flag, label: 'Follow-up', color: 'text-blue-500' },
  missing: { icon: AlertTriangle, label: 'Missing', color: 'text-yellow-500' },
};

export function TaskCard({ task, onUpdateTask, onDeleteTask }: TaskCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [description, setDescription] = useState(task.description);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    if (description.trim() && description.trim() !== task.description) {
      onUpdateTask(task.id, { description: description.trim() });
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setDescription(task.description);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') handleCancel();
  };

  const handleStatusChange = (status: TaskStatus) => {
    onUpdateTask(task.id, { status });
  };
  
  const StatusIcon = statusConfig[task.status].icon;
  const isCompleted = task.status === 'completed';

  return (
    <Card
      className={cn(
        'transition-all duration-300',
        isCompleted ? 'bg-muted/50' : 'bg-card'
      )}
    >
      <CardContent className="p-4 flex items-start gap-4">
        <Checkbox
          id={`task-${task.id}`}
          checked={isCompleted}
          onCheckedChange={checked => handleStatusChange(checked ? 'completed' : 'active')}
          className="mt-1"
          aria-label={`Mark task as ${isCompleted ? 'not completed' : 'completed'}`}
        />
        <div className="flex-1 space-y-2">
          {isEditing ? (
            <div className="flex items-center gap-2">
              <Input
                ref={inputRef}
                value={description}
                onChange={e => setDescription(e.target.value)}
                onKeyDown={handleKeyDown}
                className="h-8"
              />
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleSave}>
                <Save className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleCancel}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <label
              htmlFor={`task-${task.id}`}
              className={cn(
                'font-medium transition-all',
                isCompleted && 'line-through text-muted-foreground'
              )}
            >
              {task.description}
            </label>
          )}

          <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <div className="flex items-center gap-1.5">
                    <StatusIcon
                      className={cn('h-4 w-4', statusConfig[task.status].color)}
                    />
                    <span>{statusConfig[task.status].label}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Status: {statusConfig[task.status].label}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {task.priority && (
              <>
                <Separator orientation="vertical" className="h-4" />
                <Badge variant="secondary">Priority: {task.priority}</Badge>
              </>
            )}
            {task.scheduledTime && (
              <>
                <Separator orientation="vertical" className="h-4" />
                <Badge variant="outline">
                  {new Date(task.scheduledTime).toLocaleString()}
                </Badge>
              </>
            )}
            {task.deadline && (
              <>
                <Separator orientation="vertical" className="h-4" />
                <Badge 
                  variant={new Date(task.deadline) < new Date() && task.status !== 'completed' ? 'destructive' : 'outline'}
                  className={cn(
                    new Date(task.deadline) < new Date() && task.status !== 'completed' && 'animate-pulse'
                  )}
                >
                  ⏰ Due: {new Date(task.deadline).toLocaleString()}
                  {new Date(task.deadline) < new Date() && task.status !== 'completed' && (
                    <span className="ml-1 font-bold">OVERDUE</span>
                  )}
                </Badge>
              </>
            )}
            {task.estimatedDuration && (
              <>
                <Separator orientation="vertical" className="h-4" />
                <Badge variant="secondary">
                  ⏱️ {task.estimatedDuration} min
                </Badge>
              </>
            )}
            {task.aiSuggested && (
              <>
                <Separator orientation="vertical" className="h-4" />
                <Badge variant="default" className="bg-purple-600">
                  ✨ AI Suggested
                </Badge>
              </>
            )}
          </div>

          {task.reason && (
            <p className="text-xs text-muted-foreground italic border-l-2 border-accent pl-2">
              <strong>AI Suggestion:</strong> {task.reason}
            </p>
          )}
        </div>
        {!isEditing && (
          <div className="flex items-center">
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={() => setIsEditing(true)}
              disabled={isCompleted}
            >
              <Pencil className="h-4 w-4" />
              <span className="sr-only">Edit task</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                  <span className="sr-only">More options</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onSelect={() => handleStatusChange('follow-up')}
                  disabled={task.status === 'follow-up'}
                >
                  <Flag className="mr-2 h-4 w-4" />
                  <span>Mark for Follow-up</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => handleStatusChange('missing')}
                  disabled={task.status === 'missing'}
                >
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  <span>Mark as Missing</span>
                </DropdownMenuItem>
                {task.status !== 'active' && (
                  <DropdownMenuItem onSelect={() => handleStatusChange('active')}>
                    <Circle className="mr-2 h-4 w-4" />
                    <span>Mark as Active</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onSelect={() => onDeleteTask(task.id)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  <span>Delete Task</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
