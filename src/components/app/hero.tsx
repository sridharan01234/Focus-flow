
"use client";

import { Button } from "@/components/ui/button";

interface HeroProps {
  onSignIn: () => void;
  onSimpleSignIn: () => void;
  authInProgress: boolean;
}

export function Hero({ onSignIn, onSimpleSignIn, authInProgress }: HeroProps) {
  return (
    <div className="text-center">
      <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
        Welcome to FocusFlow
      </h1>
      <p className="mt-6 text-lg leading-8 text-gray-600">
        Your personal task manager to help you stay focused and productive.
      </p>
      <div className="mt-10 flex items-center justify-center gap-x-6">
        <Button onClick={onSimpleSignIn} disabled={authInProgress} size="lg">
          {authInProgress ? "Signing in..." : "Get started"}
        </Button>
        <Button
          onClick={onSignIn}
          disabled={authInProgress}
          variant="outline"
          size="lg"
        >
          Sign in with Google
        </Button>
      </div>
    </div>
  );
}
