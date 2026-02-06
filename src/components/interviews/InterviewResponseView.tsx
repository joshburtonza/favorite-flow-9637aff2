import { useStaffInterviews, InterviewResponse } from '@/hooks/useStaffInterviews';
import { interviewQuestions } from '@/lib/testing-definitions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Star, CheckCircle, Loader2 } from 'lucide-react';

interface InterviewResponseViewProps {
  interviewId: string;
  userName?: string;
}

export function InterviewResponseView({ interviewId, userName }: InterviewResponseViewProps) {
  const { useInterviewResponses } = useStaffInterviews();
  const { data: responses = [], isLoading } = useInterviewResponses(interviewId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const getResponseForQuestion = (key: string) => {
    return responses.find(r => r.question_key === key);
  };

  const renderResponseValue = (response: InterviewResponse) => {
    const value = response.response_value;

    switch (response.response_type) {
      case 'rating':
        const rating = value as number;
        return (
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`h-5 w-5 ${
                  star <= rating ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground'
                }`}
              />
            ))}
            <span className="ml-2 text-sm text-muted-foreground">
              ({rating}/5)
            </span>
          </div>
        );

      case 'checklist':
        const items = value as string[];
        if (items.length === 0) return <span className="text-muted-foreground">No items selected</span>;
        return (
          <div className="flex flex-wrap gap-2">
            {items.map((item) => (
              <Badge key={item} variant="secondary" className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                {item}
              </Badge>
            ))}
          </div>
        );

      case 'multiple_choice':
        return (
          <Badge variant="outline">{value as string}</Badge>
        );

      case 'text':
      default:
        return (
          <p className="text-sm whitespace-pre-wrap">{value as string || 'No response'}</p>
        );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Interview Responses{userName && ` - ${userName}`}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {interviewQuestions.map((question, index) => {
          const response = getResponseForQuestion(question.key);
          
          return (
            <div key={question.key}>
              {index > 0 && <Separator className="mb-6" />}
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-muted-foreground">
                  Q{index + 1}. {question.question}
                </h4>
                <div className="pl-4">
                  {response ? (
                    renderResponseValue(response)
                  ) : (
                    <span className="text-muted-foreground text-sm italic">No response</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
