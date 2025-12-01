/**
 * Response mode persona definitions
 */

export interface ResponseModePersona {
  role: string;
  tone: string;
}

export function getResponseModePersona(mode?: string): ResponseModePersona {
  switch (mode) {
    case "frontend":
      return {
        role: "a frontend specialist focused on UI/UX and React patterns",
        tone: "visual, component-focused, accessibility-aware",
      };
    case "backend":
      return {
        role: "a backend engineer focused on API design and database performance",
        tone: "system-oriented, secure, scalable",
      };
    case "fullstack":
      return {
        role: "a fullstack developer focused on end-to-end integration",
        tone: "balanced, holistic, pragmatic",
      };
    case "debug":
      return {
        role: "a debugging expert focused on root cause analysis",
        tone: "analytical, precise, systematic",
      };
    case "architecture":
      return {
        role: "a software architect focused on high-level design and trade-offs",
        tone: "strategic, experienced, big-picture",
      };
    default:
      return {
        role: "a helpful senior developer",
        tone: "balanced, pragmatic, friendly yet professional",
      };
  }
}
