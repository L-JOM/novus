// Qualification question types
export type QuestionType = "text" | "single-choice" | "yes-no";

export interface QualificationQuestion {
  id: string;
  type: QuestionType;
  question: string;
  choices?: { label: string; value: string }[];
  isDisqualifier?: boolean;
  disqualifyingValues?: string[];
}

// All answers stored internally (never shown to user)
export interface IntakeState {
  // Intro response (stored internally only)
  introResponse: string;
  
  // Qualification answers keyed by question ID
  qualificationAnswers: Record<string, string>;
  
  // Handoff info (only collected if eligible)
  companyName: string;
  contactName: string;
  workEmail: string;
  roleTitle: string;
  optionalNote: string;
}

export type OutcomeType = "rejected" | "deferred" | "eligible";

export interface EvaluationResult {
  outcome: OutcomeType;
  // Reasons are internal only, never shown to user
  internalReasons: string[];
}

// Phase of the intake process
export type IntakePhase = 
  | "orientation"
  | "intro"
  | "qualification" 
  | "outcome"
  | "handoff";
