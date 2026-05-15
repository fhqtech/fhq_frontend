import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, CheckCircle } from 'lucide-react';

interface InteractiveQuestionPanelProps {
  task: any;
  onSubmit: (answer: string) => void;
}

// MCQ Task Component
const MCQTask = ({ options, onSubmit }: { options: string[]; onSubmit: (answer: string) => void }) => {
  const [selectedValue, setSelectedValue] = useState<string | null>(null);

  const handleSubmit = () => {
    if (selectedValue) {
      onSubmit(selectedValue);
    }
  };

  if (!Array.isArray(options) || options.length === 0) {
    return (
      <div className="text-destructive p-4 bg-destructive/10 rounded-lg">
        <p className="font-bold">Component Error</p>
        <p>No options were provided for this multiple-choice question.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 w-full max-w-lg">
      <RadioGroup onValueChange={setSelectedValue} className="space-y-2">
        {options.map((option, index) => (
          <div key={index} className="flex items-center space-x-2 bg-paper-2 p-4 rounded-lg border border-rule ">
            <RadioGroupItem value={option} id={`option-${index}`} />
            <Label htmlFor={`option-${index}`} className="flex-1 text-base cursor-pointer">
              {option}
            </Label>
          </div>
        ))}
      </RadioGroup>
      <Button onClick={handleSubmit} disabled={!selectedValue} className="w-full">
        Submit Answer
      </Button>
    </div>
  );
};

// Long Text Task Component
const LongTextTask = ({ description }: { description: string }) => {
  return (
    <div className="p-6 flex flex-col gap-6 h-full">
      <ScrollArea className="grow pr-4">
        <p className="text-sm text-ink-soft whitespace-pre-wrap">
          {description}
        </p>
      </ScrollArea>
    </div>
  );
};

// Text Input Task Component
const TextInputTask = ({ description, onSubmit }: { description: string; onSubmit: (answer: string) => void }) => {
  const [answer, setAnswer] = useState('');

  const handleSubmit = () => {
    if (answer.trim()) {
      onSubmit(answer);
      setAnswer('');
    }
  };

  return (
    <div className="space-y-4 w-full max-w-lg">
      <div className="bg-paper-2 p-4 rounded-lg border border-rule ">
        <p className="text-sm text-ink-soft whitespace-pre-wrap">
          {description}
        </p>
      </div>
      <Textarea
        placeholder="Type your answer here..."
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        className="min-h-[120px]"
      />
      <Button onClick={handleSubmit} disabled={!answer.trim()} className="w-full">
        Submit Answer
      </Button>
    </div>
  );
};

// Rating Scale Task Component
const RatingTask = ({ description, scale, onSubmit }: { 
  description: string; 
  scale: { min: number; max: number; labels?: string[] };
  onSubmit: (answer: string) => void;
}) => {
  const [selectedRating, setSelectedRating] = useState<number | null>(null);

  const handleSubmit = () => {
    if (selectedRating !== null) {
      onSubmit(selectedRating.toString());
    }
  };

  const ratings = Array.from({ length: scale.max - scale.min + 1 }, (_, i) => scale.min + i);

  return (
    <div className="space-y-4 w-full max-w-lg">
      <div className="bg-paper-2 p-4 rounded-lg border border-rule ">
        <p className="text-sm text-ink-soft whitespace-pre-wrap">
          {description}
        </p>
      </div>
      <div className="space-y-3">
        <div className="flex justify-between text-sm text-muted">
          <span>{scale.labels?.[0] || `${scale.min}`}</span>
          <span>{scale.labels?.[1] || `${scale.max}`}</span>
        </div>
        <RadioGroup onValueChange={(value) => setSelectedRating(parseInt(value))} className="flex justify-between">
          {ratings.map((rating) => (
            <div key={rating} className="flex flex-col items-center space-y-2">
              <RadioGroupItem value={rating.toString()} id={`rating-${rating}`} />
              <Label htmlFor={`rating-${rating}`} className="text-sm cursor-pointer">
                {rating}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>
      <Button onClick={handleSubmit} disabled={selectedRating === null} className="w-full">
        Submit Rating
      </Button>
    </div>
  );
};

export const InteractiveQuestionPanel = ({ task, onSubmit }: InteractiveQuestionPanelProps) => {
  if (!task || !task.taskType) {
    return (
      <div className="text-destructive p-4 bg-destructive/10 rounded-lg flex items-center space-x-3">
        <AlertTriangle className="w-6 h-6" />
        <div>
          <p className="font-bold">Task Error</p>
          <p>The interactive task data is missing or malformed.</p>
        </div>
      </div>
    );
  }

  // Add task title if available
  const TaskHeader = () => (
    <div className="mb-6">
      {task.title && (
        <h3 className="text-lg font-semibold text-ink mb-2">
          {task.title}
        </h3>
      )}
      {task.instructions && (
        <p className="text-sm text-muted ">
          {task.instructions}
        </p>
      )}
    </div>
  );

  const renderTask = () => {
    switch (task.taskType) {
      case 'long_text':
      case 'information':
        return <LongTextTask description={task.description} />;
      
      case 'mcq':
      case 'multiple_choice':
        return <MCQTask options={task.options} onSubmit={onSubmit} />;
      
      case 'text_input':
      case 'short_answer':
        return <TextInputTask description={task.description} onSubmit={onSubmit} />;
      
      case 'rating':
      case 'scale':
        return <RatingTask 
          description={task.description} 
          scale={task.scale || { min: 1, max: 5 }} 
          onSubmit={onSubmit} 
        />;
      
      default:
        return (
          <div className="text-warning p-4 bg-warning/10 rounded-lg flex items-center space-x-3">
            <AlertTriangle className="w-6 h-6" />
            <div>
              <p className="font-bold">Unsupported Task Type</p>
              <p>The AI returned a task type that is not yet supported: "{task.taskType}"</p>
              <p className="text-xs mt-1">You can continue with voice responses.</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="bg-paper rounded-lg p-6 border border-rule shadow-1">
      <TaskHeader />
      {renderTask()}
    </div>
  );
};