import { BrainCircuit } from 'lucide-react';

export function AppHeader() {
  return (
    <header className="border-b">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex items-center gap-3 h-16">
          <BrainCircuit className="h-7 w-7 text-primary" />
          <h1 className="text-2xl md:text-3xl font-bold font-headline text-foreground">
            FocusFlow
          </h1>
        </div>
      </div>
    </header>
  );
}
