import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ThankYouScreenProps {
  onReset: () => void;
}

const ThankYouScreen = ({ onReset }: ThankYouScreenProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="text-center max-w-md mx-auto"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
        className="w-20 h-20 bg-accent rounded-full flex items-center justify-center mx-auto mb-8"
      >
        <CheckCircle2 className="w-10 h-10 text-primary" />
      </motion.div>

      <h1 className="text-3xl md:text-4xl font-serif text-foreground mb-4">
        Thank you!
      </h1>
      <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
        We've received your information and will be in touch shortly. Our team
        typically responds within 24 hours.
      </p>

      <Button
        variant="outline"
        onClick={onReset}
        className="h-12 px-6 border-border hover:bg-secondary"
      >
        Start Over
      </Button>
    </motion.div>
  );
};

export default ThankYouScreen;
