import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FilterParams, FilterCounts, buildFilterQueryString, clearFilters, getActiveFilterCount } from '../utils/filterUtils';

interface Interview {
  id: string;
  title: string;
  type: string;
  description?: string;
  created: string;
  status: string;
  candidates: number;
  participationRate: number;
  duration: string;
  voiceType: string;
  voiceAccent: string;
  voiceSpeed: string;
  communications: {
    email: boolean;
    phone: boolean;
    sms: boolean;
  };
}

interface UseInterviewFiltersReturn {
  // Data
  interviews: Interview[];
  filteredInterviews: Interview[];
  filterCounts: FilterCounts | null;
  isLoading: boolean;
  error: string | null;
  
  // Filter state
  filters: FilterParams;
  activeFilterCount: number;
  
  // Actions
  setFilters: (filters: FilterParams) => void;
  updateFilter: (key: keyof FilterParams, value: any) => void;
  clearAllFilters: () => void;
  refetch: () => void;
  updateInterview: (interviewId: string, updatedData: Partial<Interview>) => void;
  
  // Quick filters
  setStatusFilter: (statuses: string[]) => void;
  setTypeFilter: (types: string[]) => void;
  setSearchFilter: (search: string) => void;
  setThisWeekFilter: () => void;
}

export const useInterviewFilters = (): UseInterviewFiltersReturn => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [filterCounts, setFilterCounts] = useState<FilterCounts | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cache key for local storage
  const CACHE_KEY = 'interview_filters_cache';
  const CACHE_TIMESTAMP_KEY = 'interview_filters_cache_timestamp';
  const CACHE_DURATION = 30000; // 30 seconds

  // Cache management functions
  const getCachedInterviews = useCallback(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
      
      if (cached && timestamp) {
        const cacheAge = Date.now() - parseInt(timestamp);
        if (cacheAge < CACHE_DURATION) {
          return JSON.parse(cached);
        }
      }
    } catch (err) {
      console.warn('Error reading cache:', err);
    }
    return null;
  }, []);

  const setCachedInterviews = useCallback((interviews: Interview[]) => {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(interviews));
      localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
    } catch (err) {
      console.warn('Error setting cache:', err);
    }
  }, []);

  // Initialize filters from URL params
  const [filters, setFiltersState] = useState<FilterParams>(() => {
    const params = Object.fromEntries(searchParams.entries());
    return {
      search: params.search || '',
      status: searchParams.getAll('status') || [],
      type: searchParams.getAll('type') || [],
      dateRange: (params.start_date || params.end_date) ? {
        start: params.start_date,
        end: params.end_date
      } : undefined,
      candidateCount: (params.min_candidates || params.max_candidates) ? {
        min: params.min_candidates ? parseInt(params.min_candidates) : undefined,
        max: params.max_candidates ? parseInt(params.max_candidates) : undefined
      } : undefined,
      sortBy: (params.sort_by as any) || 'created',
      sortOrder: (params.sort_order as any) || 'desc',
      
      // Advanced filters
      voiceType: searchParams.getAll('voice_type').length > 0 ? searchParams.getAll('voice_type') : undefined,
      duration: searchParams.getAll('duration').length > 0 ? searchParams.getAll('duration') : undefined,
      communications: searchParams.getAll('communications').length > 0 ? searchParams.getAll('communications') : undefined
    };
  });

  // Fetch interviews based on current filters
  const fetchInterviews = useCallback(async (skipCache = false) => {
    // Try to load from cache first if not skipping cache
    if (!skipCache) {
      const cachedInterviews = getCachedInterviews();
      if (cachedInterviews) {
        setInterviews(cachedInterviews);
        setIsLoading(false);
        return;
      }
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const queryString = buildFilterQueryString(filters);
      const url = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8082'}/api/interviews${queryString ? `?${queryString}` : ''}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        const interviews = data.interviews || [];
        setInterviews(interviews);
        setCachedInterviews(interviews);
      } else {
        throw new Error(data.error || 'Failed to fetch interviews');
      }
    } catch (err) {
      console.error('Error fetching interviews:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch interviews');
      setInterviews([]);
    } finally {
      setIsLoading(false);
    }
  }, [filters, getCachedInterviews, setCachedInterviews]);

  // Fetch filter counts
  const fetchFilterCounts = useCallback(async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8082'}/api/interviews/filters/counts`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setFilterCounts(data.counts);
        }
      }
    } catch (err) {
      console.error('Error fetching filter counts:', err);
    }
  }, []);

  // Update URL params when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    
    if (filters.search) params.set('search', filters.search);
    if (filters.status && filters.status.length > 0) {
      filters.status.forEach(status => params.append('status', status));
    }
    if (filters.type && filters.type.length > 0) {
      filters.type.forEach(type => params.append('type', type));
    }
    if (filters.dateRange?.start) params.set('start_date', filters.dateRange.start);
    if (filters.dateRange?.end) params.set('end_date', filters.dateRange.end);
    if (filters.candidateCount?.min !== undefined) {
      params.set('min_candidates', filters.candidateCount.min.toString());
    }
    if (filters.candidateCount?.max !== undefined) {
      params.set('max_candidates', filters.candidateCount.max.toString());
    }
    if (filters.sortBy && filters.sortBy !== 'created') params.set('sort_by', filters.sortBy);
    if (filters.sortOrder && filters.sortOrder !== 'desc') params.set('sort_order', filters.sortOrder);
    
    // Advanced filters
    if (filters.voiceType && filters.voiceType.length > 0) {
      filters.voiceType.forEach(voice => params.append('voice_type', voice));
    }
    if (filters.duration && filters.duration.length > 0) {
      filters.duration.forEach(dur => params.append('duration', dur));
    }
    if (filters.communications && filters.communications.length > 0) {
      filters.communications.forEach(comm => params.append('communications', comm));
    }
    
    setSearchParams(params);
  }, [filters, setSearchParams]);

  // Fetch data when filters change
  useEffect(() => {
    fetchInterviews();
  }, [fetchInterviews]);

  // Fetch filter counts on mount
  useEffect(() => {
    fetchFilterCounts();
  }, [fetchFilterCounts]);

  // Filter actions
  const setFilters = useCallback((newFilters: FilterParams) => {
    setFiltersState(newFilters);
  }, []);

  const updateFilter = useCallback((key: keyof FilterParams, value: any) => {
    setFiltersState(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  const clearAllFilters = useCallback(() => {
    setFiltersState(clearFilters());
  }, []);

  const refetch = useCallback(() => {
    // Force refresh by skipping cache
    fetchInterviews(true);
    fetchFilterCounts();
  }, [fetchInterviews, fetchFilterCounts]);

  // Quick filter actions
  const setStatusFilter = useCallback((statuses: string[]) => {
    updateFilter('status', statuses);
  }, [updateFilter]);

  const setTypeFilter = useCallback((types: string[]) => {
    updateFilter('type', types);
  }, [updateFilter]);

  const setSearchFilter = useCallback((search: string) => {
    updateFilter('search', search);
  }, [updateFilter]);

  const setThisWeekFilter = useCallback(() => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    updateFilter('dateRange', {
      start: weekAgo.toLocaleDateString('en-GB'),
      end: now.toLocaleDateString('en-GB')
    });
  }, [updateFilter]);

  // Update a specific interview in the list
  const updateInterview = useCallback((interviewId: string, updatedData: Partial<Interview>) => {
    setInterviews(prevInterviews => {
      const updatedInterviews = prevInterviews.map(interview => 
        interview.id === interviewId 
          ? { ...interview, ...updatedData }
          : interview
      );
      
      // Update cache with the new data
      setCachedInterviews(updatedInterviews);
      
      return updatedInterviews;
    });
  }, [setCachedInterviews]);

  // Client-side filtering for better responsiveness (fallback)
  const filteredInterviews = useMemo(() => {
    return interviews; // Backend handles filtering, but we keep this for consistency
  }, [interviews]);

  const activeFilterCount = useMemo(() => getActiveFilterCount(filters), [filters]);

  return {
    // Data
    interviews,
    filteredInterviews,
    filterCounts,
    isLoading,
    error,
    
    // Filter state
    filters,
    activeFilterCount,
    
    // Actions
    setFilters,
    updateFilter,
    clearAllFilters,
    refetch,
    updateInterview,
    
    // Quick filters
    setStatusFilter,
    setTypeFilter,
    setSearchFilter,
    setThisWeekFilter,
  };
};