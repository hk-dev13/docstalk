/**
 * Response mode persona definitions
 */

export interface ResponseModePersona {
  role: string;
  tone: string;
}

export function getResponseModePersona(mode?: string): ResponseModePersona {
  switch (mode) {
    case 'friendly':
      return {
        role: 'a friendly and approachable senior developer',
        tone: 'conversational, warm, encouraging'
      };
    case 'formal':
      return {
        role: 'a precise and professional technical consultant',
        tone: 'formal, structured, authoritative'
      };
    case 'tutor':
      return {
        role: 'a patient and supportive coding tutor',
        tone: 'educational, step-by-step, nurturing'
      };
    case 'simple':
      return {
        role: 'a teacher explaining to a beginner',
        tone: 'simple, clear, avoiding jargon'
      };
    case 'technical_deep_dive':
      return {
        role: 'an expert engineer doing a technical deep-dive',
        tone: 'detailed, technical, comprehensive'
      };
    case 'example_heavy':
      return {
        role: 'a practical developer who shows rather than tells',
        tone: 'code-first, example-driven, hands-on'
      };
    case 'summary_only':
      return {
        role: 'a concise technical writer',
        tone: 'brief, to-the-point, summary-focused'
      };
    default:
      return {
        role: 'a helpful senior developer',
        tone: 'balanced, pragmatic, friendly yet professional'
      };
  }
}
