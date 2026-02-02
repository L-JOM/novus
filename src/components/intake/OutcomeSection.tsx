import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { OutcomeType } from "@/types/intake";

interface OutcomeSectionProps {
  outcome: OutcomeType;
}

const OutcomeSection = ({ outcome }: OutcomeSectionProps) => {
  const handleExit = () => {
    // Clear session - no retry allowed
    window.location.reload();
  };

  const renderContent = () => {
    switch (outcome) {
      case "rejected":
        return (
          <>
            <p className="text-sm font-mono text-muted-foreground mb-4">
              Status: Rejected
            </p>
            <p className="text-lg text-foreground leading-relaxed mb-8">
              This request does not meet the criteria at this time.
            </p>
            <Button
              onClick={handleExit}
              variant="outline"
              className="h-12 px-8 border-border hover:bg-card"
            >
              Exit
            </Button>
          </>
        );

      case "deferred":
        return (
          <>
            <p className="text-sm font-mono text-muted-foreground mb-4">
              Status: Deferred by reality
            </p>
            <p className="text-lg text-foreground leading-relaxed mb-8">
              This may be reconsidered if external conditions change.
            </p>
            <Button
              onClick={handleExit}
              variant="outline"
              className="h-12 px-8 border-border hover:bg-card"
            >
              Exit
            </Button>
          </>
        );

      case "eligible":
        return null; // Handled by HandoffSection
    }
  };

  if (outcome === "eligible") return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="w-full max-w-xl mx-auto text-center"
    >
      {renderContent()}
    </motion.div>
  );
};

export default OutcomeSection;
