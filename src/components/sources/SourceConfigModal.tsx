import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { listsApi } from '@/services/listsApi';

interface SourceConfigModalProps {
  sourceType: 'google_sheet' | 'excel_file' | null;
  onClose: () => void;
  onSave: (sourceData: any) => void;
  isOpen: boolean;
}

export function SourceConfigModal({ sourceType, onClose, onSave, isOpen }: SourceConfigModalProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    googleSheetUrl: '',
    file: null as File | null,
    candidateCount: 0,
    description: '',
    gcsUrl: ''
  });

  const [isValidating, setIsValidating] = useState(false);

  const handleClose = () => {
    setFormData({
      name: '',
      googleSheetUrl: '',
      file: null,
      candidateCount: 0,
      description: '',
      gcsUrl: ''
    });
    onClose();
  };

  const validateGoogleSheet = async () => {
    if (!formData.googleSheetUrl.trim()) {
      toast({
        title: "URL Required",
        description: "Please enter a Google Sheets URL.",
        variant: "destructive"
      });
      return false;
    }

    setIsValidating(true);

    try {
      const result = await listsApi.validateGoogleSheet(formData.googleSheetUrl);

      if (!result.success) {
        toast({
          title: "Validation Failed",
          description: result.errors?.[0] || "Failed to validate Google Sheet.",
          variant: "destructive"
        });
        setIsValidating(false);
        return false;
      }

      // Use sheet name from API response, or fallback to sheet ID
      const sheetName = result.sheet_info?.sheet_name;
      let extractedName;

      if (sheetName) {
        extractedName = sheetName;
      } else {
        // Fallback: extract sheet ID for name generation
        const urlParts = formData.googleSheetUrl.split('/');
        const sheetId = urlParts.find(part => part.length > 40) || 'unknown';
        extractedName = `Google Sheet (${sheetId.substring(0, 8)}...)`;
      }

      setFormData(prev => ({
        ...prev,
        candidateCount: result.candidateCount,
        name: extractedName
      }));

      setIsValidating(false);

      toast({
        title: "Sheet Validated",
        description: `Found ${result.candidateCount} candidates in "${extractedName}".`
      });

      return true;
    } catch (error) {
      console.error('Error validating Google Sheet:', error);
      toast({
        title: "Validation Error",
        description: "Failed to validate Google Sheet. Please try again.",
        variant: "destructive"
      });
      setIsValidating(false);
      return false;
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsValidating(true);

      const result = await listsApi.uploadFile(file);

      if (!result.success) {
        toast({
          title: "Upload Failed",
          description: result.errors?.[0] || "Failed to upload and validate file.",
          variant: "destructive"
        });
        setIsValidating(false);
        return;
      }

      // Use file name as source name (remove extension)
      const nameWithoutExtension = file.name.replace(/\.[^/.]+$/, "");

      // Extract GCS URL from upload response
      const gcsUrl = result.upload_info?.gcs_url || '';

      setFormData(prev => ({
        ...prev,
        file,
        name: nameWithoutExtension,
        candidateCount: result.candidateCount,
        gcsUrl: gcsUrl
      }));

      setIsValidating(false);

      toast({
        title: "File Uploaded",
        description: `${file.name} uploaded successfully. Found ${result.candidateCount} candidates.`
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: "Upload Error",
        description: "Failed to upload file. Please try again.",
        variant: "destructive"
      });
      setIsValidating(false);
    }
  };

  const handleSave = () => {
    if (sourceType === 'google_sheet' && !formData.googleSheetUrl.trim()) {
      toast({
        title: "URL Required",
        description: "Please validate the Google Sheets URL first.",
        variant: "destructive"
      });
      return;
    }

    if (sourceType === 'excel_file' && !formData.file) {
      toast({
        title: "File Required",
        description: "Please upload an Excel or CSV file.",
        variant: "destructive"
      });
      return;
    }

    if (formData.candidateCount === 0) {
      toast({
        title: "No Candidates Found",
        description: "Please validate your source to find candidates.",
        variant: "destructive"
      });
      return;
    }

    const sourceData = {
      type: sourceType,
      name: formData.name,
      candidateCount: formData.candidateCount,
      status: 'validated' as const,
      metadata: {
        ...(sourceType === 'google_sheet' && { url: formData.googleSheetUrl }),
        ...(sourceType === 'excel_file' && {
          fileName: formData.file?.name,
          gcs_url: formData.gcsUrl,
          file_path: formData.gcsUrl
        }),
        description: formData.description
      }
    };

    onSave(sourceData);
    handleClose();
  };

  const getModalTitle = () => {
    switch (sourceType) {
      case 'google_sheet':
        return 'CONFIGURE GOOGLE SHEETS SOURCE';
      case 'excel_file':
        return 'UPLOAD EXCEL/CSV FILE';
      default:
        return 'CONFIGURE SOURCE';
    }
  };

  const getModalDescription = () => {
    switch (sourceType) {
      case 'google_sheet':
        return 'ENTER THE GOOGLE SHEETS URL CONTAINING YOUR CANDIDATE DATA.';
      case 'excel_file':
        return 'UPLOAD AN EXCEL OR CSV FILE WITH CANDIDATE INFORMATION.';
      default:
        return 'CONFIGURE YOUR CANDIDATE SOURCE.';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{getModalTitle()}</DialogTitle>
          <DialogDescription className="text-xs">{getModalDescription()}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Source Name Display (read-only) */}
          {formData.name && (
            <div>
              <Label className="uppercase text-xs tracking-wider">SOURCE NAME</Label>
              <div className="mt-2 p-2 bg-muted rounded-sm border text-sm font-medium">
                {formData.name}
              </div>
            </div>
          )}

          {/* Google Sheet URL */}
          {sourceType === 'google_sheet' && (
            <div>
              <Label htmlFor="sheetUrl" className="uppercase text-xs tracking-wider">
                GOOGLE SHEETS URL <span className="text-red-600">*</span>
              </Label>
              <Input
                id="sheetUrl"
                placeholder="https://docs.google.com/spreadsheets/d/..."
                value={formData.googleSheetUrl}
                onChange={(e) => setFormData(prev => ({ ...prev, googleSheetUrl: e.target.value }))}
                className="mt-2 rounded-sm border-none transition-all duration-300 bg-paper"
                style={{
                  boxShadow: 'var(--shadow-clay)'
                }}
              />
              <div className="mt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={validateGoogleSheet}
                  disabled={isValidating}
                  className="text-xs uppercase rounded-[2px] h-7 px-3"
                >
                  {isValidating ? 'Validating...' : 'Validate Sheet'}
                </Button>
              </div>
            </div>
          )}

          {/* File Upload */}
          {sourceType === 'excel_file' && (
            <div>
              <Label htmlFor="fileUpload" className="uppercase text-xs tracking-wider">
                UPLOAD FILE <span className="text-red-600">*</span>
              </Label>
              <Input
                id="fileUpload"
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                className="mt-2 rounded-sm border-none transition-all duration-300 bg-paper"
                style={{
                  boxShadow: 'var(--shadow-clay)'
                }}
              />
              {formData.file && (
                <p className="text-sm text-green-600 mt-1">
                  ✓ {formData.file.name} uploaded
                </p>
              )}
            </div>
          )}


          {/* Description */}
          <div>
            <Label htmlFor="description" className="uppercase text-xs tracking-wider">DESCRIPTION (OPTIONAL)</Label>
            <Textarea
              id="description"
              placeholder="Additional notes about this source..."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="mt-2 rounded-sm border-none transition-all duration-300 bg-paper"
              style={{
                boxShadow: 'var(--shadow-clay)'
              }}
              rows={3}
            />
          </div>

          {/* Candidate Count Display */}
          {formData.candidateCount > 0 && (
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm font-medium text-green-800">
                {formData.candidateCount} candidates found
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4">
          <Button
            variant="outline"
            onClick={handleClose}
            className="uppercase rounded-sm text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={formData.candidateCount === 0}
            className="bg-ink hover:bg-ink/90 uppercase rounded-sm"
          >
            Add Source
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}