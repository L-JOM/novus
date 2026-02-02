import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";

interface FormNavigationProps {
  currentStep: number;
  totalSteps: number;
  canProceed: boolean;
  onBack: () => void;
  onNext: () => void;
  onSubmit: () => void;
}

const FormNavigation = ({
  currentStep,
  totalSteps,
  canProceed,
  onBack,
  onNext,
  onSubmit,
}: FormNavigationProps) => {
  const isLastStep = currentStep === totalSteps;
  const isFirstStep = currentStep === 1;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.2 }}
      className="flex items-center justify-between w-full max-w-lg mx-auto mt-12"
    >
      <Button
        variant="ghost"
        onClick={onBack}
        disabled={isFirstStep}
        className="text-muted-foreground hover:text-foreground hover:bg-secondary gap-2 h-12 px-5"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </Button>

      {isLastStep ? (
        <Button
          onClick={onSubmit}
          disabled={!canProceed}
          className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 h-12 px-8 rounded-lg font-medium"
        >
          Submit
          <Check className="w-4 h-4" />
        </Button>
      ) : (
        <Button
          onClick={onNext}
          disabled={!canProceed}
          className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 h-12 px-8 rounded-lg font-medium"
        >
          Continue
          <ArrowRight className="w-4 h-4" />
        </Button>
      )}
    </motion.div>
  );
};

export default FormNavigation;
