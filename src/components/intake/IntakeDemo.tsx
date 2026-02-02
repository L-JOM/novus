import { useState, useCallback } from "react";
import Link from "next/link";
import { AnimatePresence } from "framer-motion";
import { IntakeState, IntakePhase, OutcomeType } from "@/types/intake";
import { QUALIFICATION_QUESTIONS } from "@/lib/qualificationQuestions";
import { evaluateIntake, checkImmediateDisqualification } from "@/lib/evaluateIntake";
import OrientationSection from "./OrientationSection";
import IntroSection from "./IntroSection";
import SingleQuestion from "./SingleQuestion";
import OutcomeSection from "./OutcomeSection";
import HandoffSection from "./HandoffSection";
import { Button } from "@/components/ui/button";

const IntakeDemo = () => {
  const [phase, setPhase] = useState<IntakePhase>("orientation");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [outcome, setOutcome] = useState<OutcomeType | null>(null);
  
  // Internal state - never shown to user
  const [intakeState, setIntakeState] = useState<IntakeState>({
    introResponse: "",
    qualificationAnswers: {},
    companyName: "",
    contactName: "",
    workEmail: "",
    roleTitle: "",
    optionalNote: "",
  });

  const handleOrientationContinue = useCallback(() => {
    setPhase("intro");
  }, []);

  const handleIntroSubmit = useCallback((response: string) => {
    setIntakeState((prev) => ({ ...prev, introResponse: response }));
    setPhase("qualification");
  }, []);

  const handleQuestionSubmit = useCallback((answer: string) => {
    const currentQuestion = QUALIFICATION_QUESTIONS[currentQuestionIndex];
    
    // Store answer internally
    setIntakeState((prev) => ({
      ...prev,
      qualificationAnswers: {
        ...prev.qualificationAnswers,
        [currentQuestion.id]: answer,
      },
    }));

    // Check for immediate disqualification
    if (checkImmediateDisqualification(currentQuestion.id, answer)) {
      setOutcome("rejected");
      setPhase("outcome");
      return;
    }

    // Move to next question or evaluate
    if (currentQuestionIndex < QUALIFICATION_QUESTIONS.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else {
      // All questions answered - evaluate immediately
      const updatedState = {
        ...intakeState,
        qualificationAnswers: {
          ...intakeState.qualificationAnswers,
          [currentQuestion.id]: answer,
        },
      };
      
      const result = evaluateIntake(updatedState);
      setOutcome(result.outcome);
      
      if (result.outcome === "eligible") {
        setPhase("handoff");
      } else {
        setPhase("outcome");
      }
    }
  }, [currentQuestionIndex, intakeState]);

  const handleHandoffSubmit = useCallback((data: {
    companyName: string;
    contactName: string;
    workEmail: string;
    roleTitle: string;
    optionalNote: string;
  }) => {
    setIntakeState((prev) => ({
      ...prev,
      ...data,
    }));
    
    // Log internally only
    console.log("Handoff submission (internal):", {
      ...intakeState,
      ...data,
    });
  }, [intakeState]);

  const renderPhase = () => {
    switch (phase) {
      case "orientation":
        return <OrientationSection onContinue={handleOrientationContinue} />;

      case "intro":
        return <IntroSection onSubmit={handleIntroSubmit} />;

      case "qualification":
        return (
          <SingleQuestion
            key={currentQuestionIndex}
            question={QUALIFICATION_QUESTIONS[currentQuestionIndex]}
            onSubmit={handleQuestionSubmit}
          />
        );

      case "outcome":
        return outcome ? <OutcomeSection outcome={outcome} /> : null;

      case "handoff":
        return <HandoffSection onSubmit={handleHandoffSubmit} />;

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center justify-end px-6 py-4">
        <Button asChild variant="outline" className="text-xs uppercase tracking-wider">
          <Link href="/">Back to Dashboards</Link>
        </Button>
      </header>
      {/* Main content - centered single question */}
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <AnimatePresence mode="wait">
          {renderPhase()}
        </AnimatePresence>
      </main>

      {/* Minimal footer */}
      <footer className="py-6 text-center">
        <p className="text-xs text-muted-foreground">
          Controlled Intake System
        </p>
      </footer>
    </div>
  );
};

export default IntakeDemo;
