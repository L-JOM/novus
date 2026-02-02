import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface Choice {
  label: string;
  value: string;
}

interface FormQuestionProps {
  question: string;
  subtext?: string;
  type: "text" | "textarea" | "choice";
  choices?: Choice[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const FormQuestion = ({
  question,
  subtext,
  type,
  choices,
  value,
  onChange,
  placeholder,
}: FormQuestionProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="w-full max-w-lg mx-auto"
    >
      <h1 className="text-3xl md:text-4xl font-serif text-foreground mb-3 leading-tight">
        {question}
      </h1>
      {subtext && (
        <p className="text-muted-foreground text-lg mb-8">{subtext}</p>
      )}

      <div className="mt-8">
        {type === "text" && (
          <Input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="h-14 text-lg bg-card border-border focus:border-primary focus:ring-primary/20 rounded-lg px-5"
          />
        )}

        {type === "textarea" && (
          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="min-h-32 text-lg bg-card border-border focus:border-primary focus:ring-primary/20 rounded-lg px-5 py-4 resize-none"
          />
        )}

        {type === "choice" && choices && (
          <div className="space-y-3">
            {choices.map((choice, index) => (
              <motion.button
                key={choice.value}
                onClick={() => onChange(choice.value)}
                className={`w-full p-5 rounded-lg border-2 text-left transition-all duration-200 flex items-center gap-4 ${
                  value === choice.value
                    ? "border-primary bg-accent"
                    : "border-border bg-card hover:border-stone hover:bg-secondary/50"
                }`}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <span
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                    value === choice.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {String.fromCharCode(65 + index)}
                </span>
                <span
                  className={`text-lg font-medium ${
                    value === choice.value
                      ? "text-foreground"
                      : "text-secondary-foreground"
                  }`}
                >
                  {choice.label}
                </span>
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default FormQuestion;
