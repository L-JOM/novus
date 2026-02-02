import { useState } from "react";
import Link from "next/link";
import { Plus, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type QuestionType = "short" | "multi" | "yes_no";
type QuestionMode = "fixed" | "ai" | "hybrid";

type IntakeQuestion = {
  id: string;
  label: string;
  type: QuestionType;
  required: boolean;
  options?: string[];
};

const createQuestion = (overrides: Partial<IntakeQuestion> = {}): IntakeQuestion => ({
  id: `q-${Math.random().toString(36).slice(2, 8)}`,
  label: "New intake question",
  type: "short",
  required: true,
  options: [],
  ...overrides,
});

const IntakeStudioPage = () => {
  const [questionMode, setQuestionMode] = useState<QuestionMode>("hybrid");
  const [aiEnabled, setAiEnabled] = useState(true);
  const [questions, setQuestions] = useState<IntakeQuestion[]>([
    createQuestion({ label: "Primary use case", type: "short" }),
    createQuestion({ label: "Monthly lead volume", type: "short" }),
    createQuestion({ label: "CRM in use", type: "short", required: false }),
    createQuestion({
      label: "Implementation timeline",
      type: "multi",
      options: ["Immediate", "30-60 days", "This quarter", "Undecided"],
    }),
  ]);

  const handleQuestionChange = (id: string, updates: Partial<IntakeQuestion>) => {
    setQuestions((prev) => prev.map((question) => (question.id === id ? { ...question, ...updates } : question)));
  };

  const handleRemoveQuestion = (id: string) => {
    setQuestions((prev) => prev.filter((question) => question.id !== id));
  };

  const handleAddQuestion = () => {
    setQuestions((prev) => [...prev, createQuestion()]);
  };

  const handleAddOption = (id: string) => {
    setQuestions((prev) =>
      prev.map((question) =>
        question.id === id
          ? {
              ...question,
              options: [
                ...(question.options ?? []),
                `Option ${question.options?.length ? question.options.length + 1 : 1}`,
              ],
            }
          : question,
      ),
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="container mx-auto px-6 py-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Intake Studio</h1>
            <p className="text-sm text-muted-foreground">Edit your intake form and AI behavior.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="font-mono text-xs uppercase tracking-wider">
                  AI Settings
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:max-w-md">
                <SheetHeader>
                  <SheetTitle>AI Settings</SheetTitle>
                  <SheetDescription>Control AI behavior for intake questions and routing.</SheetDescription>
                </SheetHeader>
                <div className="mt-6 space-y-4">
                  <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                    <div>
                      <p className="text-sm font-medium">AI assistance</p>
                      <p className="text-xs text-muted-foreground">Generate follow-up questions and summaries.</p>
                    </div>
                    <Switch checked={aiEnabled} onCheckedChange={setAiEnabled} />
                  </div>
                  <div className="space-y-2">
                    <Label>System prompt</Label>
                    <Textarea
                      rows={4}
                      defaultValue="You are a pre-qualification assistant. Ask concise questions and prioritize enterprise readiness."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Context & constraints</Label>
                    <Textarea
                      rows={4}
                      defaultValue="Target ICP: 10+ sales reps, CRM in place, timeline under 90 days. Do not accept hobby projects."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Routing rules</Label>
                    <Textarea
                      rows={3}
                      defaultValue="Eligible if lead volume > 200/mo and budget confirmed. Defer if timeline is unclear."
                    />
                  </div>
                </div>
              </SheetContent>
            </Sheet>
            <Button asChild variant="outline" className="font-mono text-xs uppercase tracking-wider">
              <Link href="/">Back</Link>
            </Button>
            <Button className="font-mono text-xs uppercase tracking-wider">
              <Settings2 size={14} className="mr-2" />
              Publish
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 space-y-8">
        <Card className="card-grid">
          <CardHeader>
            <CardTitle className="text-lg">Form settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Form title</Label>
                <Input defaultValue="Inbound Qualification Flow" />
              </div>
              <div className="space-y-2">
                <Label>Routing goal</Label>
                <Select defaultValue="qualify">
                  <SelectTrigger>
                    <SelectValue placeholder="Select a goal" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="qualify">Qualify for sales review</SelectItem>
                    <SelectItem value="screen">Screen out low intent</SelectItem>
                    <SelectItem value="handoff">Schedule direct handoff</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Question mode</Label>
              <RadioGroup
                value={questionMode}
                onValueChange={(value) => setQuestionMode(value as QuestionMode)}
                className="grid gap-2 md:grid-cols-3"
              >
                {[
                  { value: "fixed", label: "Fixed" },
                  { value: "ai", label: "AI" },
                  { value: "hybrid", label: "Hybrid" },
                ].map((option) => (
                  <label
                    key={option.value}
                    className="flex items-center gap-2 rounded-md border border-border px-3 py-2 cursor-pointer"
                  >
                    <RadioGroupItem value={option.value} />
                    <span className="text-sm">{option.label}</span>
                  </label>
                ))}
              </RadioGroup>
            </div>
          </CardContent>
        </Card>

        <Card className="card-grid">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Questions</CardTitle>
              <p className="text-xs text-muted-foreground">Add and edit your intake questions.</p>
            </div>
            <Button size="sm" variant="outline" onClick={handleAddQuestion}>
              <Plus size={14} className="mr-2" />
              Add
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {questions.map((question) => (
              <div key={question.id} className="rounded-md border border-border p-4 space-y-3">
                <div className="grid gap-3 md:grid-cols-[2fr_1fr_1fr]">
                  <div className="space-y-2">
                    <Label>Question</Label>
                    <Input
                      value={question.label}
                      onChange={(event) => handleQuestionChange(question.id, { label: event.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select
                      value={question.type}
                      onValueChange={(value) => handleQuestionChange(question.id, { type: value as QuestionType })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="short">Short answer</SelectItem>
                        <SelectItem value="multi">Multiple choice</SelectItem>
                        <SelectItem value="yes_no">Yes / No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Required</Label>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={question.required}
                        onCheckedChange={(checked) => handleQuestionChange(question.id, { required: checked })}
                      />
                      <span className="text-xs text-muted-foreground">
                        {question.required ? "Required" : "Optional"}
                      </span>
                    </div>
                  </div>
                </div>

                {question.type === "multi" && (
                  <div className="space-y-2">
                    <Label>Options</Label>
                    <div className="space-y-2">
                      {(question.options ?? []).map((option, index) => (
                        <Input
                          key={`${question.id}-option-${index}`}
                          value={option}
                          onChange={(event) => {
                            const options = [...(question.options ?? [])];
                            options[index] = event.target.value;
                            handleQuestionChange(question.id, { options });
                          }}
                        />
                      ))}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="justify-start text-xs"
                        onClick={() => handleAddOption(question.id)}
                      >
                        <Plus size={12} className="mr-2" />
                        Add option
                      </Button>
                    </div>
                  </div>
                )}

                <div className="flex justify-end">
                  <Button size="sm" variant="ghost" onClick={() => handleRemoveQuestion(question.id)}>
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="card-grid">
          <CardHeader>
            <CardTitle className="text-lg">Intake controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Adaptive branching</p>
                <p className="text-xs text-muted-foreground">Show follow-ups based on answers.</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Auto-summary</p>
                <p className="text-xs text-muted-foreground">Generate lead summaries for reps.</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="space-y-2">
              <Label>Eligibility threshold</Label>
              <Input defaultValue="0.72" />
              <p className="text-xs text-muted-foreground">Higher values reduce eligible volume.</p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default IntakeStudioPage;
