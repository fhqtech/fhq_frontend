import { useState } from "react";
import { Trash, FileXls as FileSpreadsheet, FileText, PencilSimple } from "phosphor-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SourceDeleteConfirmationModal } from "@/components/ui/source-delete-confirmation-modal";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { SourceConfigModal } from "./SourceConfigModal";

type SourceType = "google_sheet" | "excel_file" | "manual_entry";

interface CandidateSource {
  id: string;
  type: SourceType;
  name: string;
  candidateCount?: number;
  status?: "ready" | "validated";
  metadata?: {
    sheetUrl?: string;
    fileName?: string;
    [key: string]: unknown;
  };
  createdAt?: string;
}

interface FormData {
  candidateSources: CandidateSource[];
  candidateUpload?: { gcpFilePath?: string };
  [key: string]: unknown;
}

interface Props {
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  isEditMode: boolean;
  interviewId?: string;
  initialSourceType?: SourceType | null;
}

const SOURCE_OPTIONS: Array<{
  type: SourceType;
  title: string;
  description: string;
  icon: React.ElementType;
}> = [
  {
    type: "google_sheet",
    title: "Google Sheets",
    description: "Import applicants from Google Sheets",
    icon: FileSpreadsheet,
  },
  {
    type: "excel_file",
    title: "Excel/CSV file",
    description: "Upload Excel or CSV file with applicants",
    icon: FileText,
  },
];

const SOURCE_ICON: Record<SourceType, React.ElementType> = {
  google_sheet: FileSpreadsheet,
  excel_file: FileText,
  manual_entry: PencilSimple,
};

const FALLBACK_USER_ID = "87c0388e-5f74-4a30-8e32-06869f852cc3";
const VALID_SOURCE_TYPES: SourceType[] = ["google_sheet", "excel_file", "manual_entry"];

/**
 * MultiSourceCandidateManager — orchestrates the candidate-source list
 * inside the CreateInterview wizard. Adds + removes sources via the
 * SourceConfigModal; persists changes to the backend in edit mode and
 * to local state in create mode.
 */
export function MultiSourceCandidateManager({
  formData,
  setFormData,
  isEditMode,
  interviewId,
  initialSourceType,
}: Props) {
  const { user } = useAuth();
  const { toast } = useToast();

  const validInitialSourceType =
    initialSourceType && VALID_SOURCE_TYPES.includes(initialSourceType) ? initialSourceType : null;

  const [showSourceSelector, setShowSourceSelector] = useState(Boolean(validInitialSourceType));
  const [selectedSourceType, setSelectedSourceType] = useState<SourceType | null>(validInitialSourceType);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [sourceToDelete, setSourceToDelete] = useState<CandidateSource | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleAddSource = (sourceType: SourceType) => {
    setSelectedSourceType(sourceType);
    setShowSourceSelector(true);
  };

  const handleSourceAdded = async (sourceData: Omit<CandidateSource, "id" | "createdAt">) => {
    if (isEditMode && interviewId) {
      try {
        const userToken = localStorage.getItem("auth_token");
        const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:8082";
        const response = await fetch(`${apiBase}/api/interviews/${interviewId}/candidate-sources`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${userToken}`,
            "user-id": user?.id || FALLBACK_USER_ID,
          },
          body: JSON.stringify(sourceData),
        });

        if (!response.ok) throw new Error("Failed to add source");
        const result = await response.json();

        setFormData((prev) => ({
          ...prev,
          candidateSources: [
            ...prev.candidateSources,
            { id: result.sourceId, ...sourceData, createdAt: new Date().toISOString() },
          ],
        }));

        if (result.duplicates_detected && result.duplicate_warning) {
          toast({
            title: "Source added with duplicates detected",
            description: result.duplicate_warning,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Source added",
            description: `${sourceData.name} has been added and saved.`,
          });
        }
      } catch (error) {
        toast({
          title: "Failed to add source",
          description: error instanceof Error ? error.message : "Please try again.",
          variant: "destructive",
        });
        return;
      }
    } else {
      setFormData((prev) => ({
        ...prev,
        candidateSources: [
          ...prev.candidateSources,
          { id: `temp_${Date.now()}`, ...sourceData, createdAt: new Date().toISOString() },
        ],
      }));
      toast({
        title: "Source added",
        description: `${sourceData.name} has been added successfully.`,
      });
    }

    setShowSourceSelector(false);
    setSelectedSourceType(null);
  };

  const handleDeleteSource = (sourceId: string) => {
    const source = formData.candidateSources.find((s) => s.id === sourceId);
    if (source) {
      setSourceToDelete(source);
      setShowDeleteModal(true);
    }
  };

  const confirmDeleteSource = async () => {
    if (!sourceToDelete) return;
    setIsDeleting(true);
    try {
      if (isEditMode && interviewId) {
        const userToken = localStorage.getItem("auth_token");
        const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:8082";
        const response = await fetch(`${apiBase}/api/candidate-sources/${sourceToDelete.id}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${userToken}`,
            "user-id": user?.id || FALLBACK_USER_ID,
          },
        });
        if (!response.ok) throw new Error("Failed to remove source from database");

        toast({
          title: "Source removed",
          description: `${sourceToDelete.name} has been removed from the database.`,
        });
      } else {
        toast({
          title: "Source removed",
          description: `${sourceToDelete.name} has been removed.`,
        });
      }

      setFormData((prev) => ({
        ...prev,
        candidateSources: prev.candidateSources.filter((source) => source.id !== sourceToDelete.id),
      }));

      setShowDeleteModal(false);
      setSourceToDelete(null);
    } catch (error) {
      toast({
        title: "Failed to remove source",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const totalCandidates = formData.candidateSources.reduce(
    (total, source) => total + (source.candidateCount || 0),
    0,
  );

  return (
    <div className="space-y-6">
      {formData.candidateSources.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-foreground">Current sources</h3>
            <span className="text-xs text-muted-foreground">
              {totalCandidates} applicants from {formData.candidateSources.length} sources
            </span>
          </div>
          <div className="grid gap-3">
            {formData.candidateSources.map((source) => {
              const Icon = SOURCE_ICON[source.type] ?? FileText;
              return (
                <div
                  key={source.id}
                  className="bg-paper rounded-md border border-rule p-3 shadow-1 hover:shadow-2 transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Icon className="w-5 h-5 text-gold-ink" />
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium text-sm text-foreground">{source.name}</h4>
                          <Badge
                            variant={source.status === "validated" ? "default" : "secondary"}
                            className={`text-xs ${
                              source.status === "validated"
                                ? "bg-success-soft text-success border-rule"
                                : "bg-info-soft text-info border-rule"
                            }`}
                          >
                            {source.status === "validated" ? "Validated" : "Ready"}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-4 mt-1">
                          <p className="text-xs text-muted">
                            {source.candidateCount} applicants •{" "}
                            {source.type.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                          </p>
                          {source.metadata?.sheetUrl && (
                            <a
                              href={source.metadata.sheetUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-info hover:text-info underline"
                            >
                              View sheet
                            </a>
                          )}
                          {source.metadata?.fileName && (
                            <span className="text-xs text-muted">{source.metadata.fileName}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      aria-label={`Remove source ${source.name}`}
                      className="text-danger hover:text-danger border-rule hover:border-rule"
                      onClick={() => handleDeleteSource(source.id)}
                    >
                      <Trash className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="space-y-4">
        <h3 className="text-sm font-medium text-foreground">
          {formData.candidateSources.length > 0 ? "Add another source" : "Add applicant sources"}
        </h3>
        <div className="grid md:grid-cols-2 gap-3">
          {SOURCE_OPTIONS.map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.type}
                onClick={() => handleAddSource(option.type)}
                className="p-4 rounded-md border border-rule text-left transition-all duration-200 bg-paper hover:bg-paper-2"
              >
                <Icon className="w-6 h-6 text-gold-ink mb-2" />
                <h4 className="font-semibold text-sm text-foreground mb-1">{option.title}</h4>
                <p className="text-xs text-muted">{option.description}</p>
              </button>
            );
          })}
        </div>

        {formData.candidateSources.length === 0 && (
          <div className="text-center p-4 text-xs text-muted-foreground">
            Choose one or more methods to add applicants to your interview
          </div>
        )}
      </div>

      {showSourceSelector && selectedSourceType && (
        <SourceConfigModal
          sourceType={selectedSourceType}
          onClose={() => {
            setShowSourceSelector(false);
            setSelectedSourceType(null);
          }}
          onSave={handleSourceAdded}
          existingCandidateSources={formData.candidateSources}
          mainFormData={formData}
          uploadedFilePath={formData.candidateUpload?.gcpFilePath}
        />
      )}

      <SourceDeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSourceToDelete(null);
        }}
        onConfirm={confirmDeleteSource}
        sourceName={sourceToDelete?.name || ""}
        candidateCount={sourceToDelete?.candidateCount || 0}
        isDeleting={isDeleting}
      />
    </div>
  );
}
