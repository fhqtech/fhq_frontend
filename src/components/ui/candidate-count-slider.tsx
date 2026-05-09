import React, { useState } from 'react';
import { Button } from './button';
import { Input } from './input';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { Users, X } from 'phosphor-react';
import { cn } from '../../lib/utils';

interface CandidateRange {
  min?: number;
  max?: number;
}

interface CandidateCountSliderProps {
  value?: CandidateRange;
  onChange: (candidateRange: CandidateRange | undefined) => void;
  className?: string;
  placeholder?: string;
  maxCandidates?: number;
}

export const CandidateCountSlider: React.FC<CandidateCountSliderProps> = ({
  value,
  onChange,
  className,
  placeholder = "Any count",
  maxCandidates = 100
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [minValue, setMinValue] = useState(value?.min?.toString() || '');
  const [maxValue, setMaxValue] = useState(value?.max?.toString() || '');

  const applyCandidateRange = () => {
    const newRange: CandidateRange = {};
    
    if (minValue && !isNaN(Number(minValue))) {
      newRange.min = Math.max(0, Number(minValue));
    }
    if (maxValue && !isNaN(Number(maxValue))) {
      newRange.max = Math.max(0, Number(maxValue));
    }
    
    // Ensure min <= max
    if (newRange.min !== undefined && newRange.max !== undefined && newRange.min > newRange.max) {
      const temp = newRange.min;
      newRange.min = newRange.max;
      newRange.max = temp;
    }
    
    if (newRange.min !== undefined || newRange.max !== undefined) {
      onChange(newRange);
    } else {
      onChange(undefined);
    }
    
    setIsOpen(false);
  };

  const clearCandidateRange = () => {
    setMinValue('');
    setMaxValue('');
    onChange(undefined);
    setIsOpen(false);
  };

  const getDisplayText = () => {
    if (!value || (value.min === undefined && value.max === undefined)) {
      return placeholder;
    }
    
    const min = value.min !== undefined ? value.min.toString() : '0';
    const max = value.max !== undefined ? value.max.toString() : '∞';
    
    if (value.min !== undefined && value.max !== undefined) {
      return `${min} - ${max} candidates`;
    } else if (value.min !== undefined) {
      return `${min}+ candidates`;
    } else if (value.max !== undefined) {
      return `Up to ${max} candidates`;
    }
    
    return placeholder;
  };

  const hasValue = value && (value.min !== undefined || value.max !== undefined);

  const setQuickRange = (min?: number, max?: number) => {
    setMinValue(min !== undefined ? min.toString() : '');
    setMaxValue(max !== undefined ? max.toString() : '');
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={hasValue ? "default" : "outline"}
          className={cn(
            "h-7 px-3 text-xs font-medium justify-start text-left",
            hasValue && "bg-brand-primary text-white",
            className
          )}
        >
          <Users className="w-3 h-3 mr-1" />
          {getDisplayText()}
          {hasValue && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                clearCandidateRange();
              }}
              className="ml-auto hover:bg-white/20 rounded-sm p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="start">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">Candidate Count Range</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearCandidateRange}
              className="h-6 px-2 text-xs text-foreground-muted hover:text-foreground"
            >
              Clear
            </Button>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground-muted">
                Minimum
              </label>
              <Input
                type="number"
                min="0"
                max={maxCandidates}
                value={minValue}
                onChange={(e) => setMinValue(e.target.value)}
                placeholder="0"
                className="text-xs"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground-muted">
                Maximum
              </label>
              <Input
                type="number"
                min="0"
                max={maxCandidates}
                value={maxValue}
                onChange={(e) => setMaxValue(e.target.value)}
                placeholder="No limit"
                className="text-xs"
              />
            </div>
          </div>
          
          {/* Quick Select Buttons */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-foreground-muted">
              Quick Select
            </label>
            <div className="flex flex-wrap gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setQuickRange(1)}
                className="h-6 px-2 text-xs"
              >
                Has Candidates
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setQuickRange(1, 10)}
                className="h-6 px-2 text-xs"
              >
                1-10
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setQuickRange(11, 50)}
                className="h-6 px-2 text-xs"
              >
                11-50
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setQuickRange(51)}
                className="h-6 px-2 text-xs"
              >
                50+
              </Button>
            </div>
          </div>
          
          {/* Range Visualization */}
          {(minValue || maxValue) && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground-muted">
                Preview
              </label>
              <div className="p-2 bg-muted rounded text-xs text-foreground-muted">
                {getDisplayText()}
              </div>
            </div>
          )}
          
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="flex-1 h-8 text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={applyCandidateRange}
              className="flex-1 h-8 text-xs bg-brand-primary hover:bg-brand-primary/90"
            >
              Apply
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};