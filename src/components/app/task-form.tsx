'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

interface TaskFormProps {
  onAddTask: (description: string) => void;
}

export function TaskForm({ onAddTask }: TaskFormProps) {
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (description.trim()) {
      onAddTask(description.trim());
      setDescription('');
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
          />
          <Button type="submit" aria-label="Add task">
            <Plus className="h-4 w-4 mr-2" />
            Add Task
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
