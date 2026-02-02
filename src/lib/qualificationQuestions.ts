import { QualificationQuestion } from "@/types/intake";

// 12 required qualification items - all free-text, AI-spoken style
// Automatic disqualifiers are evaluated via keyword analysis
export const QUALIFICATION_QUESTIONS: QualificationQuestion[] = [
  // Operating Reality (3 questions)
  {
    id: "consistent_inbound",
    type: "text",
    question: "Does your organization receive consistent inbound inquiries from potential customers?",
  },
  {
    id: "operational_strain",
    type: "text",
    question: "Does inbound volume create operational strain on your team?",
  },
  {
    id: "quality_problem",
    type: "text",
    question: "Is inbound lead quality currently a problem for your organization?",
  },
  
  // Control & Philosophy (3 questions)
  {
    id: "comfort_refusals",
    type: "text",
    question: "How does your organization handle refusing or turning away certain requests?",
  },
  {
    id: "willing_disqualify",
    type: "text",
    question: "What is your approach to disqualifying leads that do not meet your criteria?",
  },
  {
    id: "quality_over_volume",
    type: "text",
    question: "What does your organization prioritize: quality of leads or volume of leads?",
    isDisqualifier: true,
  },
  
  // AI Boundary Expectations (5 questions - all are disqualifiers)
  {
    id: "ai_persuade",
    type: "text",
    question: "What role do you expect AI to play in persuading or convincing prospects?",
    isDisqualifier: true,
  },
  {
    id: "ai_close",
    type: "text",
    question: "What expectations do you have for AI in closing deals or finalizing agreements?",
    isDisqualifier: true,
  },
  {
    id: "ai_price",
    type: "text",
    question: "What role should AI play in providing pricing, estimates, or deal terms?",
    isDisqualifier: true,
  },
  {
    id: "ai_explain",
    type: "text",
    question: "What do you expect regarding AI explaining how it makes its decisions?",
    isDisqualifier: true,
  },
  {
    id: "ai_bypass",
    type: "text",
    question: "Under what circumstances should AI be able to bypass qualification rules?",
    isDisqualifier: true,
  },
  
  // Additional qualification (1 question)
  {
    id: "volume_expectation",
    type: "text",
    question: "What outcome do you prioritize from this system: fewer high-quality conversations, or more conversations overall?",
    isDisqualifier: true,
  },
];

// Minimum required to qualify (10 of 12)
export const MINIMUM_REQUIRED = 10;
export const TOTAL_REQUIRED = 12;

// Disqualifying keywords/patterns for free-text analysis
export const DISQUALIFYING_PATTERNS: Record<string, RegExp[]> = {
  quality_over_volume: [
    /\bvolume\b/i,
    /\bmore\s+(leads?|conversations?|inquiries)\b/i,
    /\bquantity\b/i,
    /\bmaximize\s+(volume|number|amount)\b/i,
  ],
  ai_persuade: [
    /\byes\b/i,
    /\bshould\s+persuade\b/i,
    /\bconvince\b/i,
    /\bsell\b/i,
    /\bclose\s+deals?\b/i,
  ],
  ai_close: [
    /\byes\b/i,
    /\bclose\s+(deals?|sales?)\b/i,
    /\bfinalize\b/i,
    /\bcomplete\s+(sales?|transactions?)\b/i,
  ],
  ai_price: [
    /\byes\b/i,
    /\bprovide\s+(pricing|quotes?|estimates?)\b/i,
    /\bgive\s+(pricing|quotes?|estimates?)\b/i,
    /\bnegotiate\b/i,
  ],
  ai_explain: [
    /\byes\b/i,
    /\bexplain\s+(how|why|its?)\b/i,
    /\btransparent\b/i,
    /\bshow\s+(reasoning|logic)\b/i,
  ],
  ai_bypass: [
    /\byes\b/i,
    /\bsometimes\b/i,
    /\bwhen\s+needed\b/i,
    /\bexceptions?\b/i,
    /\boverride\b/i,
    /\bflexib(le|ility)\b/i,
  ],
  volume_expectation: [
    /\bmore\s+conversations?\b/i,
    /\bvolume\b/i,
    /\bquantity\b/i,
    /\bmaximize\b/i,
  ],
};

// Alignment patterns for positive signals
export const ALIGNMENT_PATTERNS: Record<string, RegExp[]> = {
  consistent_inbound: [
    /\byes\b/i,
    /\bconsistent(ly)?\b/i,
    /\bregular(ly)?\b/i,
    /\bsteady\b/i,
  ],
  operational_strain: [
    /\byes\b/i,
    /\bstrain\b/i,
    /\boverwhelm/i,
    /\btoo\s+many\b/i,
    /\bcapacity\b/i,
  ],
  quality_problem: [
    /\byes\b/i,
    /\bproblem\b/i,
    /\bissue\b/i,
    /\bpoor\s+quality\b/i,
    /\bunqualified\b/i,
  ],
  comfort_refusals: [
    /\bcomfortable\b/i,
    /\bnecessary\b/i,
    /\broutine(ly)?\b/i,
    /\bstandard\b/i,
  ],
  willing_disqualify: [
    /\byes\b/i,
    /\bwilling\b/i,
    /\bdo\s+disqualify\b/i,
    /\bactively\b/i,
  ],
  quality_over_volume: [
    /\bquality\b/i,
    /\bfewer\b/i,
    /\bhigh[\s-]quality\b/i,
  ],
  ai_persuade: [
    /\bno\b/i,
    /\bnot\b/i,
    /\bshouldn'?t\b/i,
    /\bnone\b/i,
  ],
  ai_close: [
    /\bno\b/i,
    /\bnot\b/i,
    /\bshouldn'?t\b/i,
    /\bnone\b/i,
  ],
  ai_price: [
    /\bno\b/i,
    /\bnot\b/i,
    /\bshouldn'?t\b/i,
    /\bnone\b/i,
  ],
  ai_explain: [
    /\bno\b/i,
    /\bnot\b/i,
    /\bshouldn'?t\b/i,
    /\bnone\b/i,
  ],
  ai_bypass: [
    /\bno\b/i,
    /\bnever\b/i,
    /\bnone\b/i,
    /\bno\s+circumstances?\b/i,
  ],
  volume_expectation: [
    /\bfewer\b/i,
    /\bquality\b/i,
    /\bhigh[\s-]quality\b/i,
  ],
};
