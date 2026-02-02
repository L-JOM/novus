import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QualificationQuestion } from "@/types/intake";

interface SingleQuestionProps {
  question: QualificationQuestion;
  onSubmit: (answer: string) => void;
}

const SingleQuestion = ({ question, onSubmit }: SingleQuestionProps) => {
  const [answer, setAnswer] = useState("");

  const handleSubmit = () => {
    if (answer.trim()) {
      onSubmit(answer.trim());
      setAnswer("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && answer.trim()) {
      handleSubmit();
    }
  };

  return (
    <motion.div
      key={question.id}
      initial={{ opacity: 0, y: -40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 40 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="w-full max-w-xl mx-auto text-center"
    >
      <h2 className="text-xl md:text-2xl font-serif text-foreground mb-8 leading-relaxed">
        {question.question}
      </h2>
      
      <div className="space-y-6">
        <Input
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder=""
          maxLength={200}
          className="h-12 bg-card border-border text-foreground"
          autoFocus
        />
        <p className="text-xs text-muted-foreground">
          One sentence maximum
        </p>
        <Button
          onClick={handleSubmit}
          disabled={!answer.trim()}
          className="bg-foreground hover:bg-foreground/90 text-background h-12 px-8 font-medium disabled:opacity-40"
        >
          Submit
        </Button>
      </div>
    </motion.div>
  );
};

export default SingleQuestion;
