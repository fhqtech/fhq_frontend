import React, { useState, useEffect } from 'react';
import { CheckCircle, Warning, X, Eye, Users, MagnifyingGlass as Search, CaretDown, CaretUp } from 'phosphor-react';
import { Button } from './button';
import { Input } from './input';
import { Label } from './label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';
import { Badge } from './badge';
import { Separator } from './separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './table';

interface SheetData {
  headers: string[];
  rows: string[][];
  totalRows: number;
  isValid: boolean;
  validationErrors: string[];
}

interface ColumnMapping {
  sheetColumn: string;
  mappedTo: 'name' | 'email' | 'phone' | 'position' | 'experience' | 'resume_url' | 'ignore';
}

interface GoogleSheetsPreviewProps {
  url: string;
  onValidation: (isValid: boolean, data?: SheetData, mapping?: ColumnMapping[]) => void;
  className?: string;
}

export function GoogleSheetsPreview({ url, onValidation, className }: GoogleSheetsPreviewProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [sheetData, setSheetData] = useState<SheetData | null>(null);
  const [error, setError] = useState<string>('');
  const [columnMapping, setColumnMapping] = useState<ColumnMapping[]>([]);
  const [previewRows, setPreviewRows] = useState(5);
  const [showColumnMapping, setShowColumnMapping] = useState(true);
  const [showDataPreview, setShowDataPreview] = useState(true);
  const [previousUrl, setPreviousUrl] = useState<string>('');

  // Extract sheet ID from Google Sheets URL
  const extractSheetId = (sheetUrl: string): string | null => {
    const patterns = [
      /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/,
      /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)\/edit/,
    ];
    
    for (const pattern of patterns) {
      const match = sheetUrl.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  // Validate sheet data using backend API
  const validateSheetWithBackend = async (sheetUrl: string): Promise<SheetData> => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8082'}/api/validate-google-sheet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: sheetUrl,
          expected_columns: ['Name', 'Email']
        })
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || `HTTP ${response.status}`);
      }

      // Transform backend response to match our SheetData interface
      return {
        headers: result.sheet_info?.columns || [],
        rows: result.preview_data ? result.preview_data.map((row: any) => 
          Object.values(row).map(val => String(val || ''))
        ) : [],
        totalRows: result.total_rows || 0,
        isValid: result.is_valid || false,
        validationErrors: result.errors || []
      };
      
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new Error('Unable to connect to validation service');
    }
  };

  // Auto-detect column mappings (only for valid templates)
  const autoDetectMapping = (headers: string[]): ColumnMapping[] => {
    return headers.map(header => {
      const lowerHeader = header.toLowerCase().trim();
      let mappedTo: ColumnMapping['mappedTo'] = 'ignore';

      // Exact matching for template compliance
      if (lowerHeader === 'name') {
        mappedTo = 'name';
      } else if (lowerHeader === 'email') {
        mappedTo = 'email';
      }

      return {
        sheetColumn: header,
        mappedTo
      };
    });
  };

  // Load and validate sheet data
  useEffect(() => {
    if (!url || !url.trim()) {
      setSheetData(null);
      setError('');
      onValidation(false);
      setPreviousUrl('');
      return;
    }

    // Only call API if URL actually changed
    if (url === previousUrl) {
      return;
    }

    setIsLoading(true);
    setError('');

    const loadSheet = async () => {
      try {
        const data = await validateSheetWithBackend(url);
        setSheetData(data);
        
        const mapping = autoDetectMapping(data.headers);
        setColumnMapping(mapping);
        
        onValidation(data.isValid, data, mapping);
        setPreviousUrl(url);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(errorMessage);
        onValidation(false);
        setPreviousUrl(url);
      } finally {
        setIsLoading(false);
      }
    };

    // Debounce the API call
    const timeoutId = setTimeout(loadSheet, 1000);
    return () => clearTimeout(timeoutId);
  }, [url, previousUrl]);

  // Update column mapping
  const updateColumnMapping = (sheetColumn: string, mappedTo: ColumnMapping['mappedTo']) => {
    const newMapping = columnMapping.map(cm => 
      cm.sheetColumn === sheetColumn ? { ...cm, mappedTo } : cm
    );
    setColumnMapping(newMapping);
    
    if (sheetData) {
      onValidation(sheetData.isValid, sheetData, newMapping);
    }
  };

  if (!url || !url.trim()) {
    return null;
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Loading State */}
      {isLoading && (
        <Card>
          <CardContent className="p-6 text-center">
            <div className="flex items-center justify-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brand-primary"></div>
              <span className="text-sm text-foreground-muted">Loading sheet data...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <Card className="border-error">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <X className="w-5 h-5 text-error" weight="fill" />
              <span>Unable to Access Sheet</span>
            </CardTitle>
            <CardDescription>
              There was an issue accessing your Google Sheet
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-error-light/10 border border-error/20 rounded-lg">
              <p className="text-sm text-error font-medium mb-2">Error Details:</p>
              <p className="text-sm text-foreground">{error}</p>
            </div>
            
            {/* Show specific guidance based on error type */}
            {(error.toLowerCase().includes('private') || 
              error.toLowerCase().includes('access') || 
              error.toLowerCase().includes('forbidden') ||
              error.toLowerCase().includes('authentication')) && (
              <div className="p-4 bg-info-light/10 border border-info/20 rounded-lg">
                <p className="font-medium text-sm mb-3 flex items-center gap-2">
                  <Warning className="w-4 h-4 text-info" />
                  How to Make Your Sheet Public:
                </p>
                <ol className="text-sm text-foreground-muted space-y-2 list-decimal list-inside ml-4">
                  <li>Open your Google Sheet</li>
                  <li>Click the <strong>"Share"</strong> button (top-right)</li>
                  <li>Click <strong>"Change to anyone with the link"</strong></li>
                  <li>Set permission to <strong>"Viewer"</strong></li>
                  <li>Click <strong>"Done"</strong> and try again</li>
                </ol>
                <div className="mt-3 p-3 bg-warning-light/10 rounded border border-warning/20">
                  <p className="text-xs text-foreground-muted flex items-center gap-1">
                    <Warning className="w-3 h-3" />
                    <strong>Note:</strong> Making your sheet public means anyone with the link can view it. Only include non-sensitive candidate information.
                  </p>
                </div>
              </div>
            )}
            
            {error.toLowerCase().includes('not found') && (
              <div className="p-4 bg-warning-light/10 border border-warning/20 rounded-lg">
                <p className="font-medium text-sm mb-2 flex items-center gap-2">
                  <Warning className="w-4 h-4 text-warning" />
                  URL Check:
                </p>
                <ul className="text-sm text-foreground-muted space-y-1 list-disc list-inside ml-4">
                  <li>Verify the URL is correct</li>
                  <li>Make sure the sheet hasn't been deleted</li>
                  <li>Check that you're using the full URL from your browser</li>
                </ul>
              </div>
            )}
            
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs text-foreground-muted">
                💡 <strong>Tip:</strong> Copy the full URL directly from your Google Sheets browser tab for best results.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invalid Template State */}
      {sheetData && !isLoading && !error && !sheetData.isValid && (
        <Card className="border-error">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <X className="w-5 h-5 text-error" weight="fill" />
              <span>Template Format Error</span>
            </CardTitle>
            <CardDescription>
              Your sheet doesn't match the required sample template format
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="font-medium text-sm">Issues found:</p>
              {sheetData.validationErrors.map((error, index) => (
                <div key={index} className="flex items-center space-x-2 text-sm text-error">
                  <div className="w-1 h-1 rounded-full bg-error"></div>
                  <span>{error}</span>
                </div>
              ))}
            </div>
            <Separator />
            <div className="p-4 bg-muted rounded-lg">
              <p className="font-medium text-sm mb-2">Required Template Format:</p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium text-success">✓ Column 1: Name</p>
                  <p className="text-foreground-muted">Full candidate names</p>
                </div>
                <div>
                  <p className="font-medium text-success">✓ Column 2: Email</p>
                  <p className="text-foreground-muted">Valid email addresses</p>
                </div>
              </div>
              <p className="text-xs text-foreground-muted mt-3">
                Use exactly these column names and no additional columns. Download the sample template for reference.
              </p>
            </div>
            {sheetData.headers.length > 0 && (
              <div>
                <p className="font-medium text-sm mb-2">Your sheet has:</p>
                <div className="flex flex-wrap gap-2">
                  {sheetData.headers.map((header, index) => {
                    const isValid = ['name', 'email'].includes(header.toLowerCase().trim());
                    return (
                      <Badge 
                        key={index} 
                        variant={isValid ? 'default' : 'destructive'}
                        className={isValid ? 'bg-success text-white' : ''}
                      >
                        {header}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Success State with Preview - Only show when valid */}
      {sheetData && !isLoading && !error && sheetData.isValid && (
        <div className="space-y-4">
          <span className="text-[9px] text-muted-foreground">{sheetData.totalRows} candidates found</span>

          {/* Column Mapping */}
          <div className="flex items-center justify-between mb-3 p-3 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors cursor-pointer" onClick={() => setShowColumnMapping(!showColumnMapping)}>
            <span className="text-lg font-medium">Column Mapping</span>
            <div>
              {showColumnMapping ? (
                <CaretUp className="w-4 h-4 text-foreground-muted" />
              ) : (
                <CaretDown className="w-4 h-4 text-foreground-muted" />
              )}
            </div>
          </div>
          {showColumnMapping && (
            <Card className="transition-all duration-200">
              <CardContent className="space-y-2 pt-4">
                {columnMapping.map((mapping, index) => (
                  <div key={index} className="flex items-center justify-between p-2 border rounded text-xs">
                    <div className="flex items-center space-x-2 min-w-0 flex-1">
                      <Badge variant="outline" className="text-xs px-2 py-0.5 whitespace-nowrap">{mapping.sheetColumn}</Badge>
                      <span className="text-xs text-foreground-muted whitespace-nowrap">→</span>
                    </div>
                    <Select
                      value={mapping.mappedTo}
                      onValueChange={(value) => updateColumnMapping(mapping.sheetColumn, value as ColumnMapping['mappedTo'])}
                    >
                      <SelectTrigger className="w-32 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="name">Name *</SelectItem>
                        <SelectItem value="email">Email *</SelectItem>
                        <SelectItem value="phone">Phone</SelectItem>
                        <SelectItem value="position">Position</SelectItem>
                        <SelectItem value="experience">Experience</SelectItem>
                        <SelectItem value="resume_url">Resume URL</SelectItem>
                        <SelectItem value="ignore">Ignore</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Data Preview */}
          <div className="flex items-center justify-between mb-3 p-3 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors cursor-pointer" onClick={() => setShowDataPreview(!showDataPreview)}>
            <span className="text-lg font-medium">Data Preview</span>
            <div className="flex items-center space-x-2">
              {showDataPreview && (
                <>
                  <Label className="text-xs">Rows:</Label>
                  <Select
                    value={previewRows.toString()}
                    onValueChange={(value) => setPreviewRows(parseInt(value))}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <SelectTrigger className="w-16 h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                    </SelectContent>
                  </Select>
                </>
              )}
              <div>
                {showDataPreview ? (
                  <CaretUp className="w-4 h-4 text-foreground-muted" />
                ) : (
                  <CaretDown className="w-4 h-4 text-foreground-muted" />
                )}
              </div>
            </div>
          </div>
          {showDataPreview && (
            <Card className="transition-all duration-200">
              <CardContent className="pt-4">
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {sheetData.headers.map((header, index) => (
                          <TableHead key={index} className="font-medium p-2 text-xs">
                            {header}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sheetData.rows.slice(0, previewRows).map((row, rowIndex) => (
                        <TableRow key={rowIndex}>
                          {row.map((cell, cellIndex) => (
                            <TableCell key={cellIndex} className="max-w-32 truncate p-2 text-xs">
                              {cell || <span className="text-foreground-muted italic text-xs">Empty</span>}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {sheetData.totalRows > previewRows && (
                  <p className="text-xs text-foreground-muted mt-2 text-center">
                    Showing {previewRows} of {sheetData.totalRows} total candidates
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}