import React, { useState } from 'react';
import { Button } from './button';
import { Badge } from './badge';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { Input } from './input';
import { CaretDown as ChevronDown, Check, X, MagnifyingGlass as Search } from 'phosphor-react';
import { cn } from '../../lib/utils';

interface MultiSelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  count?: number;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  value?: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  className?: string;
  maxDisplay?: number;
  searchable?: true;
  icon?: React.ReactNode;
}

export const MultiSelect: React.FC<MultiSelectProps> = ({
  options,
  value = [],
  onChange,
  placeholder = "Select options",
  className,
  maxDisplay = 2,
  searchable = true,
  icon
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredOptions = searchable 
    ? options.filter(option => 
        option.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        option.value.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : options;

  const selectedOptions = options.filter(option => value.includes(option.value));

  const getDisplayText = () => {
    if (value.length === 0) {
      return placeholder;
    }

    if (value.length <= maxDisplay) {
      return selectedOptions.map(option => option.label).join(', ');
    }

    const displayedOptions = selectedOptions.slice(0, maxDisplay);
    const remainingCount = value.length - maxDisplay;
    return `${displayedOptions.map(option => option.label).join(', ')} +${remainingCount}`;
  };

  const toggleOption = (optionValue: string) => {
    const newValue = value.includes(optionValue)
      ? value.filter(v => v !== optionValue)
      : [...value, optionValue];
    
    onChange(newValue);
  };

  const clearAll = () => {
    onChange([]);
    setIsOpen(false);
  };

  const selectAll = () => {
    const allValues = filteredOptions.map(option => option.value);
    onChange(allValues);
  };

  const hasValue = value.length > 0;

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
          {icon && <span className="w-3 h-3 mr-1">{icon}</span>}
          <span className="truncate flex-1">{getDisplayText()}</span>
          <ChevronDown className="w-3 h-3 ml-1 flex-shrink-0" />
          {hasValue && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                clearAll();
              }}
              className="ml-1 hover:bg-white/20 rounded-sm p-0.5 flex-shrink-0"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-3 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">Select Options</h4>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={selectAll}
                className="h-6 px-2 text-xs text-muted hover:text-foreground"
              >
                Select All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAll}
                className="h-6 px-2 text-xs text-muted hover:text-foreground"
              >
                Clear
              </Button>
            </div>
          </div>

          {/* Search */}
          {searchable && (
            <div className="relative">
              <Search className="w-3 h-3 absolute left-2 top-2.5 text-muted" />
              <Input
                placeholder="Search options..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-7 h-8 text-xs"
              />
            </div>
          )}

          {/* Selected Count */}
          {value.length > 0 && (
            <div className="text-xs text-muted">
              {value.length} of {options.length} selected
            </div>
          )}

          {/* Options List */}
          <div className="max-h-48 overflow-y-auto space-y-1">
            {filteredOptions.length === 0 ? (
              <div className="text-xs text-muted text-center py-4">
                No options found
              </div>
            ) : (
              filteredOptions.map((option) => (
                <div
                  key={option.value}
                  onClick={() => toggleOption(option.value)}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded cursor-pointer text-xs",
                    "hover:bg-muted transition-colors",
                    value.includes(option.value) && "bg-ink/10"
                  )}
                >
                  <div className={cn(
                    "w-4 h-4 border rounded flex items-center justify-center",
                    value.includes(option.value) 
                      ? "bg-ink border-ink" 
                      : "border-border"
                  )}>
                    {value.includes(option.value) && (
                      <Check className="w-3 h-3 text-white" />
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 flex-1">
                    {option.icon && <span className="w-3 h-3">{option.icon}</span>}
                    <span className="flex-1">{option.label}</span>
                    {option.count !== undefined && (
                      <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                        {option.count}
                      </Badge>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};