import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileSpreadsheet, Upload, UserPlus, Trash2, Download } from 'lucide-react';
import { SourceConfigModal } from './SourceConfigModal';
import googleLogo from '@/assets/google_logo.png';
import csvIcon from '@/assets/csv-icon.png';

interface CandidateSource {
  id: string;
  type: 'google_sheet' | 'excel_file';
  name: string;
  candidateCount: number;
  status: 'validated' | 'ready';
  metadata?: any;
}

interface SourceManagerProps {
  sources: CandidateSource[];
  onSourcesChange: (sources: CandidateSource[]) => void;
  downloadSampleFormat?: () => void;
  className?: string;
}

export function SourceManager({ sources, onSourcesChange, downloadSampleFormat, className = '' }: SourceManagerProps) {
  const [showSourceModal, setShowSourceModal] = useState(false);
  const [selectedSourceType, setSelectedSourceType] = useState<'google_sheet' | 'excel_file' | null>(null);

  const sourceTypeOptions = [
    {
      type: 'google_sheet' as const,
      title: 'GOOGLE SHEETS',
      description: 'Import candidates from Google Sheets',
      icon: FileSpreadsheet,
      imageSrc: googleLogo,
      color: 'bg-green-50 border-green-200 hover:bg-green-100'
    },
    {
      type: 'excel_file' as const,
      title: 'EXCEL/CSV FILE',
      description: 'Upload Excel or CSV file with candidates',
      icon: Upload,
      imageSrc: csvIcon,
      color: 'bg-blue-50 border-blue-200 hover:bg-blue-100'
    }
  ];

  const handleAddSource = (sourceType: 'google_sheet' | 'excel_file') => {
    setSelectedSourceType(sourceType);
    setShowSourceModal(true);
  };

  const handleSourceAdded = (sourceData: any) => {
    const newSource: CandidateSource = {
      id: `source_${Date.now()}`,
      ...sourceData
    };

    onSourcesChange([...sources, newSource]);
    setShowSourceModal(false);
    setSelectedSourceType(null);
  };

  const handleRemoveSource = (sourceId: string) => {
    onSourcesChange(sources.filter(source => source.id !== sourceId));
  };

  const getSourceIcon = (type: string) => {
    switch (type) {
      case 'google_sheet':
        return '📊';
      case 'excel_file':
        return '📄';
      case 'manual_entry':
        return '✏️';
      default:
        return '📋';
    }
  };

  const getTotalCandidates = () => {
    return sources.reduce((total, source) => total + source.candidateCount, 0);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Add Sources Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-medium uppercase">Add Sources</h3>
          {downloadSampleFormat && (
            <Button
              variant="outline"
              size="sm"
              onClick={downloadSampleFormat}
              className="flex items-center space-x-2 text-xs"
            >
              <Download className="w-3 h-3" />
              <span>Download Sample Format</span>
            </Button>
          )}
        </div>
        <div className="flex gap-3">
          {sourceTypeOptions.map((option) => {
            return (
              <button
                key={option.type}
                type="button"
                onClick={() => handleAddSource(option.type)}
                className="h-10 text-xs font-medium px-6 rounded uppercase transition-all duration-200 flex items-center gap-2 hover:text-white"
                style={{
                  border: 'none',
                  position: 'relative',
                  overflow: 'hidden',
                  backgroundColor: 'transparent',
                  boxShadow: 'inset 1px 1px 2px #e8e8e8, 2px 2px 4px #d5d5d5'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#393E46';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <img src={option.imageSrc} alt={option.title} className="w-4 h-4 object-contain" />
                <span>{option.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Current Sources */}
      {sources.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-medium uppercase">Current Sources</h3>
            <Badge variant="secondary" className="text-xs rounded-sm">
              {getTotalCandidates()} candidates from {sources.length} sources
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {sources.map((source) => (
              <div key={source.id} className="flex items-center justify-between p-3 bg-muted rounded-sm border">
                <div className="flex items-center space-x-3">
                  <span className="text-lg">{getSourceIcon(source.type)}</span>
                  <div>
                    <p className="font-medium text-sm">{source.name}</p>
                    <p className="text-xs text-foreground-muted">
                      {source.candidateCount} candidates • {source.type.replace('_', ' ')}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveSource(source.id)}
                  className="h-8 w-8 p-0 text-red-600 hover:text-red-800"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>

          {/* Total Summary */}
          <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center space-x-2">
              <span className="text-green-600 font-medium text-sm">
                Total: {getTotalCandidates()} candidates from {sources.length} source{sources.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Source Configuration Modal */}
      <SourceConfigModal
        sourceType={selectedSourceType}
        isOpen={showSourceModal}
        onClose={() => {
          setShowSourceModal(false);
          setSelectedSourceType(null);
        }}
        onSave={handleSourceAdded}
      />
    </div>
  );
}