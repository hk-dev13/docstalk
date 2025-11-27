"use client";

import { useEffect, useState, useRef } from "react";
import { cn } from "./lib/utils";

interface AnimatedLogoProps {
  variant?: "header" | "loading";
  className?: string;
}

const GREETINGS = [
  "Hai",
  "Halo",
  "Ciao",
  "Hola",
  "Ola",
  "Hi!",
  "Guten",
  "Salut",
];
const CODES = [
  "< />",
  "var",
  "{ }",
  "404",
  "if()",
  "npm",
  "git",
  "src",
  "dev",
  "cmd",
];

export function AnimatedLogo({
  variant = "header",
  className,
}: AnimatedLogoProps) {
  const [text, setText] = useState("HI!");
  const [showText, setShowText] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (variant === "loading") {
      setShowText(true);
      let index = 0;
      intervalRef.current = setInterval(() => {
        setText(CODES[index]);
        index = (index + 1) % CODES.length;
      }, 300);
    } else {
      setShowText(false);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [variant]);

  const handleMouseEnter = () => {
    if (variant === "header") {
      const randomGreet =
        GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
      setText(randomGreet);
      setShowText(true);
    }
  };

  const handleMouseLeave = () => {
    if (variant === "header") {
      setShowText(false);
    }
  };

  return (
    <div
      className={cn(
        "relative cursor-pointer transition-transform duration-200",
        variant === "loading" && "animate-pulse",
        className
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <svg
        viewBox="0 0 512 512"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        <defs>
          <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#9333ea" />
          </linearGradient>
          <filter id="shadow1">
            <feDropShadow
              dx="0"
              dy="10"
              stdDeviation="15"
              floodColor="#4f46e5"
              floodOpacity="0.25"
            />
          </filter>
        </defs>

        <g filter="url(#shadow1)">
          <path
            className="bg-bubble origin-center"
            d="M256 64C132.3 64 32 149.8 32 256C32 315.3 62.3 368.3 110.5 403.6C107.8 419.2 100.9 442.1 82 463.6C78.3 467.9 81.4 474.7 87.1 474.7C129.3 474.7 171.3 455.8 202.3 435.6C219.3 440.4 237.3 442.9 256 442.9C379.7 442.9 480 357.1 480 250.9C480 144.7 379.7 64 256 64Z"
            fill="url(#grad1)"
          />
        </g>

        <g
          id="icon-content"
          stroke="white"
          strokeWidth="36"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          className={cn(
            "transition-all duration-300 origin-center",
            showText ? "opacity-0 scale-50" : "opacity-100 scale-100"
          )}
        >
          <path d="M190 176C175 176 160 186 160 206V226C160 246 150 256 130 256C150 256 160 266 160 286V306C160 326 175 336 190 336" />
          <path d="M322 176C337 176 352 186 352 206V226C352 246 362 256 382 256C362 256 352 266 352 286V306C352 326 337 336 322 336" />
          <circle cx="226" cy="256" r="12" fill="white" stroke="none" />
          <circle cx="256" cy="256" r="12" fill="white" stroke="none" />
          <circle cx="286" cy="256" r="12" fill="white" stroke="none" />
        </g>

        <text
          id="text-content"
          x="256"
          y="270"
          className={cn(
            "font-bold fill-white text-anchor-middle dominant-baseline-middle pointer-events-none transition-opacity duration-300",
            showText ? "opacity-100" : "opacity-0"
          )}
          style={{
            fontFamily: "'Courier New', monospace",
            fontSize: "140px",
            textAnchor: "middle",
            dominantBaseline: "middle",
          }}
        >
          {text}
        </text>
      </svg>
    </div>
  );
}
