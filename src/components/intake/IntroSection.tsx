import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface IntroSectionProps {
  onSubmit: (response: string) => void;
}

const IntroSection = ({ onSubmit }: IntroSectionProps) => {
  const [response, setResponse] = useState("");

  const handleSubmit = () => {
    if (response.trim()) {
      onSubmit(response.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && response.trim()) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 40 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="w-full max-w-xl mx-auto text-center"
    >
      <h2 className="text-xl md:text-2xl font-serif text-foreground mb-8 leading-relaxed">
        Before we proceed, briefly describe what you're hoping this system would help your sales team control.
      </h2>
      
      <div className="space-y-6">
        <Textarea
          value={response}
          onChange={(e) => setResponse(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder=""
          className="min-h-[100px] bg-card border-border text-foreground resize-none"
          autoFocus
        />
        
        <Button
          onClick={handleSubmit}
          disabled={!response.trim()}
          className="bg-foreground hover:bg-foreground/90 text-background h-12 px-8 font-medium disabled:opacity-40"
        >
          Submit
        </Button>
      </div>
    </motion.div>
  );
};

export default IntroSection;
