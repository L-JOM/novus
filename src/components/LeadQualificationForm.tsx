import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ProgressBar from "./ProgressBar";
import FormQuestion from "./FormQuestion";
import FormNavigation from "./FormNavigation";
import ThankYouScreen from "./ThankYouScreen";
import { Loader2 } from "lucide-react";

interface Choice {
  label: string;
  value: string;
}

interface Question {
  id: string;
  question: string;
  subtext: string;
  type: "text" | "choice";
  placeholder?: string;
  choices?: Choice[];
}

const LeadQualificationForm = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [formData, setFormData] = useState<Record<string, string>>({});

  useEffect(() => {
    generateQuestions();
  }, []);

  const generateQuestions = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-questions');
      
      if (error) {
        throw error;
      }

      if (data?.questions && Array.isArray(data.questions)) {
        setQuestions(data.questions);
        // Initialize form data with empty strings for each question
        const initialData: Record<string, string> = {};
        data.questions.forEach((q: Question) => {
          initialData[q.id] = "";
        });
        setFormData(initialData);
      } else {
        throw new Error("Invalid questions format received");
      }
    } catch (error) {
      console.error("Error generating questions:", error);
      toast.error("Failed to load questions. Using default questions.");
      // Fallback to default questions
      const defaultQuestions: Question[] = [
        {
          id: "fullName",
          question: "What's your name?",
          subtext: "We'd love to get to know you better.",
          type: "text",
          placeholder: "Enter your full name",
        },
        {
          id: "companyName",
          question: "What company do you work for?",
          subtext: "Tell us about your organization.",
          type: "text",
          placeholder: "Enter your company name",
        },
        {
          id: "companySize",
          question: "How large is your team?",
          subtext: "This helps us understand your needs better.",
          type: "choice",
          choices: [
            { label: "1-10 employees", value: "1-10" },
            { label: "11-50 employees", value: "11-50" },
            { label: "51-200 employees", value: "51-200" },
            { label: "200+ employees", value: "200+" },
          ],
        },
        {
          id: "primaryChallenge",
          question: "What's your primary challenge?",
          subtext: "Select the area where you need the most help.",
          type: "choice",
          choices: [
            { label: "Lead generation & acquisition", value: "lead-gen" },
            { label: "Sales process optimization", value: "sales" },
            { label: "Customer retention", value: "retention" },
            { label: "Scaling operations", value: "scaling" },
          ],
        },
        {
          id: "timeline",
          question: "When are you looking to get started?",
          subtext: "Let us know your timeline.",
          type: "choice",
          choices: [
            { label: "Immediately", value: "immediate" },
            { label: "Within 1-3 months", value: "1-3-months" },
            { label: "3-6 months", value: "3-6-months" },
            { label: "Just exploring options", value: "exploring" },
          ],
        },
      ];
      setQuestions(defaultQuestions);
      const initialData: Record<string, string> = {};
      defaultQuestions.forEach((q) => {
        initialData[q.id] = "";
      });
      setFormData(initialData);
    } finally {
      setIsLoading(false);
    }
  };

  const totalSteps = questions.length;
  const currentQuestion = questions[currentStep - 1];

  const handleChange = (value: string) => {
    if (currentQuestion) {
      setFormData((prev) => ({
        ...prev,
        [currentQuestion.id]: value,
      }));
    }
  };

  const canProceed = currentQuestion ? (formData[currentQuestion.id]?.trim() ?? "") !== "" : false;

  const handleNext = () => {
    if (currentStep < totalSteps && canProceed) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSubmit = () => {
    if (canProceed) {
      console.log("Form submitted:", formData);
      setIsSubmitted(true);
      toast.success("Thank you for your submission!");
    }
  };

  const handleReset = () => {
    setCurrentStep(1);
    setIsSubmitted(false);
    const resetData: Record<string, string> = {};
    questions.forEach((q) => {
      resetData[q.id] = "";
    });
    setFormData(resetData);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-lg text-muted-foreground font-medium">
            Preparing your personalized questions...
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header with progress */}
      {!isSubmitted && (
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full px-6 py-8 md:py-12"
        >
          <ProgressBar currentStep={currentStep} totalSteps={totalSteps} />
        </motion.header>
      )}

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center px-6 pb-12">
        <AnimatePresence mode="wait">
          {isSubmitted ? (
            <ThankYouScreen key="thankyou" onReset={handleReset} />
          ) : currentQuestion ? (
            <motion.div
              key={currentStep}
              className="w-full"
            >
              <FormQuestion
                question={currentQuestion.question}
                subtext={currentQuestion.subtext}
                type={currentQuestion.type}
                choices={currentQuestion.choices}
                value={formData[currentQuestion.id] || ""}
                onChange={handleChange}
                placeholder={currentQuestion.placeholder}
              />
              <FormNavigation
                currentStep={currentStep}
                totalSteps={totalSteps}
                canProceed={canProceed}
                onBack={handleBack}
                onNext={handleNext}
                onSubmit={handleSubmit}
              />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center">
        <p className="text-sm text-muted-foreground">
          Your information is secure and will never be shared.
        </p>
      </footer>
    </div>
  );
};

export default LeadQualificationForm;
