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
import {
  Marquee,
  GridPattern,
  BackToTop,
  cn,
  Typewriter,
  LiquidText,
  AnimatedLogo,
} from "@docstalk/ui";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { useState, useEffect, useRef } from "react";

export default function HomePage() {
  const [currentStage, setCurrentStage] = useState(0);
  const textStages = [
    "DocsTalk",
    "FACT-LENS",
    "System",
    "Built With",
    "❤️",
    "For Devs",
    "Who Hate",
    "Reading",
    "Manuals",
    "Documents",
    "so",
    "are you",
    "ready?",
    "klik me",
  ];
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollAccumulator = useRef(0);
  const isLocked = useRef(false);
  const isInView = useInView(containerRef, { amount: 0.5 });

  // Reset stage when footer leaves view
  useEffect(() => {
    if (!isInView) {
      setCurrentStage(0);
      scrollAccumulator.current = 0;
      isLocked.current = false;
    }
  }, [isInView]);

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (
        containerRef.current &&
        containerRef.current.contains(e.target as Node)
      ) {
        const isAtBottom =
          window.innerHeight + window.scrollY >=
          document.body.offsetHeight - 10;

        // Allow scrolling down to reach bottom
        if (e.deltaY > 0 && !isAtBottom) return;

        // If we are at stage 0 and scrolling up, let page scroll
        if (currentStage === 0 && e.deltaY < 0) return;

        // If we are at max stage and scrolling down, stop (or allow if you want to overscroll)
        if (currentStage === textStages.length - 1 && e.deltaY > 0) return;

        e.preventDefault();

        if (isLocked.current) return;

        scrollAccumulator.current += e.deltaY;
        const SCROLL_THRESHOLD = 180;

        if (scrollAccumulator.current > SCROLL_THRESHOLD) {
          // Scroll Down -> Next Stage
          if (currentStage < textStages.length - 1) {
            isLocked.current = true;
            setCurrentStage((prev) => prev + 1);
            scrollAccumulator.current = 0;
            setTimeout(() => {
              isLocked.current = false;
            }, 1000);
          }
        } else if (scrollAccumulator.current < -SCROLL_THRESHOLD) {
          // Scroll Up -> Previous Stage
          if (currentStage > 0) {
            isLocked.current = true;
            setCurrentStage((prev) => prev - 1);
            scrollAccumulator.current = 0;
            setTimeout(() => {
              isLocked.current = false;
            }, 1000);
          }
        }
      }
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    return () => window.removeEventListener("wheel", handleWheel);
  }, [currentStage, textStages.length]);

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
      question: "Does DocsTalk use AI?",
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

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground overflow-x-hidden">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 glass-header px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative w-8 h-8">
              <AnimatedLogo className="w-8 h-8" />
            </div>
            <span className="font-bold text-xl tracking-tight">DocsTalk</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="https://github.com/hk-dev13/docstalk"
              target="_blank"
              className="p-2 hover:bg-secondary rounded-lg transition-colors"
            >
              <Github className="w-5 h-5" />
            </Link>
            <Link href="/chat">
              <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors">
                Get Started
              </button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 relative overflow-hidden">
        <GridPattern
          id="hero-grid"
          width={50}
          height={50}
          x={-1}
          y={-1}
          className={cn(
            "[mask-[linear-gradient(to_bottom_right,white,transparent,transparent)] ",
            "opacity-50"
          )}
        />
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
            <span>Now supporting Next.js 16 & React 19</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-tight">
            Smart Documentation <br />
            <span className="gradient-text">Assistant for Developers</span>
          </h1>

          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Stop trusting stale AI answers. We connect your AI directly to
            official docs. Answered with official sources, accurate, and
            complete with code examples.
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

          <div className="relative flex h-full w-full flex-col items-center justify-center gap-4 overflow-hidden py-4">
            <Marquee pauseOnHover className="[--duration:40s]">
              {supportedDocs
                .slice(0, Math.ceil(supportedDocs.length / 2))
                .map((doc, idx) => (
                  <Link
                    key={idx}
                    href={doc.url}
                    target="_blank"
                    className="block h-full mx-2"
                  >
                    <div className="flex flex-col items-center justify-center p-6 w-32 h-32 rounded-2xl bg-background border border-border/50 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all group cursor-pointer">
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
                ))}
            </Marquee>
            <Marquee reverse pauseOnHover className="[--duration:40s]">
              {supportedDocs
                .slice(Math.ceil(supportedDocs.length / 2))
                .map((doc, idx) => (
                  <Link
                    key={idx}
                    href={doc.url}
                    target="_blank"
                    className="block h-full mx-2"
                  >
                    <div className="flex flex-col items-center justify-center p-6 w-32 h-32 rounded-2xl bg-background border border-border/50 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all group cursor-pointer">
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
                ))}
            </Marquee>
            <div className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-linear-to-r from-background"></div>
            <div className="pointer-events-none absolute inset-y-0 right-0 w-1/3 bg-linear-to-l from-background"></div>
          </div>
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
            <div className="hidden md:block absolute top-12 left-0 w-full h-full pointer-events-none z-0">
              <svg className="w-full h-full" preserveAspectRatio="none">
                <motion.path
                  d="M 150 50 C 400 50, 400 50, 650 50 C 900 50, 900 50, 1150 50"
                  fill="none"
                  stroke="url(#line-gradient)"
                  strokeWidth="2"
                  strokeDasharray="8 8"
                  initial={{ pathLength: 0, opacity: 0 }}
                  whileInView={{ pathLength: 1, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.5, ease: "easeInOut" }}
                />
                <defs>
                  <linearGradient
                    id="line-gradient"
                    x1="0"
                    y1="0"
                    x2="1"
                    y2="0"
                  >
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
                    <stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.5" />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity="0.2" />
                  </linearGradient>
                </defs>
              </svg>
            </div>

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
                        &nbsp;&nbsp;
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

      {/* Testimonials Section */}
      <section className="py-24 px-4 bg-secondary/20 border-y border-border/50">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl font-bold mb-4">Trusted by Developers</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              See what others are saying about how DocsTalk speeds up their
              workflow.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                quote:
                  "DocsTalk has completely changed how I learn new frameworks. No more tab switching, just instant answers.",
                name: "Sarah Chen",
                role: "Senior Frontend Dev",
                company: "TechCorp",
              },
              {
                quote:
                  "The accuracy of the code examples is impressive. It understands the context of my project perfectly.",
                name: "Alex Miller",
                role: "Full Stack Engineer",
                company: "StartupX",
              },
              {
                quote:
                  "Finally, an AI that actually cites its sources. I can verify everything it tells me in seconds.",
                name: "Jordan Lee",
                role: "Tech Lead",
                company: "DevStudio",
              },
            ].map((testimonial, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: idx * 0.2 }}
                className="p-8 rounded-2xl bg-background border border-border/50 shadow-lg hover:shadow-xl hover:border-primary/20 transition-all"
              >
                <div className="mb-6 text-primary">
                  <svg
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M14.017 21L14.017 18C14.017 16.8954 14.9124 16 16.017 16H19.017C19.5693 16 20.017 15.5523 20.017 15V9C20.017 8.44772 19.5693 8 19.017 8H15.017C14.4647 8 14.017 8.44772 14.017 9V11C14.017 11.5523 13.5693 12 13.017 12H12.017V5H22.017V15C22.017 18.3137 19.3307 21 16.017 21H14.017ZM5.0166 21L5.0166 18C5.0166 16.8954 5.91203 16 7.0166 16H10.0166C10.5689 16 11.0166 15.5523 11.0166 15V9C11.0166 8.44772 10.5689 8 10.0166 8H6.0166C5.46432 8 5.0166 8.44772 5.0166 9V11C5.0166 11.5523 4.56889 12 4.0166 12H3.0166V5H13.0166V15C13.0166 18.3137 10.3303 21 7.0166 21H5.0166Z" />
                  </svg>
                </div>
                <p className="text-lg mb-6 leading-relaxed text-muted-foreground">
                  "{testimonial.quote}"
                </p>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-linear-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                    {testimonial.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">{testimonial.name}</h4>
                    <p className="text-xs text-muted-foreground">
                      {testimonial.role} at {testimonial.company}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
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
        <GridPattern
          id="footer-grid"
          width={50}
          height={50}
          x={-1}
          y={-1}
          className={cn(
            "[mask-[linear-gradient(to_top_left,white,transparent,transparent)] ",
            "opacity-50"
          )}
        />
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
                    href="/pricing"
                    className="hover:text-primary transition-colors"
                  >
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link
                    href="/changelog"
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
                    href="https://discord.gg/"
                    target="_blank"
                    className="hover:text-primary transition-colors"
                  >
                    Discord Community
                  </Link>
                </li>
                <li>
                  <Link
                    href="https://x.com/"
                    target="_blank"
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
      <BackToTop />
    </div>
  );
}
