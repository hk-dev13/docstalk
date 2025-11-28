"use client";

import { useEffect } from "react";
import { GridPattern, Button, cn } from "@docstalk/ui";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground relative overflow-hidden">
      <GridPattern
        width={50}
        height={50}
        x={-1}
        y={-1}
        className={cn(
          "mask-[radial-gradient(600px_circle_at_center,white,transparent)]",
          "opacity-50"
        )}
      />

      <div className="relative z-10 text-center space-y-6 px-4">
        <h1 className="text-4xl font-bold tracking-tighter">
          Something went wrong!
        </h1>
        <p className="text-muted-foreground max-w-[500px] mx-auto">
          We apologize for the inconvenience. An unexpected error has occurred.
        </p>

        <div className="flex gap-4 justify-center pt-4">
          <Button
            onClick={() => reset()}
            variant="default"
            size="lg"
            className="font-semibold"
          >
            Try again
          </Button>
          <Button
            onClick={() => (window.location.href = "/")}
            variant="outline"
            size="lg"
            className="font-semibold"
          >
            Go Home
          </Button>
        </div>
      </div>
    </div>
  );
}
