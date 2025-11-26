/**
 * @docstalk/ui
 * Shared UI components for DocsTalk monorepo
 */

// Base components
export { Button, type ButtonProps } from "./button";
export {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./dialog";

// Chat components
export { ChatMessage } from "./chat-message";
export { ChatInput } from "./chat-input";
export { ConversationSidebar } from "./conversation-sidebar";

// Utils
export { cn } from "./lib/utils";

// UI Components
export { Marquee } from "./marquee";
export { GridPattern } from "./grid-pattern";
export { BackToTop } from "./back-to-top";
export { Typewriter } from "./typewriter";
export { LiquidText } from "./liquid-text";
export { ModeToggle } from "./mode-toggle";
export { AuthModal } from "./auth-modal";
export { ErrorBoundary } from "./error-boundary";
export { ThemeProvider } from "./theme-provider";
