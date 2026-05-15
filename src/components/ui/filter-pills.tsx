import React from 'react';
import { Button } from './button';
import { Badge } from './badge';
import { DateRangePicker } from './date-range-picker';
import { CandidateCountSlider } from './candidate-count-slider';
import { X, Funnel as Filter, Calendar, Users } from 'phosphor-react';
import { cn } from '../../lib/utils';
import { STATUS_OPTIONS, TYPE_OPTIONS } from '../../utils/filterUtils';

interface FilterPillsProps {
  activeFilters: {
    search?: string;
    status?: string[];
    type?: string[];
    dateRange?: { start?: string; end?: string };
    candidateCount?: { min?: number; max?: number };
  };
  filterCounts?: {
    status: Record<string, number>;
    type: Record<string, number>;
    total: number;
  } | null;
  onStatusFilter: (statuses: string[]) => void;
  onTypeFilter: (types: string[]) => void;
  onThisWeekFilter: () => void;
  onDateRangeFilter: (dateRange: { start?: string; end?: string } | undefined) => void;
  onCandidateCountFilter: (candidateRange: { min?: number; max?: number } | undefined) => void;
  onClearFilter: (filterType: string) => void;
  onClearAll: () => void;
}

export const FilterPills: React.FC<FilterPillsProps> = ({
  activeFilters,
  filterCounts,
  onStatusFilter,
  onTypeFilter,
  onThisWeekFilter,
  onDateRangeFilter,
  onCandidateCountFilter,
  onClearFilter,
  onClearAll
}) => {
  const hasActiveFilters = !!(
    activeFilters.search ||
    (activeFilters.status && activeFilters.status.length > 0) ||
    (activeFilters.type && activeFilters.type.length > 0) ||
    activeFilters.dateRange?.start ||
    activeFilters.dateRange?.end ||
    activeFilters.candidateCount?.min !== undefined ||
    activeFilters.candidateCount?.max !== undefined
  );

  const getStatusCount = (status: string) => filterCounts?.status[status] || 0;
  const getTypeCount = (type: string) => filterCounts?.type[type] || 0;

  return (
    <div className="flex flex-col gap-3">
      {/* Quick Action Pills */}
      <div className="flex flex-wrap gap-1.5 sm:gap-2">
        {/* All Pills */}
        <Button
          variant={!hasActiveFilters ? "default" : "outline-solid"}
          size="sm"
          onClick={onClearAll}
          className={cn(
            "h-7 px-3 text-xs font-medium",
            !hasActiveFilters && "bg-ink text-white"
          )}
        >
          All
          {filterCounts && (
            <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
              {filterCounts.total}
            </Badge>
          )}
        </Button>

        {/* Status Pills */}
        {STATUS_OPTIONS.slice(0, 3).map((status) => {
          const isActive = activeFilters.status?.includes(status.value);
          const count = getStatusCount(status.value);
          
          if (count === 0) return null;
          
          return (
            <Button
              key={status.value}
              variant={isActive ? "default" : "outline-solid"}
              size="sm"
              onClick={() => {
                if (isActive) {
                  onStatusFilter(activeFilters.status?.filter(s => s !== status.value) || []);
                } else {
                  onStatusFilter([...(activeFilters.status || []), status.value]);
                }
              }}
              className={cn(
                "h-7 px-3 text-xs font-medium",
                isActive && "bg-ink text-white"
              )}
            >
              {status.label}
              <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                {count}
              </Badge>
            </Button>
          );
        })}

        {/* This Week Quick Button */}
        <Button
          variant={activeFilters.dateRange?.start ? "default" : "outline-solid"}
          size="sm"
          onClick={onThisWeekFilter}
          className={cn(
            "h-7 px-3 text-xs font-medium",
            activeFilters.dateRange?.start && "bg-ink text-white"
          )}
        >
          <Calendar className="w-3 h-3 mr-1" />
          This Week
        </Button>

        {/* Date Range Picker */}
        <DateRangePicker
          value={activeFilters.dateRange}
          onChange={onDateRangeFilter}
          placeholder="Custom Range"
        />

        {/* Has Candidates Quick Button */}
        <Button
          variant={activeFilters.candidateCount?.min ? "default" : "outline-solid"}
          size="sm"
          onClick={() => {
            if (activeFilters.candidateCount?.min) {
              onClearFilter('candidateCount');
            } else {
              // Set filter for interviews with candidates > 0
              onCandidateCountFilter({ min: 1 });
            }
          }}
          className={cn(
            "h-7 px-3 text-xs font-medium",
            activeFilters.candidateCount?.min && "bg-ink text-white"
          )}
        >
          <Users className="w-3 h-3 mr-1" />
          Has Candidates
        </Button>

        {/* Candidate Count Slider */}
        <CandidateCountSlider
          value={activeFilters.candidateCount}
          onChange={onCandidateCountFilter}
          placeholder="Candidate Range"
        />
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-1.5 sm:gap-2 pb-2 border-b border-border">
          <div className="flex items-center text-xs text-muted">
            <Filter className="w-3 h-3 mr-1" />
            Active filters:
          </div>
          
          {/* Search Filter */}
          {activeFilters.search && (
            <Badge variant="outline" className="flex items-center gap-1 px-2 py-1">
              Search: "{activeFilters.search}"
              <button
                onClick={() => onClearFilter('search')}
                className="hover:bg-destructive/10 rounded-sm p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}

          {/* Status Filters */}
          {activeFilters.status?.map(status => {
            const statusOption = STATUS_OPTIONS.find(s => s.value === status);
            return (
              <Badge key={status} variant="outline" className="flex items-center gap-1 px-2 py-1">
                {statusOption?.label || status}
                <button
                  onClick={() => onStatusFilter(activeFilters.status?.filter(s => s !== status) || [])}
                  className="hover:bg-destructive/10 rounded-sm p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            );
          })}

          {/* Type Filters */}
          {activeFilters.type?.map(type => {
            const typeOption = TYPE_OPTIONS.find(t => t.value === type);
            return (
              <Badge key={type} variant="outline" className="flex items-center gap-1 px-2 py-1">
                {typeOption?.icon} {typeOption?.label || type}
                <button
                  onClick={() => onTypeFilter(activeFilters.type?.filter(t => t !== type) || [])}
                  className="hover:bg-destructive/10 rounded-sm p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            );
          })}

          {/* Date Range Filter */}
          {(activeFilters.dateRange?.start || activeFilters.dateRange?.end) && (
            <Badge variant="outline" className="flex items-center gap-1 px-2 py-1">
              <Calendar className="w-3 h-3" />
              {activeFilters.dateRange.start || 'Start'} - {activeFilters.dateRange.end || 'End'}
              <button
                onClick={() => onClearFilter('dateRange')}
                className="hover:bg-destructive/10 rounded-sm p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}

          {/* Candidate Count Filter */}
          {(activeFilters.candidateCount?.min !== undefined || activeFilters.candidateCount?.max !== undefined) && (
            <Badge variant="outline" className="flex items-center gap-1 px-2 py-1">
              <Users className="w-3 h-3" />
              {activeFilters.candidateCount.min || 0} - {activeFilters.candidateCount.max || '∞'} candidates
              <button
                onClick={() => onClearFilter('candidateCount')}
                className="hover:bg-destructive/10 rounded-sm p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}

          {/* Clear All */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearAll}
              className="h-6 px-2 text-xs text-muted hover:text-foreground"
            >
              Clear all
            </Button>
          )}
        </div>
      )}
    </div>
  );
};