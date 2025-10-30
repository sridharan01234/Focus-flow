import { NextRequest, NextResponse } from 'next/server';
import { prioritizeAndScheduleTasks } from '@/ai/flows/intelligent-task-prioritization';

export async function POST(request: NextRequest) {
  try {
    const { tasks, currentDate } = await request.json();
    
    const currentDateTime = new Date(currentDate);
    
    // Generate AI-powered suggestions
    const prompt = `
Current Date and Time: ${currentDateTime.toLocaleString('en-US', { 
  weekday: 'long', 
  year: 'numeric', 
  month: 'long', 
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
})}

Existing Incomplete Tasks:
${tasks.map((t: any, i: number) => `${i + 1}. ${t.description} (Status: ${t.status}, ${t.deadline ? `Deadline: ${new Date(t.deadline).toLocaleString()}` : 'No deadline'})`).join('\n')}

Based on the current time and existing tasks, suggest 3-5 new tasks that would be helpful. For each suggestion, provide:
1. A clear, actionable description
2. Priority (1-10, where 10 is most urgent)
3. Estimated duration in minutes
4. A reasonable deadline (as ISO date string)
5. A brief reason why this task is suggested
6. Suggested time to do it (HH:MM or "flexible")

Consider:
- Time of day (morning, afternoon, evening routines)
- Overdue tasks that need attention
- Balance between urgent and important
- ADHD-friendly task breakdown (smaller, manageable chunks)
- Time pressure based on deadlines

Format your response as a JSON array of objects with fields: description, priority, estimatedDuration, deadline, reason, scheduledTime
`;

    // Call Genkit flow
    const result = await prioritizeAndScheduleTasks({
      tasks: tasks.map((t: any, idx: number) => ({
        id: `task-${idx}`,
        description: t.description,
        dueDate: t.deadline || undefined,
        context: t.status
      })),
      currentDateTime: currentDateTime.toISOString()
    });

    // Parse suggestions from AI response
    const suggestions = parseSuggestionsFromAI(result.prioritizedTasks, currentDateTime);
    
    return NextResponse.json({ 
      success: true, 
      suggestions,
      currentDate: currentDateTime.toISOString()
    });
  } catch (error: any) {
    console.error('AI suggestions error:', error);
    
    // Fallback to basic suggestions
    const fallbackSuggestions = generateFallbackSuggestions(new Date());
    
    return NextResponse.json({ 
      success: true, 
      suggestions: fallbackSuggestions,
      fallback: true
    });
  }
}

function parseSuggestionsFromAI(aiTasks: any[], currentDate: Date): any[] {
  // Try to extract new suggestions from AI response
  const suggestions: any[] = [];
  
  // Add time-based suggestions
  const hour = currentDate.getHours();
  
  if (hour < 10) {
    suggestions.push({
      description: 'Plan and prioritize today\'s top 3 tasks',
      priority: 9,
      estimatedDuration: 10,
      deadline: new Date(currentDate.getTime() + 2 * 60 * 60 * 1000).toISOString(),
      reason: 'Morning planning sets you up for a productive day',
      scheduledTime: '09:00'
    });
  }
  
  if (hour >= 12 && hour < 14) {
    suggestions.push({
      description: 'Quick midday review - what\'s working, what needs adjustment?',
      priority: 6,
      estimatedDuration: 5,
      deadline: new Date(currentDate.getTime() + 1 * 60 * 60 * 1000).toISOString(),
      reason: 'Midday check-ins help maintain focus',
      scheduledTime: '13:00'
    });
  }
  
  if (hour >= 17 && hour < 21) {
    suggestions.push({
      description: 'End-of-day reflection: What did I accomplish today?',
      priority: 7,
      estimatedDuration: 10,
      deadline: new Date(currentDate.getTime() + 3 * 60 * 60 * 1000).toISOString(),
      reason: 'Evening reflection helps you recognize progress',
      scheduledTime: '20:00'
    });
  }
  
  return suggestions.slice(0, 5);
}

function generateFallbackSuggestions(currentDate: Date) {
  const hour = currentDate.getHours();
  const suggestions: any[] = [];
  
  suggestions.push({
    description: 'Take a 5-minute break and stretch',
    priority: 5,
    estimatedDuration: 5,
    deadline: new Date(currentDate.getTime() + 30 * 60 * 1000).toISOString(),
    reason: 'Regular breaks improve focus and prevent burnout',
    scheduledTime: 'flexible'
  });
  
  if (hour < 12) {
    suggestions.push({
      description: 'Review and organize your task list for today',
      priority: 8,
      estimatedDuration: 10,
      deadline: new Date(currentDate.getTime() + 1 * 60 * 60 * 1000).toISOString(),
      reason: 'Morning organization helps prioritize effectively',
      scheduledTime: '09:30'
    });
  }
  
  suggestions.push({
    description: 'Drink a glass of water',
    priority: 4,
    estimatedDuration: 2,
    deadline: new Date(currentDate.getTime() + 15 * 60 * 1000).toISOString(),
    reason: 'Staying hydrated improves concentration',
    scheduledTime: 'now'
  });
  
  return suggestions;
}
