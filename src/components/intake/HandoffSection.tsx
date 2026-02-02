import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface HandoffData {
  companyName: string;
  contactName: string;
  workEmail: string;
  roleTitle: string;
  optionalNote: string;
}

interface HandoffSectionProps {
  onSubmit: (data: HandoffData) => void;
}

const HandoffSection = ({ onSubmit }: HandoffSectionProps) => {
  const [data, setData] = useState<HandoffData>({
    companyName: "",
    contactName: "",
    workEmail: "",
    roleTitle: "",
    optionalNote: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const canSubmit =
    data.companyName.trim() &&
    data.contactName.trim() &&
    data.workEmail.trim() &&
    data.roleTitle.trim();

  const handleSubmit = () => {
    if (canSubmit) {
      onSubmit(data);
      setSubmitted(true);
    }
  };

  const handleChange = (field: keyof HandoffData, value: string) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-xl mx-auto text-center"
      >
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-6 mx-auto">
          <span className="text-muted-foreground text-lg">•</span>
        </div>
        <p className="text-foreground text-lg leading-relaxed">
          Submission received. Pilot access is reviewed manually. Submission does not guarantee acceptance.
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="w-full max-w-xl mx-auto"
    >
      <p className="text-sm font-mono text-muted-foreground mb-4 text-center">
        Status: Eligible for human review
      </p>
      <p className="text-muted-foreground text-sm mb-8 text-center">
        Requests at this stage are reviewed manually. Submission does not guarantee acceptance.
      </p>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="companyName" className="text-foreground text-sm">
            Company Name
          </Label>
          <Input
            id="companyName"
            value={data.companyName}
            onChange={(e) => handleChange("companyName", e.target.value)}
            className="h-12 bg-card border-border text-foreground"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="contactName" className="text-foreground text-sm">
            Contact Name
          </Label>
          <Input
            id="contactName"
            value={data.contactName}
            onChange={(e) => handleChange("contactName", e.target.value)}
            className="h-12 bg-card border-border text-foreground"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="workEmail" className="text-foreground text-sm">
            Work Email
          </Label>
          <Input
            id="workEmail"
            type="email"
            value={data.workEmail}
            onChange={(e) => handleChange("workEmail", e.target.value)}
            className="h-12 bg-card border-border text-foreground"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="roleTitle" className="text-foreground text-sm">
            Role / Title
          </Label>
          <Input
            id="roleTitle"
            value={data.roleTitle}
            onChange={(e) => handleChange("roleTitle", e.target.value)}
            className="h-12 bg-card border-border text-foreground"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="optionalNote" className="text-foreground text-sm">
            Optional Note
          </Label>
          <Textarea
            id="optionalNote"
            value={data.optionalNote}
            onChange={(e) => handleChange("optionalNote", e.target.value)}
            className="min-h-[80px] bg-card border-border text-foreground resize-none"
          />
        </div>
      </div>

      <div className="mt-8 text-center">
        <Button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="bg-foreground hover:bg-foreground/90 text-background h-12 px-8 font-medium disabled:opacity-40"
        >
          Submit for Review
        </Button>
      </div>
    </motion.div>
  );
};

export default HandoffSection;
