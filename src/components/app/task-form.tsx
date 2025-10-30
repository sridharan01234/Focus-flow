'use client';

import { useState } from 'react';
import { Plus, Calendar, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

interface TaskFormProps {
  onAddTask: (description: string, deadline?: string, estimatedDuration?: number) => Promise<void>;
}

export function TaskForm({ onAddTask }: TaskFormProps) {
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [estimatedDuration, setEstimatedDuration] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (description.trim()) {
      setIsAdding(true);
      await onAddTask(
        description.trim(),
        deadline || undefined,
        estimatedDuration ? parseInt(estimatedDuration) : undefined
      );
      setDescription('');
      setDeadline('');
      setEstimatedDuration('');
      setShowAdvanced(false);
      setIsAdding(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex items-center gap-3">
            <Input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Add a new task or reminder..."
              className="flex-1"
              aria-label="New task description"
              disabled={isAdding}
            />
            <Button type="submit" aria-label="Add task" disabled={isAdding || !description.trim()}>
              <Plus className="h-4 w-4 mr-2" />
              {isAdding ? 'Adding...' : 'Add'}
            </Button>
          </div>
          
          {/* Advanced Options Toggle */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {showAdvanced ? '− Less options' : '+ Add deadline & duration'}
          </button>

          {showAdvanced && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t">
              <div className="space-y-1.5">
                <Label htmlFor="deadline" className="text-xs flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Deadline (optional)
                </Label>
                <Input
                  id="deadline"
                  type="datetime-local"
                  value={deadline}
                  onChange={e => setDeadline(e.target.value)}
                  disabled={isAdding}
                  className="text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="duration" className="text-xs flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Estimated Duration (minutes)
                </Label>
                <Input
                  id="duration"
                  type="number"
                  min="1"
                  value={estimatedDuration}
                  onChange={e => setEstimatedDuration(e.target.value)}
                  placeholder="e.g., 30"
                  disabled={isAdding}
                  className="text-sm"
                />
              </div>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
