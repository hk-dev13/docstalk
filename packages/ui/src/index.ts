/**
 * @docstalk/ui
 * Shared UI components for DocsTalk monorepo
 */

// Auto-detect components
export { RoutingIndicator } from "./routing-indicator";
export { ClarificationFlow } from "./clarification-flow";
export { ContextBreadcrumb } from "./context-breadcrumb";

// Export styles
import "./styles.css";

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
export * from "./skeleton";
export * from "./animated-logo";
export { Alert, AlertTitle, AlertDescription } from "./alert";
export { Typewriter } from "./typewriter";
export { LiquidText } from "./liquid-text";
export { ModeToggle } from "./mode-toggle";
export { AuthModal } from "./auth-modal";
export { ErrorBoundary } from "./error-boundary";
export { ThemeProvider } from "./theme-provider";
