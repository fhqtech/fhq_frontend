import React, { useState, useEffect } from 'react';
import { Button } from './button';
import { Input } from './input';
import { Badge } from './badge';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { BookmarkSimple as Bookmark, X, Plus, Trash as Trash2, FloppyDisk as Save } from 'phosphor-react';
import { cn } from '../../lib/utils';
import { FilterParams } from '../../utils/filterUtils';

interface FilterPreset {
  id: string;
  name: string;
  filters: FilterParams;
  createdAt: string;
}

interface FilterPresetsProps {
  currentFilters: FilterParams;
  onApplyPreset: (filters: FilterParams) => void;
  className?: string;
}

export const FilterPresets: React.FC<FilterPresetsProps> = ({
  currentFilters,
  onApplyPreset,
  className
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [presets, setPresets] = useState<FilterPreset[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');

  // Load presets from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('interview_filter_presets');
    if (saved) {
      try {
        const parsedPresets = JSON.parse(saved);
        setPresets(parsedPresets);
      } catch (error) {
        console.error('Error loading filter presets:', error);
      }
    }
  }, []);

  // Save presets to localStorage whenever they change
  const savePresetsToStorage = (updatedPresets: FilterPreset[]) => {
    try {
      localStorage.setItem('interview_filter_presets', JSON.stringify(updatedPresets));
      setPresets(updatedPresets);
    } catch (error) {
      console.error('Error saving filter presets:', error);
    }
  };

  const hasActiveFilters = () => {
    return !!(
      currentFilters.search ||
      (currentFilters.status && currentFilters.status.length > 0) ||
      (currentFilters.type && currentFilters.type.length > 0) ||
      currentFilters.dateRange?.start ||
      currentFilters.dateRange?.end ||
      currentFilters.candidateCount?.min !== undefined ||
      currentFilters.candidateCount?.max !== undefined ||
      (currentFilters.voiceType && currentFilters.voiceType.length > 0) ||
      (currentFilters.duration && currentFilters.duration.length > 0) ||
      (currentFilters.communications && currentFilters.communications.length > 0)
    );
  };

  const getPresetSummary = (filters: FilterParams) => {
    const parts: string[] = [];
    
    if (filters.search) parts.push(`"${filters.search}"`);
    if (filters.status && filters.status.length > 0) {
      parts.push(`${filters.status.length} status${filters.status.length > 1 ? 'es' : ''}`);
    }
    if (filters.type && filters.type.length > 0) {
      parts.push(`${filters.type.length} type${filters.type.length > 1 ? 's' : ''}`);
    }
    if (filters.dateRange?.start || filters.dateRange?.end) {
      parts.push('date range');
    }
    if (filters.candidateCount?.min !== undefined || filters.candidateCount?.max !== undefined) {
      parts.push('candidate count');
    }
    
    return parts.length > 0 ? parts.join(', ') : 'No filters';
  };

  const saveCurrentAsPreset = () => {
    if (!newPresetName.trim() || !hasActiveFilters()) return;

    const newPreset: FilterPreset = {
      id: Date.now().toString(),
      name: newPresetName.trim(),
      filters: { ...currentFilters },
      createdAt: new Date().toISOString()
    };

    const updatedPresets = [...presets, newPreset];
    savePresetsToStorage(updatedPresets);
    
    setNewPresetName('');
    setIsCreating(false);
  };

  const deletePreset = (presetId: string) => {
    const updatedPresets = presets.filter(preset => preset.id !== presetId);
    savePresetsToStorage(updatedPresets);
  };

  const applyPreset = (preset: FilterPreset) => {
    onApplyPreset(preset.filters);
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-7 px-3 text-xs font-medium",
            className
          )}
        >
          <Bookmark className="w-3 h-3 mr-1" />
          Presets
          {presets.length > 0 && (
            <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
              {presets.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">Filter Presets</h4>
            {hasActiveFilters() && !isCreating && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsCreating(true)}
                className="h-6 px-2 text-xs text-muted hover:text-foreground"
              >
                <Plus className="w-3 h-3 mr-1" />
                Save Current
              </Button>
            )}
          </div>

          {/* Save Current Filters Section */}
          {isCreating && (
            <div className="space-y-2 p-3 bg-muted rounded">
              <label className="text-xs font-medium text-muted">
                Preset Name
              </label>
              <div className="flex gap-2">
                <Input
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  placeholder="e.g., Active Interviews This Week"
                  className="text-xs"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveCurrentAsPreset();
                    if (e.key === 'Escape') {
                      setIsCreating(false);
                      setNewPresetName('');
                    }
                  }}
                />
                <Button
                  size="sm"
                  onClick={saveCurrentAsPreset}
                  disabled={!newPresetName.trim()}
                  aria-label="Save preset"
                  className="h-8 px-2"
                >
                  <Save className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsCreating(false);
                    setNewPresetName('');
                  }}
                  className="h-8 px-2"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
              <div className="text-xs text-muted">
                Current filters: {getPresetSummary(currentFilters)}
              </div>
            </div>
          )}

          {/* No Active Filters Message */}
          {!hasActiveFilters() && !isCreating && (
            <div className="text-xs text-muted text-center py-4">
              Apply some filters first to save as a preset
            </div>
          )}

          {/* Presets List */}
          {presets.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted">
                Saved Presets ({presets.length})
              </label>
              <div className="max-h-48 overflow-y-auto space-y-2">
                {presets.map((preset) => (
                  <div
                    key={preset.id}
                    className="flex items-start gap-2 p-2 rounded border border-border hover:bg-muted transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{preset.name}</div>
                      <div className="text-xs text-muted truncate">
                        {getPresetSummary(preset.filters)}
                      </div>
                      <div className="text-xs text-muted">
                        {new Date(preset.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => applyPreset(preset)}
                        className="h-6 px-2 text-xs"
                      >
                        Apply
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deletePreset(preset.id)}
                        className="h-6 px-2 text-xs text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No Presets Message */}
          {presets.length === 0 && !isCreating && hasActiveFilters() && (
            <div className="text-xs text-muted text-center py-4">
              No saved presets yet. Save your current filters to get started!
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};