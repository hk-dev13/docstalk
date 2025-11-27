import { AnimatedLogo } from "@docstalk/ui";

export default function Loading() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <div className="w-32 h-32">
        <AnimatedLogo variant="loading" className="w-full h-full" />
      </div>
    </div>
  );
}
