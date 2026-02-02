import { motion } from "framer-motion";

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
}

const ProgressBar = ({ currentStep, totalSteps }: ProgressBarProps) => {
  const progress = (currentStep / totalSteps) * 100;

  const getProgressColor = () => {
    if (progress < 40) {
      return "hsl(0, 70%, 55%)"; // Red
    } else if (progress < 75) {
      return "hsl(45, 85%, 50%)"; // Yellow
    } else {
      return "hsl(142, 60%, 45%)"; // Green
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm text-muted-foreground font-medium">
          Step {currentStep} of {totalSteps}
        </span>
        <span className="text-sm text-muted-foreground">
          {Math.round(progress)}%
        </span>
      </div>
      <div className="h-2 bg-secondary rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          initial={{ width: 0, backgroundColor: "hsl(0, 70%, 55%)" }}
          animate={{ width: `${progress}%`, backgroundColor: getProgressColor() }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;
