'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

interface TaskFormProps {
  onAddTask: (description: string) => Promise<void>;
}

export function TaskForm({ onAddTask }: TaskFormProps) {
  const [description, setDescription] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (description.trim()) {
      setIsAdding(true);
      await onAddTask(description.trim());
      setDescription('');
      setIsAdding(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        <form onSubmit={handleSubmit} className="flex items-center gap-3">
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
            {isAdding ? 'Adding...' : 'Add Task'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
