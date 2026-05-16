import { AlertTriangle, CheckCircle, FileText, RefreshCw, Loader2 } from "lucide-react";
import { CloudArrowDown } from "phosphor-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shimmer } from "@/components/ui/shimmer";
import googleLogo from "@/assets/google_logo.png";

interface SourceUpdate {
  hasNew: boolean;
  newRows?: number;
}

interface InterviewSourcesPanelProps {
  show: boolean;
  loading: boolean;
  sources: any[];
  hasSharedLists: boolean;
  hasQualifiedLists: boolean;
  interviewStatus?: string;
  sourceUpdates: Record<string, SourceUpdate>;
  checkingSourceIds: Set<string>;
  syncingSourceIds: Set<string>;
  onCheckSource: (source: any) => Promise<SourceUpdate | null | undefined>;
  onSyncSource: (source: any) => Promise<unknown>;
}

export function InterviewSourcesPanel({
  show,
  loading,
  sources,
  hasSharedLists,
  hasQualifiedLists,
  interviewStatus,
  sourceUpdates,
  checkingSourceIds,
  syncingSourceIds,
  onCheckSource,
  onSyncSource,
}: InterviewSourcesPanelProps) {
  if (!show) return null;

  const isLockedAfterStart = interviewStatus && interviewStatus !== 'draft';

  return (
    <div className="rounded-sm bg-paper" style={{ boxShadow: 'var(--shadow-clay)' }}>
      <div className="px-6 py-5 border-b">
        <div className="flex items-center gap-4">
          <CloudArrowDown size={48} weight="thin" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-ink">Applicant sources</h3>
            <p className="text-xs text-muted mt-1">Sync new applicants from updated Google Sheets</p>
            {isLockedAfterStart && (
              <div className="mt-2 flex items-start gap-2 px-3 py-2 bg-warning-soft border border-rule rounded-sm">
                <AlertTriangle className="h-3.5 w-3.5 text-warning mt-0.5 shrink-0" />
                <p className="text-xs text-ink-soft">
                  Google Sheet syncing is disabled once the interview has started.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-6">
        {loading ? (
          <div className="space-y-3">
            <Shimmer className="h-20 w-full rounded-sm" />
            <Shimmer className="h-20 w-full rounded-sm" />
          </div>
        ) : sources.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-muted-2 mx-auto mb-3" />
            {hasSharedLists && hasQualifiedLists ? (
              <>
                <p className="text-sm font-semibold text-ink-soft mb-1">Source data not available</p>
                <p className="text-xs text-muted">This interview uses applicants from shared and curated lists</p>
              </>
            ) : hasSharedLists ? (
              <>
                <p className="text-sm font-semibold text-ink-soft mb-1">Source data not available</p>
                <p className="text-xs text-muted">This interview uses applicants from a shared list</p>
              </>
            ) : hasQualifiedLists ? (
              <>
                <p className="text-sm font-semibold text-ink-soft mb-1">Source data not available</p>
                <p className="text-xs text-muted">This interview uses applicants from a curated list</p>
              </>
            ) : (
              <p className="text-sm text-muted">No Google Sheet sources found</p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {sources.map((source: any) => {
              const updateInfo = sourceUpdates[source.id];
              const isChecking = checkingSourceIds.has(source.id);
              const isSyncing = syncingSourceIds.has(source.id);
              const hasUpdates = updateInfo?.hasNew;

              return (
                <div
                  key={source.id}
                  className="p-5 rounded-sm bg-paper-2 border border-rule hover:border-rule-strong hover:shadow-2 transition-all duration-200"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <div className="w-12 h-12 rounded-sm bg-paper border border-rule flex items-center justify-center shrink-0 p-2">
                        <img src={googleLogo} alt="Google Sheets" className="w-full h-full object-contain" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="mb-2">
                          <p className="font-semibold text-ink text-base mb-1">{source.name}</p>
                          <p className="text-xs text-muted font-mono tracking-wide">ID: {source.id}</p>
                        </div>
                        <div className="flex items-center gap-2 mb-3">
                          <Badge className="text-[10px] bg-info-soft text-info border-rule hover:bg-info-soft rounded-sm font-medium">
                            Google Sheets
                          </Badge>
                          <span className="text-xs text-ink-soft font-medium">
                            {source.candidateCount || 0} applicants
                          </span>
                          {source.lastExtractedAt && (
                            <span className="text-xs text-muted">
                              · {new Date(source.lastExtractedAt._seconds ? source.lastExtractedAt._seconds * 1000 : source.lastExtractedAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        {hasUpdates && (
                          <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-soft border border-rule rounded-sm">
                            <AlertTriangle className="h-3.5 w-3.5 text-orange-ink" />
                            <span className="text-xs text-orange-ink font-medium">{updateInfo.newRows} new applicants available</span>
                          </div>
                        )}
                        {updateInfo && !updateInfo.hasNew && (
                          <div className="flex items-center gap-2 px-3 py-1.5 bg-success-soft border border-rule rounded-sm">
                            <CheckCircle className="h-3.5 w-3.5 text-success" />
                            <span className="text-xs text-success font-medium">Up to date</span>
                          </div>
                        )}
                      </div>
                    </div>
                    {interviewStatus === 'draft' && (
                      <Button
                        size="sm"
                        onClick={async () => {
                          const result = await onCheckSource(source);
                          if (result?.hasNew) {
                            await onSyncSource(source);
                          }
                        }}
                        disabled={isChecking || isSyncing}
                        className="bg-[hsl(var(--ink))] hover:bg-[hsl(var(--ink-soft))] text-paper font-bold text-xs rounded-sm shrink-0 px-4 py-2"
                      >
                        {isChecking || isSyncing ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            {isChecking ? 'Checking' : 'Syncing'}
                          </>
                        ) : (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            {hasUpdates ? 'Sync now' : 'Check'}
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
