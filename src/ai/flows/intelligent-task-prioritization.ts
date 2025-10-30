'use server';

/**
 * @fileOverview An AI-powered task prioritization and scheduling flow.
 *
 * - prioritizeAndScheduleTasks - A function that prioritizes and schedules tasks based on urgency, context, and user behavior.
 * - TaskInput - The input type for the prioritizeAndScheduleTasks function.
 * - TaskOutput - The return type for the prioritizeAndScheduleTasks function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TaskInputSchema = z.object({
  tasks: z.array(
    z.object({
      id: z.string().describe('Unique identifier for the task.'),
      description: z.string().describe('Description of the task.'),
      dueDate: z.string().optional().describe('The due date of the task (ISO format).'),
      context: z.string().optional().describe('The context or category of the task (e.g., work, personal, errands).'),
      pastCompletionRate: z.number().optional().describe('The users past task completion rate as a number between 0 and 1.'),
    })
  ).describe('A list of tasks to prioritize and schedule.'),
  userBehaviorProfile: z.string().optional().describe('A description of the user behavior patterns and preferences.'),
  currentDateTime: z.string().describe('The current date and time in ISO format for reference.'),
});
export type TaskInput = z.infer<typeof TaskInputSchema>;

const TaskOutputSchema = z.object({
  prioritizedTasks: z.array(
    z.object({
      id: z.string().describe('Unique identifier for the task.'),
      priority: z.number().describe('The priority of the task (1 being highest).'),
      scheduledTime: z.string().optional().describe('The suggested schedule time for the task (ISO format).'),
      reason: z.string().describe('Explanation for the assigned priority and schedule.'),
    })
  ).describe('A list of tasks with assigned priorities and suggested schedule times.'),
});
export type TaskOutput = z.infer<typeof TaskOutputSchema>;

export async function prioritizeAndScheduleTasks(input: TaskInput): Promise<TaskOutput> {
  return prioritizeAndScheduleTasksFlow(input);
}

const prompt = ai.definePrompt({
  name: 'prioritizeAndScheduleTasksPrompt',
  input: {schema: TaskInputSchema},
  output: {schema: TaskOutputSchema},
  prompt: `You are an AI assistant designed to prioritize and schedule tasks for users with ADHD.

  Current Date and Time: {{currentDateTime}}
  
  IMPORTANT: Use the current date and time above as your reference point for all scheduling and prioritization decisions. When suggesting scheduled times, ensure they are in the future relative to this current time.

  Given the following tasks, context, and user behavior, determine the priority (1 being highest) and a suggested schedule time for each task. Explain your reasoning.

  Tasks:
  {{#each tasks}}
  - ID: {{this.id}}
    Description: {{this.description}}
    Due Date: {{this.dueDate}}
    Context: {{this.context}}
    Past Completion Rate: {{this.pastCompletionRate}}
  {{/each}}

  User Behavior Profile: {{userBehaviorProfile}}

  Prioritized Tasks (Output as JSON):
  {{#each prioritizedTasks}}
  - ID: {{this.id}}
    Priority: {{this.priority}}
    Scheduled Time: {{this.scheduledTime}}
    Reason: {{this.reason}}
  {{/each}}`,
});

const prioritizeAndScheduleTasksFlow = ai.defineFlow(
  {
    name: 'prioritizeAndScheduleTasksFlow',
    inputSchema: TaskInputSchema,
    outputSchema: TaskOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
