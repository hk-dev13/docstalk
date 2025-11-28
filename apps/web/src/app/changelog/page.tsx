"use client";

import Link from "next/link";
import { GridPattern, Button, cn } from "@docstalk/ui";
import { motion } from "framer-motion";
import { Calendar, Tag, GitCommit } from "lucide-react";

export default function ChangelogPage() {
  const changes = [
    {
      version: "v0.2.0-beta.2",
      date: "November 29, 2024",
      title: "UI Polish & Pin Message",
      type: "improvement",
      items: [
        "Added 'Pin Message' feature for conversations",
        "Overhauled Sidebar UI with dynamic monochrome icons",
        "Improved Chat Interface readability (wider layout)",
        "Fixed Dropdown visibility issues (Modern Glass UI)",
        "Enhanced dark mode support for all UI elements",
      ],
    },
    {
      version: "v0.2.0-beta",
      date: "November 28, 2024",
      title: "Clarification Flow & UI Polish",
      type: "major",
      items: [
        "Added interactive clarification flow for ambiguous queries",
        "Implemented 'Liquid Text' effect in footer",
        "Improved mobile responsiveness for sidebar",
        "Added guest user limitations with sign-in prompt",
        "Fixed hydration errors in landing page",
      ],
    },
    {
      version: "v0.1.5",
      date: "November 25, 2024",
      title: "Monorepo Migration",
      type: "improvement",
      items: [
        "Migrated codebase to Turborepo structure",
        "Separated UI components into @docstalk/ui package",
        "Standardized Tailwind configuration across apps",
        "Improved build times and development workflow",
      ],
    },
    {
      version: "v0.1.0",
      date: "November 20, 2024",
      title: "Initial Beta Release",
      type: "major",
      items: [
        "Initial release of DocsTalk",
        "Support for Next.js, React, and Tailwind docs",
        "Basic chat interface with streaming responses",
        "Conversation history and persistence",
      ],
    },
  ];

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
          <div className="text-center mb-16 space-y-4">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-6xl font-bold tracking-tight"
            >
              Changelog
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-xl text-muted-foreground"
            >
              Follow our journey as we build the best documentation assistant.
            </motion.p>
          </div>

          <div className="space-y-12 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-linear-to-b before:from-transparent before:via-border before:to-transparent">
            {changes.map((change, idx) => (
              <motion.div
                key={change.version}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active"
              >
                {/* Icon */}
                <div className="flex items-center justify-center w-10 h-10 rounded-full border border-border bg-background shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                  <GitCommit className="w-5 h-5 text-primary" />
                </div>

                {/* Content */}
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-6 rounded-2xl border border-border/50 bg-secondary/10 hover:bg-secondary/20 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded-full text-xs font-medium border",
                          change.type === "major"
                            ? "bg-primary/10 text-primary border-primary/20"
                            : "bg-blue-500/10 text-blue-500 border-blue-500/20"
                        )}
                      >
                        {change.version}
                      </span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {change.date}
                      </span>
                    </div>
                  </div>

                  <h3 className="text-xl font-bold mb-3">{change.title}</h3>

                  <ul className="space-y-2">
                    {change.items.map((item, i) => (
                      <li
                        key={i}
                        className="text-muted-foreground text-sm flex items-start gap-2"
                      >
                        <span className="block w-1.5 h-1.5 rounded-full bg-muted-foreground/50 mt-1.5 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
