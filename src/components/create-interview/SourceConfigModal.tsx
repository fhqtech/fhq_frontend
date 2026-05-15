import { useState } from "react";
import { CheckCircle, CircleNotch, X } from "phosphor-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GoogleSheetsPreview } from "@/components/ui/google-sheets-preview";
import { FilePreview } from "@/components/ui/file-preview";

type SourceType = "google_sheet" | "excel_file" | "manual_entry";

interface ExistingSource {
  type: SourceType;
}

interface MainFormData {
  candidateUpload?: { gcpFilePath?: string };
}

interface SourceMetadata {
  columnMapping?: unknown;
  totalCandidates?: number;
  sheetUrl?: string;
  fileName?: string;
  fileSize?: number;
  file_path?: string;
  gcs_url?: string;
}

interface SourceData {
  type: SourceType;
  name: string;
  candidateCount: number;
  status: "ready" | "validated";
  metadata: SourceMetadata;
}

interface ValidationData {
  totalRows?: number;
  sheet_info?: { sheet_name?: string };
  gcsUrl?: string;
}

interface Props {
  sourceType: SourceType;
  onClose: () => void;
  onSave: (data: SourceData) => Promise<void> | void;
  existingCandidateSources?: ExistingSource[];
  mainFormData?: MainFormData;
  uploadedFilePath?: string;
}

/**
 * Modal that configures a single candidate source (Google Sheet, Excel/CSV, or manual)
 * before it's added to the interview's source list. Validation + naming happen here so
 * the parent only sees a finalized SourceData object.
 */
export function SourceConfigModal({
  sourceType,
  onClose,
  onSave,
  existingCandidateSources = [],
  mainFormData,
  uploadedFilePath,
}: Props) {
  const [formData, setFormData] = useState<{
    name: string;
    googleSheetUrl: string;
    file: File | null;
    candidateCount: number;
  }>({
    name: "",
    googleSheetUrl: "",
    file: null,
    candidateCount: 0,
  });

  const [isValid, setIsValid] = useState(false);
  const [validationData, setValidationData] = useState<ValidationData | null>(null);
  const [columnMapping, setColumnMapping] = useState<unknown[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleValidation = (valid: boolean, data: ValidationData | null, mapping?: unknown[]) => {
    setIsValid(valid);
    setValidationData(data);
    setColumnMapping(mapping || []);
    if (valid && data) {
      setFormData((prev) => ({ ...prev, candidateCount: data.totalRows || 0 }));
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0] ?? null;
    setFormData((prev) => ({ ...prev, file: selectedFile }));
  };

  const handleSave = async () => {
    if (sourceType !== "manual_entry" && (!isValid || !validationData)) return;

    setIsProcessing(true);
    try {
      let sourceName: string;
      if (sourceType === "google_sheet") {
        if (validationData?.sheet_info?.sheet_name) {
          sourceName = validationData.sheet_info.sheet_name;
        } else {
          const urlMatch = formData.googleSheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
          const sheetId = urlMatch ? urlMatch[1].substring(0, 8) : "sheet";
          sourceName = `Google Sheet (${sheetId}…)`;
        }
      } else if (sourceType === "excel_file" && formData.file) {
        sourceName = formData.file.name.replace(/\.[^/.]+$/, "");
      } else {
        const existingManualSources = existingCandidateSources.filter((s) => s.type === "manual_entry");
        sourceName = `Manual entry ${existingManualSources.length + 1}`;
      }

      const sourceData: SourceData = {
        type: sourceType,
        name: sourceName,
        candidateCount: sourceType === "manual_entry" ? 0 : (validationData?.totalRows ?? 0),
        status: sourceType === "manual_entry" ? "ready" : "validated",
        metadata:
          sourceType === "manual_entry"
            ? {}
            : {
                columnMapping,
                totalCandidates: validationData?.totalRows,
              },
      };

      if (sourceType === "google_sheet") {
        sourceData.metadata.sheetUrl = formData.googleSheetUrl;
      } else if (sourceType === "excel_file") {
        if (formData.file) {
          sourceData.metadata.fileName = formData.file.name;
          sourceData.metadata.fileSize = formData.file.size;
        }
        const gcpFilePath =
          validationData?.gcsUrl ||
          mainFormData?.candidateUpload?.gcpFilePath ||
          uploadedFilePath;
        if (gcpFilePath) {
          sourceData.metadata.file_path = gcpFilePath;
          sourceData.metadata.gcs_url = gcpFilePath;
        }
      }

      await onSave(sourceData);
    } finally {
      setIsProcessing(false);
    }
  };

  const titleCase = (s: string) => s.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase());

  return (
    <div
      className="fixed inset-0 z-[9999] bg-ink/70 flex items-center justify-center p-4"
    >
      <div className="bg-paper rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-3 border border-rule">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-rule">
          <h3 className="text-xl font-semibold text-ink">
            Configure {titleCase(sourceType)}
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label="Close source dialog"
            className="text-muted hover:text-ink hover:bg-paper-3"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="space-y-6">
          {sourceType === "google_sheet" && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="sheetUrl" className="text-ink mb-2 block">
                  Google Sheets URL
                </Label>
                <Input
                  id="sheetUrl"
                  placeholder="https://docs.google.com/spreadsheets/..."
                  value={formData.googleSheetUrl}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, googleSheetUrl: e.target.value }))
                  }
                  className="bg-paper border-rule-strong text-ink placeholder:text-muted-2 focus:border-gold-ink focus:ring-gold"
                />
              </div>

              <GoogleSheetsPreview
                url={formData.googleSheetUrl}
                onValidation={handleValidation}
                className="mt-4"
              />
            </div>
          )}

          {sourceType === "excel_file" && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="fileUpload" className="text-ink mb-2 block">
                  Upload Excel/CSV File
                </Label>
                <div className="mt-2">
                  <input
                    id="fileUpload"
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileSelect}
                    className="block w-full text-sm text-muted
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-full file:border-0
                      file:text-sm file:font-semibold
                      file:bg-gold file:text-ink
                      hover:file:bg-gold/90"
                  />
                </div>
              </div>

              <FilePreview
                file={formData.file}
                onValidation={handleValidation}
                className="mt-4"
              />
            </div>
          )}

          {sourceType === "manual_entry" && (
            <div className="p-5 bg-gold-soft rounded-md border border-rule">
              <p className="text-sm text-muted mb-2">
                Manual entry mode allows you to add candidates one by one during the interview process.
              </p>
              <p className="text-sm font-medium text-ink">
                This source will be created and ready for manual candidate addition.
              </p>
            </div>
          )}

          {isValid && validationData && (
            <div className="p-5 bg-success-soft border border-rule rounded-md">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-success" />
                <span className="font-medium text-success">Validation successful</span>
              </div>
              <p className="text-sm text-success mt-1">
                Found {validationData.totalRows} candidates ready to import
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end space-x-3 mt-6 pt-4 border-t border-rule">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isProcessing}
            className="border-rule-strong text-ink-soft hover:bg-paper-3 hover:text-ink"
          >
            Cancel
          </Button>
          <Button
            variant="gold"
            onClick={handleSave}
            disabled={isProcessing || (sourceType !== "manual_entry" && (!isValid || !validationData))}
          >
            {isProcessing ? (
              <>
                <CircleNotch className="w-4 h-4 mr-2 animate-spin" />
                Adding source…
              </>
            ) : (
              "Add source"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
