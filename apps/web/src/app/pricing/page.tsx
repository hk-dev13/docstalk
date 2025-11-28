"use client";

import Link from "next/link";
import { CheckCircle2, X } from "lucide-react";
import { GridPattern, Button, cn } from "@docstalk/ui";
import { motion } from "framer-motion";

export default function PricingPage() {
  const plans = [
    {
      name: "Hobby",
      price: "$0",
      period: "/month",
      description: "Perfect for exploring and personal projects.",
      features: [
        "Unlimited searches (Beta)",
        "Access to all documentation",
        "Basic AI models",
        "Community support",
      ],
      cta: "Get Started",
      href: "/chat",
      popular: false,
      disabled: false,
    },
    {
      name: "Pro",
      price: "$19",
      period: "/month",
      description: "For professional developers who need more power.",
      features: [
        "Everything in Hobby",
        "Advanced AI models (GPT-4, Claude 3.5)",
        "Faster response times",
        "Priority support",
        "Early access to new features",
      ],
      cta: "Coming Soon",
      href: "#",
      popular: true,
      disabled: true,
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
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 space-y-4">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-6xl font-bold tracking-tight"
            >
              Simple, transparent pricing
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-xl text-muted-foreground max-w-2xl mx-auto"
            >
              Currently in{" "}
              <span className="text-primary font-semibold">Free Beta</span>.
              Premium plans will be introduced later as we add more advanced
              features.
            </motion.p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {plans.map((plan, idx) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + idx * 0.1 }}
                className={cn(
                  "relative p-8 rounded-3xl border bg-background/50 backdrop-blur-sm flex flex-col",
                  plan.popular
                    ? "border-primary shadow-2xl shadow-primary/10"
                    : "border-border/50 shadow-lg"
                )}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary text-primary-foreground text-sm font-medium rounded-full">
                    Most Popular
                  </div>
                )}

                <div className="mb-8">
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <p className="text-muted-foreground">{plan.description}</p>
                </div>

                <div className="mb-8">
                  <span className="text-5xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>

                <ul className="space-y-4 mb-8 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={plan.href}
                  className={cn(plan.disabled && "pointer-events-none")}
                >
                  <Button
                    className="w-full h-12 text-lg font-semibold"
                    variant={plan.popular ? "default" : "outline"}
                    disabled={plan.disabled}
                  >
                    {plan.cta}
                  </Button>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
