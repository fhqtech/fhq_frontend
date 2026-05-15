import React, { useState } from 'react';
import { Button } from './button';
import { Input } from './input';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { Calendar, X } from 'phosphor-react';
import { cn } from '../../lib/utils';

interface DateRange {
  start?: string;
  end?: string;
}

interface DateRangePickerProps {
  value?: DateRange;
  onChange: (dateRange: DateRange | undefined) => void;
  className?: string;
  placeholder?: string;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  value,
  onChange,
  className,
  placeholder = "Select date range"
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [startDate, setStartDate] = useState(value?.start || '');
  const [endDate, setEndDate] = useState(value?.end || '');

  const formatDateForInput = (dateStr: string) => {
    if (!dateStr) return '';
    
    // If it's already in YYYY-MM-DD format, return as-is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }
    
    // If it's in DD/MM/YYYY format, convert to YYYY-MM-DD
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
      const [day, month, year] = dateStr.split('/');
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    
    return dateStr;
  };

  const formatDateForDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    
    // Convert YYYY-MM-DD to DD/MM/YYYY for display
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [year, month, day] = dateStr.split('-');
      return `${day}/${month}/${year}`;
    }
    
    return dateStr;
  };

  const applyDateRange = () => {
    const newRange: DateRange = {};
    
    if (startDate) {
      newRange.start = formatDateForDisplay(startDate);
    }
    if (endDate) {
      newRange.end = formatDateForDisplay(endDate);
    }
    
    if (newRange.start || newRange.end) {
      onChange(newRange);
    } else {
      onChange(undefined);
    }
    
    setIsOpen(false);
  };

  const clearDateRange = () => {
    setStartDate('');
    setEndDate('');
    onChange(undefined);
    setIsOpen(false);
  };

  const getDisplayText = () => {
    if (!value || (!value.start && !value.end)) {
      return placeholder;
    }
    
    const start = value.start || 'Start';
    const end = value.end || 'End';
    return `${start} - ${end}`;
  };

  const hasValue = value && (value.start || value.end);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={hasValue ? "default" : "outline"}
          className={cn(
            "h-7 px-3 text-xs font-medium justify-start text-left",
            hasValue && "bg-ink text-white",
            className
          )}
        >
          <Calendar className="w-3 h-3 mr-1" />
          {getDisplayText()}
          {hasValue && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                clearDateRange();
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
            <h4 className="font-medium text-sm">Select Date Range</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearDateRange}
              className="h-6 px-2 text-xs text-muted hover:text-foreground"
            >
              Clear
            </Button>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted">
                Start Date
              </label>
              <Input
                type="date"
                value={formatDateForInput(startDate)}
                onChange={(e) => setStartDate(e.target.value)}
                className="text-xs"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted">
                End Date
              </label>
              <Input
                type="date"
                value={formatDateForInput(endDate)}
                onChange={(e) => setEndDate(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>
          
          {/* Quick Select Buttons */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted">
              Quick Select
            </label>
            <div className="flex flex-wrap gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const today = new Date();
                  const todayStr = today.toISOString().split('T')[0];
                  setStartDate(todayStr);
                  setEndDate(todayStr);
                }}
                className="h-6 px-2 text-xs"
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const today = new Date();
                  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
                  setStartDate(weekAgo.toISOString().split('T')[0]);
                  setEndDate(today.toISOString().split('T')[0]);
                }}
                className="h-6 px-2 text-xs"
              >
                Last 7 days
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const today = new Date();
                  const monthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
                  setStartDate(monthAgo.toISOString().split('T')[0]);
                  setEndDate(today.toISOString().split('T')[0]);
                }}
                className="h-6 px-2 text-xs"
              >
                Last 30 days
              </Button>
            </div>
          </div>
          
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
              onClick={applyDateRange}
              className="flex-1 h-8 text-xs bg-ink hover:bg-ink/90"
            >
              Apply
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};