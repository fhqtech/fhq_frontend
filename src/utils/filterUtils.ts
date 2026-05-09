import { format, subWeeks, startOfDay, endOfDay } from 'date-fns';

export interface FilterParams {
  search?: string;
  status?: string[];
  type?: string[];
  dateRange?: {
    start?: string;
    end?: string;
  };
  candidateCount?: {
    min?: number;
    max?: number;
  };
  sortBy?: 'created' | 'title' | 'candidates' | 'status';
  sortOrder?: 'asc' | 'desc';
  
  // Advanced filters
  voiceType?: string[];
  duration?: string[];
  communications?: string[];
}

export interface FilterCounts {
  total: number;
  status: Record<string, number>;
  type: Record<string, number>;
  candidate_ranges: Record<string, number>;
}

export const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft', color: 'bg-gray-100 text-gray-700' },
  { value: 'active', label: 'Active', color: 'bg-green-100 text-green-700' },
  { value: 'completed', label: 'Completed', color: 'bg-blue-100 text-blue-700' },
  { value: 'paused', label: 'Paused', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'archived', label: 'Archived', color: 'bg-red-100 text-red-700' },
];

export const TYPE_OPTIONS = [
  { value: 'screening', label: 'Screening', icon: '🎯' },
  { value: 'fitment', label: 'Role Fitment', icon: '🤝' },
];

export const DURATION_OPTIONS = [
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '60 min' },
  { value: 90, label: '90 min' },
];

export const SORT_OPTIONS = [
  { value: 'created-desc', label: 'Newest First', sortBy: 'created', sortOrder: 'desc' },
  { value: 'created-asc', label: 'Oldest First', sortBy: 'created', sortOrder: 'asc' },
  { value: 'title-asc', label: 'Title A-Z', sortBy: 'title', sortOrder: 'asc' },
  { value: 'title-desc', label: 'Title Z-A', sortBy: 'title', sortOrder: 'desc' },
  { value: 'candidates-desc', label: 'Most Candidates', sortBy: 'candidates', sortOrder: 'desc' },
  { value: 'candidates-asc', label: 'Least Candidates', sortBy: 'candidates', sortOrder: 'asc' },
];

export const getThisWeekFilter = (): FilterParams => {
  const now = new Date();
  const weekAgo = subWeeks(now, 1);
  
  return {
    dateRange: {
      start: format(startOfDay(weekAgo), 'dd/MM/yyyy'),
      end: format(endOfDay(now), 'dd/MM/yyyy')
    }
  };
};

export const buildFilterQueryString = (filters: FilterParams): string => {
  const params = new URLSearchParams();
  
  if (filters.search) {
    params.set('search', filters.search);
  }
  
  if (filters.status && filters.status.length > 0) {
    filters.status.forEach(status => params.append('status', status));
  }
  
  if (filters.type && filters.type.length > 0) {
    filters.type.forEach(type => params.append('type', type));
  }
  
  if (filters.dateRange?.start) {
    params.set('start_date', filters.dateRange.start);
  }
  
  if (filters.dateRange?.end) {
    params.set('end_date', filters.dateRange.end);
  }
  
  if (filters.candidateCount?.min !== undefined) {
    params.set('min_candidates', filters.candidateCount.min.toString());
  }
  
  if (filters.candidateCount?.max !== undefined) {
    params.set('max_candidates', filters.candidateCount.max.toString());
  }
  
  return params.toString();
};

export const getActiveFilterCount = (filters: FilterParams): number => {
  let count = 0;
  
  if (filters.search) count++;
  if (filters.status && filters.status.length > 0) count++;
  if (filters.type && filters.type.length > 0) count++;
  if (filters.dateRange?.start || filters.dateRange?.end) count++;
  if (filters.candidateCount?.min !== undefined || filters.candidateCount?.max !== undefined) count++;
  
  // Advanced filters
  if (filters.voiceType && filters.voiceType.length > 0) count++;
  if (filters.duration && filters.duration.length > 0) count++;
  if (filters.communications && filters.communications.length > 0) count++;
  
  return count;
};

export const getFilterSummary = (filters: FilterParams): string[] => {
  const summary: string[] = [];
  
  if (filters.search) {
    summary.push(`Search: "${filters.search}"`);
  }
  
  if (filters.status && filters.status.length > 0) {
    summary.push(`Status: ${filters.status.join(', ')}`);
  }
  
  if (filters.type && filters.type.length > 0) {
    summary.push(`Type: ${filters.type.join(', ')}`);
  }
  
  if (filters.dateRange?.start || filters.dateRange?.end) {
    const start = filters.dateRange.start || 'Start';
    const end = filters.dateRange.end || 'End';
    summary.push(`Date: ${start} - ${end}`);
  }
  
  if (filters.candidateCount?.min !== undefined || filters.candidateCount?.max !== undefined) {
    const min = filters.candidateCount.min ?? 0;
    const max = filters.candidateCount.max ?? '∞';
    summary.push(`Candidates: ${min}-${max}`);
  }
  
  return summary;
};

export const clearFilters = (): FilterParams => ({
  search: '',
  status: [],
  type: [],
  dateRange: undefined,
  candidateCount: undefined,
  sortBy: 'created',
  sortOrder: 'desc',
});