import Link from "next/link";
import { GridPattern, Button, cn } from "@docstalk/ui";

export default function NotFound() {
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
        <h1 className="text-9xl font-bold tracking-tighter bg-clip-text text-transparent bg-linear-to-b from-foreground to-foreground/50">
          404
        </h1>
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">
            Page not found
          </h2>
          <p className="text-muted-foreground max-w-[500px] mx-auto">
            Sorry, we couldn't find the page you're looking for. It might have
            been moved or deleted.
          </p>
        </div>

        <div className="pt-4">
          <Link href="/">
            <Button size="lg" className="font-semibold">
              Go back home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
