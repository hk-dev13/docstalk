import type { Metadata } from "next";
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { ModeToggle, GridPattern } from "@docstalk/ui";
import Link from "next/link";
import { ArrowLeft, User, Shield, CreditCard } from "lucide-react";

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
    <div className="min-h-screen bg-background relative overflow-hidden">
      <GridPattern
        className="absolute inset-0 z-0 opacity-30"
        width={30}
        height={30}
        strokeDasharray="4 2"
      />
      <div className="relative z-10 max-w-4xl mx-auto px-6 py-12">
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/chat"
            className="p-2 rounded-full hover:bg-secondary/50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
            <p className="text-muted-foreground">
              Manage your account preferences
            </p>
          </div>
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
    </div>
  );
}
