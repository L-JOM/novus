import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

interface OrientationSectionProps {
  onContinue: () => void;
}

const OrientationSection = ({ onContinue }: OrientationSectionProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 40 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="w-full max-w-xl mx-auto text-center"
    >
      <div className="space-y-8">
        <p className="text-lg md:text-xl text-foreground leading-relaxed">
          This system evaluates inbound requests before human review.
        </p>
        <p className="text-lg md:text-xl text-foreground leading-relaxed">
          It enforces strict qualification and refusal rules.
        </p>
      </div>
      
      <div className="mt-12">
        <Button
          onClick={onContinue}
          className="bg-foreground hover:bg-foreground/90 text-background h-12 px-8 font-medium"
        >
          Continue
        </Button>
      </div>
    </motion.div>
  );
};

export default OrientationSection;
