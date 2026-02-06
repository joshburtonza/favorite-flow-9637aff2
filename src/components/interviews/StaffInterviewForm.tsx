import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { InterviewQuestion, interviewQuestions } from '@/lib/testing-definitions';
import { useStaffInterviews } from '@/hooks/useStaffInterviews';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Loader2, Star, ChevronLeft, ChevronRight, Send } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StaffInterviewFormProps {
  interviewId: string;
  onComplete?: () => void;
}

export function StaffInterviewForm({ interviewId, onComplete }: StaffInterviewFormProps) {
  const { submitResponses, startInterview } = useStaffInterviews();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { control, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: interviewQuestions.reduce((acc, q) => {
      acc[q.key] = q.type === 'checklist' ? [] : q.type === 'rating' ? 3 : '';
      return acc;
    }, {} as Record<string, unknown>),
  });

  const totalQuestions = interviewQuestions.length;
  const progress = Math.round(((currentStep + 1) / totalQuestions) * 100);

  useEffect(() => {
    // Mark interview as in progress when form opens
    startInterview.mutate(interviewId);
  }, [interviewId]);

  const onSubmit = async (data: Record<string, unknown>) => {
    setIsSubmitting(true);
    try {
      await submitResponses.mutateAsync({ interviewId, responses: data });
      onComplete?.();
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentQuestion = interviewQuestions[currentStep];
  const isLastQuestion = currentStep === totalQuestions - 1;
  const isFirstQuestion = currentStep === 0;

  const renderQuestion = (question: InterviewQuestion) => {
    switch (question.type) {
      case 'text':
        return (
          <Controller
            name={question.key}
            control={control}
            rules={{ required: question.required ? 'This field is required' : false }}
            render={({ field }) => (
              <Textarea
                {...field}
                value={field.value as string}
                placeholder="Type your answer here..."
                className="min-h-[120px]"
              />
            )}
          />
        );

      case 'rating':
        return (
          <Controller
            name={question.key}
            control={control}
            render={({ field }) => (
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((value) => (
                  <Button
                    key={value}
                    type="button"
                    variant="outline"
                    size="lg"
                    className={cn(
                      'w-12 h-12',
                      field.value === value && 'bg-primary text-primary-foreground'
                    )}
                    onClick={() => field.onChange(value)}
                  >
                    <Star 
                      className={cn(
                        'h-5 w-5',
                        (field.value as number) >= value && 'fill-current'
                      )} 
                    />
                  </Button>
                ))}
                <span className="ml-4 text-muted-foreground">
                  {field.value === 1 && 'Very Low'}
                  {field.value === 2 && 'Low'}
                  {field.value === 3 && 'Average'}
                  {field.value === 4 && 'High'}
                  {field.value === 5 && 'Very High'}
                </span>
              </div>
            )}
          />
        );

      case 'multiple_choice':
        return (
          <Controller
            name={question.key}
            control={control}
            rules={{ required: question.required ? 'Please select an option' : false }}
            render={({ field }) => (
              <RadioGroup
                value={field.value as string}
                onValueChange={field.onChange}
                className="space-y-3"
              >
                {question.options?.map((option) => (
                  <div key={option} className="flex items-center space-x-3">
                    <RadioGroupItem value={option} id={`${question.key}-${option}`} />
                    <Label htmlFor={`${question.key}-${option}`} className="cursor-pointer">
                      {option}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            )}
          />
        );

      case 'checklist':
        return (
          <Controller
            name={question.key}
            control={control}
            render={({ field }) => (
              <div className="grid gap-3">
                {question.options?.map((option) => {
                  const values = field.value as string[];
                  const isChecked = values.includes(option);
                  
                  return (
                    <div key={option} className="flex items-center space-x-3">
                      <Checkbox
                        id={`${question.key}-${option}`}
                        checked={isChecked}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            field.onChange([...values, option]);
                          } else {
                            field.onChange(values.filter((v) => v !== option));
                          }
                        }}
                      />
                      <Label htmlFor={`${question.key}-${option}`} className="cursor-pointer">
                        {option}
                      </Label>
                    </div>
                  );
                })}
              </div>
            )}
          />
        );

      default:
        return null;
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-muted-foreground">
            Question {currentStep + 1} of {totalQuestions}
          </span>
          <span className="text-sm font-medium">{progress}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="min-h-[200px]">
            <CardTitle className="text-xl mb-2">{currentQuestion.question}</CardTitle>
            {currentQuestion.required && (
              <CardDescription className="mb-4">* Required</CardDescription>
            )}
            
            <div className="mt-6">
              {renderQuestion(currentQuestion)}
            </div>
            
            {errors[currentQuestion.key] && (
              <p className="text-sm text-destructive mt-2">
                {errors[currentQuestion.key]?.message as string}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCurrentStep(s => s - 1)}
              disabled={isFirstQuestion}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>

            {isLastQuestion ? (
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Send className="h-4 w-4 mr-2" />
                Submit Interview
              </Button>
            ) : (
              <Button
                type="button"
                onClick={() => setCurrentStep(s => s + 1)}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
