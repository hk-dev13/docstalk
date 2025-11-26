"use client";

import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  MessageSquare,
  BookOpen,
  Zap,
  CheckCircle2,
  Terminal,
  Github,
  HelpCircle,
} from "lucide-react";
import { Typewriter } from "@/components/typewriter";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";

// Teks stage tetap di luar component - semua dibuat pendek agar ukuran konsisten
const textStages = [
  "DocsTalk",
  "BuiltWith",
  "❤️",
  "ForDevs",
  "WhoHate",
  "Reading",
  "Manuals",
  "Docs",
  "well",
  "are you",
  "ready?",
  "klik me",
];

export default function HomePage() {
  const [currentStage, setCurrentStage] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Wheel event handler for scroll locking
  useEffect(() => {
    let lastChangeTime = 0;
    const throttleMs = 300; // Wait 300ms between stage changes

    const handleWheel = (e: WheelEvent) => {
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();

      // Check if footer section is in the lock zone
      // When rect.top is close to 0 or negative, footer is "stuck" at top (in center view)
      const isInLockZone = rect.top <= 100 && rect.bottom > 100;

      if (!isInLockZone) {
        return; // Not in lock zone, allow normal scroll
      }

      // Throttle: prevent too rapid changes
      const now = Date.now();
      if (now - lastChangeTime < throttleMs) {
        e.preventDefault(); // Still lock scroll even when throttled
        return;
      }

      // --- SCROLL DOWN (next stage) ---
      if (e.deltaY > 0) {
        if (currentStage < textStages.length - 1) {
          e.preventDefault(); // LOCK scroll
          setCurrentStage((prev) => prev + 1);
          lastChangeTime = now;
        }
        // If already at last stage, allow scrolling to continue past footer
      }
      // --- SCROLL UP (previous stage) ---
      else if (e.deltaY < 0) {
        if (currentStage > 0) {
          e.preventDefault(); // LOCK scroll
          setCurrentStage((prev) => prev - 1);
          lastChangeTime = now;
        }
        // If at first stage, allow scrolling up to leave footer
      }
    };

    // Use passive: false to allow preventDefault
    window.addEventListener("wheel", handleWheel, { passive: false });

    return () => window.removeEventListener("wheel", handleWheel);
  }, [currentStage]); // Include currentStage in deps

  const supportedDocs = [
    {
      name: "React",
      icon: "/assets/support_docs/icons8-react.svg",
      url: "https://react.dev/learn",
    },
    {
      name: "Next.js",
      icon: "/assets/support_docs/icons8-nextjs.svg",
      url: "https://nextjs.org/docs",
    },
    {
      name: "Node.js",
      icon: "/assets/support_docs/icons8-nodejs.svg",
      url: "https://nodejs.org/docs/latest/api/",
    },
    {
      name: "TypeScript",
      icon: "/assets/support_docs/icons8-typescript.svg",
      url: "https://www.typescriptlang.org/docs",
    },
    {
      name: "Tailwind",
      icon: "/assets/support_docs/icons8-tailwind-css.svg",
      url: "https://tailwindcss.com/docs",
    },
    {
      name: "Prisma",
      icon: "/assets/support_docs/icons8-prisma-orm.svg",
      url: "https://www.prisma.io/docs",
    },
    {
      name: "Express",
      icon: "/assets/support_docs/icons8-express-js.svg",
      url: "https://expressjs.com/en/starter/installing.html",
    },
    {
      name: "Python",
      icon: "/assets/support_docs/icons8-python.svg",
      url: "https://docs.python.org/",
    },
    {
      name: "Rust",
      icon: "/assets/support_docs/icons8-rust-programming-language.svg",
      url: "https://www.rust-lang.org/learn ",
    },
    {
      name: "Go",
      icon: "/assets/support_docs/icons8-go.svg",
      url: "https://go.dev/doc",
    },
  ];

  const faqs = [
    {
      question: "Does DocsTalk use OpenAI?",
      answer:
        "DocsTalk uses a combination of advanced AI models (including Gemini and open source models) optimized for technical understanding and code generation.",
    },
    {
      question: "Is the data always up to date?",
      answer:
        "Yes, we regularly scrape and index official documentation to ensure answers are relevant to the latest versions.",
    },
    {
      question: "Can DocsTalk be used offline?",
      answer:
        "Currently, DocsTalk requires an internet connection to access our AI models and vector database.",
    },
    {
      question: "How much does it cost?",
      answer:
        "DocsTalk is currently FREE during the beta period. We will introduce premium plans in the future.",
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
      },
    },
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground overflow-x-hidden">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 glass-header px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative w-8 h-8">
              <Image
                src="/assets/logo/logo_docstalk.svg"
                alt="DocsTalk Logo"
                fill
                className="object-contain"
              />
            </div>
            <span className="font-bold text-xl tracking-tight">DocsTalk</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="https://github.com/husni/docstalk"
              target="_blank"
              className="hidden sm:flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <Github className="w-4 h-4" />
              GitHub
            </Link>
            <Link href="/chat">
              <button className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors">
                Start Chatting
              </button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 relative overflow-hidden">
        {/* Animated Mesh Gradient Background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-500/20 rounded-full blur-[100px] animate-pulse" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/20 rounded-full blur-[100px] animate-pulse delay-1000" />
          <div className="absolute top-[20%] right-[20%] w-[30%] h-[30%] bg-indigo-500/20 rounded-full blur-[100px] animate-pulse delay-2000" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-4xl mx-auto text-center space-y-8 relative z-10"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/50 border border-border/50 text-xs font-medium text-muted-foreground mb-4">
            <Zap className="w-3 h-3 text-yellow-500" />
            <span>Now supporting Next.js 15 & React 19</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-tight">
            Smart Documentation <br />
            <span className="gradient-text">Assistant for Developers</span>
          </h1>

          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Ask anything about React, Next.js, TypeScript, or other frameworks.
            Answered with official sources, accurate, and complete with code
            examples.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
            <Link href="/chat">
              <button className="w-full sm:w-auto px-8 py-4 bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-bold text-lg shadow-lg shadow-indigo-500/25 transition-all hover:scale-105 flex items-center justify-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Start Chatting
              </button>
            </Link>
            <Link href="#supported-docs">
              <button className="w-full sm:w-auto px-8 py-4 bg-secondary/50 hover:bg-secondary text-foreground border border-border/50 hover:border-border rounded-xl font-semibold text-lg transition-all flex items-center justify-center gap-2 backdrop-blur-sm">
                <BookOpen className="w-5 h-5" />
                View Supported Docs
              </button>
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Supported Docs Section */}
      <section
        id="supported-docs"
        className="py-20 px-4 bg-secondary/20 border-y border-border/50"
      >
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold mb-4">
              Supported Documentations
            </h2>
            <p className="text-muted-foreground">
              We index the latest documentation from your favorite technologies.
            </p>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 justify-center"
          >
            {supportedDocs.map((doc, idx) => (
              <motion.div key={idx} variants={itemVariants}>
                <Link href={doc.url} target="_blank" className="block h-full">
                  <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-background border border-border/50 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all group cursor-pointer h-full">
                    <div className="relative w-12 h-12 mb-3 group-hover:scale-110 transition-transform duration-300">
                      <Image
                        src={doc.icon}
                        alt={`${doc.name} icon`}
                        fill
                        className="object-contain"
                      />
                    </div>
                    <span className="font-medium text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                      {doc.name}
                    </span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="py-24 px-4 relative">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl font-bold mb-4">How it Works</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              The technology behind DocsTalk is designed to provide accurate and
              trustworthy answers.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connecting Line (Desktop) */}
            <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-0.5 bg-linear-to-r from-transparent via-border to-transparent border-t border-dashed border-border/50 z-0" />

            {[
              {
                icon: <Terminal className="w-8 h-8 text-blue-500" />,
                title: "1. Scraping & Parsing",
                desc: "We scrape data directly from official documentation regularly to ensure freshness.",
              },
              {
                icon: <Zap className="w-8 h-8 text-purple-500" />,
                title: "2. Embedding & Indexing",
                desc: "Data is converted into vectors and indexed so AI can search for meaning quickly.",
              },
              {
                icon: <MessageSquare className="w-8 h-8 text-indigo-500" />,
                title: "3. Smart Retrieval",
                desc: "When you ask, we retrieve relevant context and AI constructs a precise answer.",
              },
            ].map((step, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: idx * 0.2 }}
                className="relative z-10 flex flex-col items-center text-center"
              >
                <div className="w-24 h-24 rounded-full bg-background border-4 border-secondary flex items-center justify-center mb-6 shadow-xl">
                  {step.icon}
                </div>
                <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                <p className="text-muted-foreground leading-relaxed px-4">
                  {step.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Why DocsTalk Section */}
      <section className="py-24 px-4 bg-linear-to-br from-indigo-950/20 to-purple-950/20 border-y border-border/50">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="space-y-8"
            >
              <h2 className="text-4xl font-bold">Why DocsTalk?</h2>
              <p className="text-lg text-muted-foreground">
                Stop wasting time scrolling through long documentation. Get the
                instant answers you need to get back to coding.
              </p>

              <ul className="space-y-4">
                {[
                  "Faster than reading manual documentation",
                  "Answers 100% based on official sources",
                  "Provides relevant code examples",
                  "Can compare APIs or libraries",
                  "Suitable for beginners to experts",
                ].map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-green-500 shrink-0" />
                    <span className="font-medium">{item}</span>
                  </li>
                ))}
              </ul>

              <Link href="/chat">
                <button className="mt-4 px-8 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors inline-flex items-center gap-2">
                  Try Now for Free <ArrowRight className="w-4 h-4" />
                </button>
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative"
            >
              <div className="absolute inset-0 bg-linear-to-r from-indigo-500 to-purple-600 rounded-2xl blur-2xl opacity-20" />
              <div className="relative bg-background/80 backdrop-blur-xl border border-border rounded-2xl p-6 shadow-2xl">
                <div className="flex items-center gap-2 mb-4 border-b border-border/50 pb-4">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="ml-2 text-xs text-muted-foreground font-mono">
                    docstalk-demo.tsx
                  </span>
                </div>
                <div className="space-y-4 font-mono text-sm">
                  <div className="flex gap-4">
                    <span className="text-blue-500">User:</span>
                    <span className="text-foreground">
                      How to fetch data in Next.js 15?
                    </span>
                  </div>
                  <div className="flex gap-4">
                    <span className="text-purple-500">AI:</span>
                    <div className="text-muted-foreground">
                      <p className="mb-2">
                        <Typewriter
                          text="In Next.js 15, you can use fetch directly in Server Components."
                          speed={30}
                          delay={500}
                        />
                      </p>
                      <div className="bg-secondary/50 p-3 rounded-lg border border-border/50 text-xs opacity-0 animate-in fade-in duration-500 delay-2500 fill-mode-forwards">
                        <span className="text-blue-400">async</span>{" "}
                        <span className="text-purple-400">function</span>{" "}
                        <span className="text-yellow-400">Page</span>() {"{"}
                        <br />
                        &nbsp;&nbsp;
                        <span className="text-blue-400">const</span> data ={" "}
                        <span className="text-blue-400">await</span>{" "}
                        <span className="text-yellow-400">fetch</span>('...');
                        <br />
                        &nbsp;&nbsp;
                        <span className="text-purple-400">return</span> &lt;
                        <span className="text-red-400">div</span>&gt;...&lt;/
                        <span className="text-red-400">div</span>&gt;;
                        <br />
                        {"}"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24 px-4">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold mb-4">
              Frequently Asked Questions
            </h2>
          </motion.div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: idx * 0.1 }}
                className="p-6 rounded-xl bg-secondary/20 border border-border/50 hover:bg-secondary/40 transition-colors"
              >
                <h3 className="font-bold text-lg mb-2 flex items-start gap-3">
                  <HelpCircle className="w-5 h-5 text-primary shrink-0 mt-1" />
                  {faq.question}
                </h3>
                <p className="text-muted-foreground pl-8 leading-relaxed">
                  {faq.answer}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Premium Footer */}
      <footer className="bg-background text-foreground py-20 px-4 border-t border-border/50 overflow-hidden relative">
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid md:grid-cols-4 gap-12 mb-20">
            <div className="col-span-2 space-y-6">
              <div className="flex items-center gap-2">
                <div className="relative w-8 h-8">
                  <Image
                    src="/assets/logo/logo_docstalk.svg"
                    alt="DocsTalk Logo"
                    fill
                    className="object-contain"
                  />
                </div>
                <span className="font-bold text-xl tracking-tight">
                  DocsTalk
                </span>
              </div>
              <p className="text-muted-foreground max-w-sm text-lg leading-relaxed">
                Experience the future of documentation. <br />
                Built for developers who move fast.
              </p>
            </div>

            <div>
              <h4 className="font-bold mb-6 text-lg">Product</h4>
              <ul className="space-y-4 text-muted-foreground">
                <li>
                  <Link
                    href="/chat"
                    className="hover:text-primary transition-colors"
                  >
                    Chat Interface
                  </Link>
                </li>
                <li>
                  <Link
                    href="#supported-docs"
                    className="hover:text-primary transition-colors"
                  >
                    Supported Docs
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="hover:text-primary transition-colors"
                  >
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="hover:text-primary transition-colors"
                  >
                    Changelog
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-6 text-lg">Connect</h4>
              <ul className="space-y-4 text-muted-foreground">
                <li>
                  <Link
                    href="https://github.com/hk-dev13/docstalk.git"
                    target="_blank"
                    className="hover:text-primary transition-colors"
                  >
                    GitHub
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="hover:text-primary transition-colors"
                  >
                    Discord Community
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="hover:text-primary transition-colors"
                  >
                    Twitter / X
                  </Link>
                </li>
                <li>
                  <Link
                    href="mailto:hello@envoyou.com"
                    className="hover:text-primary transition-colors"
                  >
                    Contact Us
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* 🎬 CINEMATIC FOOTER SECTION - SCROLL LOCKED */}
        <div
          ref={containerRef}
          className="relative w-full min-h-screen flex items-center justify-center"
        >
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="w-full relative py-20"
          >
            {/* Content - Centered */}
            <div className="relative z-10 flex justify-center items-center px-4 overflow-visible">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStage}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.5, ease: "easeInOut" }}
                  className="w-full overflow-visible"
                >
                  {currentStage === textStages.length - 1 ? (
                    // Last stage: clickable link
                    <Link href="/chat" className="block">
                      <h1 className="text-[20vw] md:text-[18vw] font-bold leading-[1.2] tracking-tighter text-center bg-linear-to-b from-foreground to-foreground/50 bg-clip-text text-transparent select-none py-8 transition-all hover:scale-110 hover:from-primary hover:to-primary/50 cursor-pointer">
                        {textStages[currentStage]}
                      </h1>
                    </Link>
                  ) : (
                    // Normal stages: plain text
                    <h1 className="text-[20vw] md:text-[18vw] font-bold leading-[1.2] tracking-tighter text-center bg-linear-to-b from-foreground to-foreground/50 bg-clip-text text-transparent select-none py-8">
                      {textStages[currentStage]}
                    </h1>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Optional: Visual hint that user can scroll */}
            {currentStage < textStages.length - 1 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, y: [0, 10, 0] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="absolute bottom-10 left-1/2 -translate-x-1/2 text-muted-foreground text-sm"
              >
                Scroll to filling lucky
              </motion.div>
            )}
          </motion.div>
        </div>

        {/* Bottom copyright section */}
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 text-sm text-muted-foreground pt-10">
            <p>&copy; 2025 DocsTalk. All rights reserved.</p>
            <div className="flex gap-8">
              <Link
                href="#"
                className="hover:text-foreground transition-colors"
              >
                Privacy Policy
              </Link>
              <Link
                href="#"
                className="hover:text-foreground transition-colors"
              >
                Terms of Service
              </Link>
              <Link
                href="#"
                className="hover:text-foreground transition-colors"
              >
                Cookie Policy
              </Link>
            </div>
          </div>
        </div>

        {/* Enhanced Background Glow */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[80%] h-[500px] bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none" />

        {/* Additional atmospheric effects */}
        <div className="absolute top-1/2 left-0 w-[300px] h-[300px] bg-purple-500/5 blur-[100px] rounded-full pointer-events-none animate-pulse delay-1000" />
        <div className="absolute top-1/2 right-0 w-[300px] h-[300px] bg-blue-500/5 blur-[100px] rounded-full pointer-events-none animate-pulse delay-2000" />
      </footer>
    </div>
  );
}
