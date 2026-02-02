import { IntakeState, EvaluationResult, OutcomeType } from "@/types/intake";
import { 
  QUALIFICATION_QUESTIONS, 
  MINIMUM_REQUIRED,
  DISQUALIFYING_PATTERNS,
  ALIGNMENT_PATTERNS 
} from "./qualificationQuestions";

// Check if answer contains disqualifying patterns
function containsDisqualifyingPattern(questionId: string, answer: string): boolean {
  const patterns = DISQUALIFYING_PATTERNS[questionId];
  if (!patterns) return false;
  
  return patterns.some(pattern => pattern.test(answer));
}

// Check if answer shows alignment
function containsAlignmentPattern(questionId: string, answer: string): boolean {
  const patterns = ALIGNMENT_PATTERNS[questionId];
  if (!patterns) return false;
  
  return patterns.some(pattern => pattern.test(answer));
}

export function evaluateIntake(state: IntakeState): EvaluationResult {
  const internalReasons: string[] = [];
  
  // Check if intro was skipped
  if (!state.introResponse || state.introResponse.trim().length === 0) {
    internalReasons.push("Intro section skipped");
    return { outcome: "rejected", internalReasons };
  }
  
  // Check for automatic disqualifiers in free-text responses
  for (const question of QUALIFICATION_QUESTIONS) {
    const answer = state.qualificationAnswers[question.id];
    
    if (question.isDisqualifier && answer) {
      if (containsDisqualifyingPattern(question.id, answer)) {
        internalReasons.push(`Disqualifier triggered: ${question.id}`);
        return { outcome: "rejected", internalReasons };
      }
    }
  }
  
  // Count answered questions and alignment
  let answeredCount = 0;
  let alignedCount = 0;
  
  for (const question of QUALIFICATION_QUESTIONS) {
    const answer = state.qualificationAnswers[question.id];
    
    if (answer && answer.trim().length > 0) {
      answeredCount++;
      
      // Check alignment via pattern matching
      if (containsAlignmentPattern(question.id, answer)) {
        alignedCount++;
      }
    }
  }
  
  // Fail closed if any question unanswered
  if (answeredCount < QUALIFICATION_QUESTIONS.length) {
    internalReasons.push("Incomplete qualification");
    return { outcome: "rejected", internalReasons };
  }
  
  // Check minimum alignment threshold
  if (alignedCount < MINIMUM_REQUIRED) {
    internalReasons.push(`Alignment score: ${alignedCount}/${QUALIFICATION_QUESTIONS.length}`);
    return { outcome: "deferred", internalReasons };
  }
  
  // Eligible for human review
  return { outcome: "eligible", internalReasons: ["Meets criteria for manual review"] };
}

// Check for immediate disqualification during intake (before full evaluation)
export function checkImmediateDisqualification(
  questionId: string, 
  answer: string
): boolean {
  const question = QUALIFICATION_QUESTIONS.find(q => q.id === questionId);
  
  if (question?.isDisqualifier) {
    return containsDisqualifyingPattern(questionId, answer);
  }
  
  return false;
}
