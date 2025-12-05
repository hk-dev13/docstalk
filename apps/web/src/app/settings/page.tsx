import type { Metadata } from "next";
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { ModeToggle, GridPattern, Button, cn } from "@docstalk/ui";
import Link from "next/link";
import { User, Shield, CreditCard } from "lucide-react";

export const metadata: Metadata = {
  title: "Settings",
};

export default async function SettingsPage() {
  const { userId } = await auth();
  const user = await currentUser();

  if (!userId || !user) {
    redirect("/sign-in");
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col">
      <GridPattern
        width={50}
        height={50}
        x={-1}
        y={-1}
        className={cn(
          "mask-[linear-gradient(to_bottom_right,white,transparent,transparent)]",
          "opacity-50"
        )}
      />

      {/* Header */}
      <header className="fixed top-0 w-full z-50 glass-header px-6 py-4 border-b border-border/50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl">
            DocsTalk
          </Link>
          <Link href="/chat">
            <Button variant="ghost">Back to Chat</Button>
          </Link>
        </div>
      </header>

      <main className="flex-1 pt-32 pb-20 px-4 relative z-10">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-3xl font-bold tracking-tight mb-2">Settings</h1>
            <p className="text-muted-foreground">
              Manage your account preferences
            </p>
          </div>

          <div className="grid gap-6">
            {/* Profile Section */}
            <div className="p-6 rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-indigo-500" />
                Profile
              </h2>
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center overflow-hidden">
                  <img
                    src={user.imageUrl}
                    alt={user.firstName || "User"}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div>
                  <h3 className="font-medium text-lg">
                    {user.firstName} {user.lastName}
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    {user.primaryEmailAddress?.emailAddress}
                  </p>
                </div>
              </div>
            </div>

            {/* Appearance Section */}
            <div className="p-6 rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold mb-1 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-purple-500" />
                  Appearance
                </h2>
                <p className="text-muted-foreground text-sm">
                  Customize how DocsTalk looks on your device
                </p>
              </div>
              <ModeToggle />
            </div>

            {/* Plan Section (Placeholder) */}
            <div className="p-6 rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm opacity-60">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-semibold mb-1 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-green-500" />
                    Subscription Plan
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    Manage your billing and subscription
                  </p>
                  <div className="mt-4 inline-block px-3 py-1 rounded-full bg-secondary text-xs font-medium border border-border">
                    Free Plan
                  </div>
                </div>
                <button
                  disabled
                  className="px-4 py-2 rounded-lg bg-primary/20 text-primary text-sm font-medium cursor-not-allowed"
                >
                  Manage Plan (Coming Soon)
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
