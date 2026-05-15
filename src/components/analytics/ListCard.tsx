import { AnalyticsList } from "@/types/analytics";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, FolderOpen, Sparkles, Star, Zap, Trash2, Video, Edit, RefreshCw, Loader2, FileSpreadsheet, Plus, Share2, Settings, Info, Check, Search } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useRef, useState, useEffect } from "react";
import { toast } from "sonner";
import googleLogo from "@/assets/google_logo.png";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

interface ListCardProps {
  list: AnalyticsList;
  onClick: () => void;
  onDelete?: (listId: string) => void;
  onShare?: (projectIds: string[]) => void;
  onCopy?: (listId: string, listName: string, isQualified: boolean) => void;
  sources?: any[];
  onSyncSource?: (sourceId: string) => Promise<void>;
  onAddSource?: (listId: string) => void;
  sharedProjects?: Array<{ id: string; name: string }>;
  availableProjects?: Array<{ id: string; name: string }>;
}

export function ListCard({ list, onClick, onDelete, onShare, onCopy, sources = [], onSyncSource, onAddSource, sharedProjects = [], availableProjects = [] }: ListCardProps) {
  // Calculate average score from candidates (if available)
  const avgScore = list.candidates && list.candidates.length > 0
    ? (list.candidates.reduce((sum, c) => sum + (c.scores.overall || 0), 0) / list.candidates.length).toFixed(0)
    : 0;

  // Count starred/top performers - prefer starredCount from enhancement API
  const topPerformers = list.starredCount ?? (list.candidates ? list.candidates.filter(c => c.starred).length : 0);

  const cardRef = useRef<HTMLDivElement>(null);
  const sharePopoverRef = useRef<HTMLDivElement>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [syncingSourceId, setSyncingSourceId] = useState<string | null>(null);
  const [showSharePopover, setShowSharePopover] = useState(false);
  const [selectedProjects, setSelectedProjects] = useState<string[]>(sharedProjects.map(p => p.id));
  const [searchQuery, setSearchQuery] = useState('');

  // Deterministic color rotation for ListCard accent. Pulls from the
  // shared --chart-{1..7} tokens defined in index.css so the chart
  // palette stays inside the FunnelHQ finance-trust scheme (no purple /
  // violet / cyan / indigo). Default falls back to gold (--chart-2).
  const chartTokens = ['--chart-1', '--chart-2', '--chart-3', '--chart-4', '--chart-5', '--chart-6', '--chart-7'];
  const tokenIndex = Math.abs(list.name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % chartTokens.length;
  const listColor = list.color || `hsl(var(${chartTokens[tokenIndex]}))`;

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sharePopoverRef.current && !sharePopoverRef.current.contains(event.target as Node)) {
        setShowSharePopover(false);
      }
    };

    if (showSharePopover) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSharePopover]);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(list.id);
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFlipped(!isFlipped);
  };

  const handleShareClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('Share clicked, availableProjects:', availableProjects);
    setShowSharePopover(!showSharePopover);
  };

  const handleProjectToggle = (projectId: string) => {
    setSelectedProjects(prev =>
      prev.includes(projectId)
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId]
    );
  };

  const handleShareSave = () => {
    if (onShare) {
      onShare(selectedProjects);
    }
    setShowSharePopover(false);
    toast.success("Share settings updated");
  };

  const handleSync = async (e: React.MouseEvent, sourceId: string) => {
    e.stopPropagation();
    if (onSyncSource) {
      setSyncingSourceId(sourceId);
      try {
        await onSyncSource(sourceId);
        toast.success("Source synced successfully");
      } catch (error) {
        toast.error("Failed to sync source");
      } finally {
        setSyncingSourceId(null);
      }
    }
  };

  return (
    <div
      className="flip-card"
      style={{
        perspective: '1000px',
        opacity: isDeleting ? 0 : 1,
        height: '480px'
      }}
    >
      <style>{`
        .flip-card {
          position: relative;
        }

        .flip-card-inner {
          position: relative;
          width: 100%;
          height: 480px;
          text-align: center;
          transition: transform 0.8s;
          transform-style: preserve-3d;
        }

        .flip-card-inner.flipped {
          transform: rotateY(180deg);
        }

        .flip-card-front, .flip-card-back {
          position: absolute;
          width: 100%;
          height: 480px;
          -webkit-backface-visibility: hidden;
          backface-visibility: hidden;
        }

        .flip-card-back {
          transform: rotateY(180deg);
        }
      `}</style>

      <div className={`flip-card-inner ${isFlipped ? 'flipped' : ''}`}>
        {/* FRONT SIDE */}
        <div className="flip-card-front">
          <Card
            ref={cardRef}
            className={`p-5 h-full transition-all duration-300 shadow-1 hover:shadow-2 cursor-pointer group relative overflow-hidden border ${
              list.isQualified
                ? 'border-amber-200/60 bg-paper-2 from-amber-50/40 via-yellow-50/20 to-orange-50/30'
                : 'border-border hover:border-primary/20'
            }`}
            onClick={!isFlipped ? onClick : undefined}
            style={{ pointerEvents: isFlipped ? 'none' : 'auto' }}
          >
            {/* Curated Corner Ribbon */}
            {list.isQualified && (
              <div className="absolute top-0 right-0 z-20 overflow-hidden w-20 h-20 pointer-events-none">
                <div className="absolute top-0 right-0 w-28 h-6 bg-paper-2 from-amber-400 to-yellow-500 text-amber-900 text-[10px] font-bold flex items-center justify-center shadow-2 transform rotate-45 translate-x-6 translate-y-2">
                  Curated
                </div>
              </div>
            )}

            {/* Gradient overlay */}
            <div className={`absolute inset-0 transition-opacity duration-300 ${
              list.isQualified
                ? 'bg-paper-2 from-amber-100/30 via-yellow-100/20 to-orange-100/30 opacity-0 group-hover:opacity-100'
                : 'bg-paper-2 from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100'
            }`} />

            <div className="relative z-10 h-full flex flex-col">
              {/* Header */}
              <div className="flex items-start justify-between mb-4 gap-2">
                <div className="flex-1 text-left min-w-0">
                  <div className="flex items-center gap-2 mb-1 min-w-0">
                    <div
                      className="w-4 h-4 rounded-full shadow-2 flex-shrink-0"
                      style={{ backgroundColor: listColor }}
                    />
                    <h3
                      className="text-base font-semibold text-foreground group-hover:text-primary transition-colors truncate uppercase tracking-wider min-w-0"
                      title={list.name.length > 30 ? list.name : undefined}
                    >
                      {list.name}
                    </h3>
                  </div>
                  <p className="text-[10px] text-muted-foreground/60 mb-2 uppercase tracking-wider text-left">
                    #{list.id}
                  </p>

                  {/* Share section or Copy button for shared lists */}
                  <div className="flex items-center gap-2 mb-2 relative flex-wrap">
                    {list.isShared ? (
                      /* Copy button for shared lists */
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onCopy) {
                            onCopy(list.id, list.name, list.isQualified || false);
                          }
                        }}
                        className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded border border-border hover:bg-green-50 hover:border-green-200 transition-colors group"
                      >
                        <FolderOpen className="h-3.5 w-3.5 text-muted-foreground group-hover:text-green-600" />
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground group-hover:text-green-600">
                          Shared with me
                        </span>
                      </div>
                    ) : (
                      <>
                        {/* Share button/info for own lists */}
                        {sharedProjects.length === 0 ? (
                          <div
                            onClick={handleShareClick}
                            className="cursor-pointer flex items-center gap-1.5 px-2.5 py-1 rounded border border-border hover:bg-blue-50 hover:border-blue-200 transition-colors group"
                          >
                            <Share2 className="h-3.5 w-3.5 text-muted-foreground group-hover:text-blue-600" />
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground group-hover:text-blue-600">
                              Share
                            </span>
                          </div>
                        ) : (
                          <>
                            <div
                              onClick={handleShareClick}
                              className="cursor-pointer flex items-center gap-2 px-2.5 py-1 rounded border border-border hover:bg-blue-50 hover:border-blue-200 transition-colors group"
                            >
                              <Settings className="h-3.5 w-3.5 text-muted-foreground group-hover:text-blue-600" />
                              <span className="text-[10px] uppercase tracking-wider text-muted-foreground group-hover:text-blue-600">
                                Shared ({sharedProjects.length})
                              </span>
                            </div>
                          </>
                        )}

                        {/* Edit and Delete buttons - only for own lists */}
                        <div
                          onClick={handleEdit}
                          className="cursor-pointer p-1.5 rounded border border-border hover:bg-green-50 hover:border-green-200 transition-colors group"
                        >
                          <Edit className="h-3.5 w-3.5 text-muted-foreground group-hover:text-green-600" />
                        </div>
                        <div
                          onClick={handleDelete}
                          className="cursor-pointer p-1.5 rounded border border-border hover:bg-destructive/5 hover:border-destructive/20 transition-colors group"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-muted-foreground group-hover:text-destructive" />
                        </div>
                      </>
                    )}

                    {/* Share Popover */}
                    {showSharePopover && (
                      <div
                        ref={sharePopoverRef}
                        className="absolute top-full left-0 mt-1 bg-paper rounded-lg shadow-2 p-3 z-50 min-w-[250px]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="mb-3">
                          <span className="text-xs font-semibold uppercase tracking-wider">Share with Projects</span>
                          <p className="text-[9px] text-muted-foreground uppercase tracking-wider mt-0.5">(Read-only access) - {availableProjects.length} available</p>
                        </div>

                        {/* Search bar - always visible */}
                        <div className="relative mb-4">
                          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                          <Input
                            type="text"
                            placeholder="Search projects..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-7 h-7 text-xs rounded-sm"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>

                        <div className="space-y-2 max-h-[200px] overflow-y-auto">
                          {availableProjects.length === 0 ? (
                            <p className="text-xs text-muted-foreground text-center py-4">No other projects available</p>
                          ) : (
                            (() => {
                              const filtered = availableProjects.filter(p =>
                                p.name.toLowerCase().includes(searchQuery.toLowerCase())
                              );
                              const displayed = filtered.slice(0, 5);

                              return displayed.map((project) => (
                                <div key={project.id} className="flex items-center gap-2">
                                  <Checkbox
                                    id={`project-${project.id}`}
                                    checked={selectedProjects.includes(project.id)}
                                    onCheckedChange={() => handleProjectToggle(project.id)}
                                  />
                                  <label
                                    htmlFor={`project-${project.id}`}
                                    className="text-xs cursor-pointer flex-1 uppercase tracking-wider"
                                  >
                                    {project.name}
                                  </label>
                                </div>
                              ));
                            })()
                          )}
                        </div>
                        <div className="mt-3 pt-2 flex justify-end">
                          <Button
                            size="sm"
                            onClick={handleShareSave}
                            className="bg-ink hover:bg-ink text-paper rounded shadow-[0_2px_8px_rgba(0,0,0,0.08)] uppercase tracking-wider font-bold text-[10px] h-7"
                          >
                            <Check className="h-3 w-3 mr-1" />
                            Save
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground line-clamp-2 uppercase tracking-wider text-left pt-1">
                    {list.description || "No description"}
                  </p>
                </div>
              </div>

              {/* AI Insights Badge */}
              {list.isEnhancementLoading ? (
                <div className="mb-4 p-3 bg-paper-2 from-primary/10 to-accent/10 rounded-lg border border-primary/20 animate-pulse">
                  <div className="flex items-start gap-2">
                    <Sparkles className="h-4 w-4 text-primary flex-shrink-0 mt-0.5 animate-spin" />
                    <div className="h-4 bg-primary/20 rounded w-3/4"></div>
                  </div>
                </div>
              ) : list.aiInsights?.summary ? (
                <div className="mb-4 p-3 bg-paper-2 from-primary/10 to-accent/10 rounded-lg border border-primary/20">
                  <div className="flex items-start gap-2">
                    <Sparkles className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-foreground/80 italic line-clamp-2">
                      "{list.aiInsights.summary}"
                    </p>
                  </div>
                </div>
              ) : null}

              {/* Enhanced Stats Grid */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-background/50 rounded-lg p-3 border border-border/50 flex flex-col items-center text-center">
                  <div className="flex items-center gap-1 text-muted-foreground mb-1">
                    <Users className="h-3.5 w-3.5" />
                  </div>
                  <p className="text-xl font-bold text-foreground">
                    {list.totalCandidates}
                  </p>
                </div>
                <div className="bg-background/50 rounded-lg p-3 border border-border/50 flex flex-col items-center text-center">
                  <div className="flex items-center gap-1 text-muted-foreground mb-1">
                    <Video className="h-3.5 w-3.5" />
                  </div>
                  <p className="text-xl font-bold text-foreground">{list.sourcesCount}</p>
                </div>
                <div className="bg-background/50 rounded-lg p-3 border border-border/50 flex flex-col items-center text-center">
                  <div className="flex items-center gap-1 text-muted-foreground mb-1">
                    <Star className="h-3.5 w-3.5" />
                  </div>
                  <p className="text-xl font-bold text-foreground">{topPerformers}</p>
                </div>
              </div>

              {/* Key Insights */}
              {list.aiInsights && (
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <Badge variant="secondary" className="justify-start gap-1 py-1.5">
                    <Zap className="h-3 w-3" />
                    <span className="text-xs truncate">{list.aiInsights.topSkill}</span>
                  </Badge>
                  <Badge variant="outline" className="justify-start gap-1 py-1.5">
                    <span className="text-xs">Diversity: {list.aiInsights.diversityScore}%</span>
                  </Badge>
                </div>
              )}

              {/* Candidate Avatars */}
              <div className="flex-1">
                {list.isEnhancementLoading ? (
                  <div className="flex -space-x-2">
                    {[...Array(5)].map((_, idx) => (
                      <div key={idx} className="h-10 w-10 rounded-full bg-muted/50 border-2 border-background animate-pulse" />
                    ))}
                  </div>
                ) : (
                  <div className="flex -space-x-2">
                    {/* Show actual candidate avatars */}
                    {list.candidates && list.candidates.slice(0, 5).map((candidate, idx) => (
                      <Avatar key={candidate.id} className="h-10 w-10 border-2 border-background ring-1 ring-border relative z-10">
                        <AvatarImage src={candidate.profilePicture} />
                        <AvatarFallback className="text-xs bg-paper-2 from-primary/20 to-accent/20">
                          {candidate.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                    {/* Fill remaining slots up to 5 with placeholder avatars if totalCandidates > current candidates */}
                    {list.candidates && list.candidates.length < 5 && list.totalCandidates > list.candidates.length &&
                      [...Array(Math.min(5 - list.candidates.length, list.totalCandidates - list.candidates.length))].map((_, idx) => (
                        <div key={`placeholder-${idx}`} className="h-10 w-10 rounded-full bg-muted/50 border-2 border-background flex items-center justify-center ring-1 ring-border relative z-10">
                          <span className="text-xs font-medium text-muted-foreground">?</span>
                        </div>
                      ))
                    }
                    {/* Show +X badge if there are more than 5 total candidates - with higher z-index */}
                    {list.totalCandidates > 5 && (
                      <div className="h-10 w-10 rounded-full bg-muted border-2 border-background flex items-center justify-center ring-1 ring-border relative z-20">
                        <span className="text-[11px] font-semibold text-foreground">
                          +{list.totalCandidates - 5}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Date Footer */}
              <div className="mt-auto pt-3 flex items-center justify-end text-[7px] text-ink uppercase tracking-wider">
                <span>
                  Last Updated: {new Date(list.updatedAt).toLocaleDateString('en-GB')} {new Date(list.updatedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* BACK SIDE - Sources */}
        <div className="flip-card-back">
          <Card className="p-5 shadow-1 border relative h-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col" style={{ height: '100%', maxHeight: '400px' }}>
              {/* Header */}
              <div className="flex items-center justify-between mb-4 flex-shrink-0">
                <h3 className="text-base font-semibold uppercase tracking-wider">Sources</h3>
                <Button
                  variant="ghost"
                  onClick={handleEdit}
                  className="text-red-500 hover:text-red-600 hover:bg-red-50 font-semibold uppercase tracking-wider text-xs"
                >
                  Cancel
                </Button>
              </div>

              {/* Sources List - Scrollable */}
              <div className="flex-1 overflow-y-auto space-y-3 min-h-0">
                {sources.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No sources available
                  </div>
                ) : (
                  sources.map((source) => (
                    <div
                      key={source.id}
                      className="py-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center gap-2">
                        {/* Google Sheets Logo - show for both google_sheets and google_sheet */}
                        {(source.type === 'google_sheets' || source.type === 'google_sheet') && (
                          <div className="flex-shrink-0 w-6 h-6 bg-paper border border-rule rounded-sm flex items-center justify-center p-1">
                            <img src={googleLogo} alt="Google Sheets" className="w-full h-full object-contain" />
                          </div>
                        )}

                        {/* Source Name and Last Updated */}
                        <div className="flex-1 min-w-0 pr-4">
                          <p className="text-xs font-semibold text-foreground truncate uppercase tracking-wider text-left">
                            {source.name || 'Untitled Source'}
                          </p>
                          {source.lastExtractedAt && (
                            <p className="text-[9px] text-muted-foreground/70 mt-0.5 uppercase tracking-wider text-left">
                              {new Date(source.lastExtractedAt).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true
                              })}
                            </p>
                          )}
                        </div>

                        {/* Sync Button - show for both google_sheets and google_sheet */}
                        {(source.type === 'google_sheets' || source.type === 'google_sheet') && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => handleSync(e, source.id)}
                            disabled={syncingSourceId === source.id}
                            className="flex-shrink-0 uppercase tracking-wider text-[10px] h-7 px-2"
                          >
                            {syncingSourceId === source.id ? (
                              <>
                                <Loader2 className="h-2.5 w-2.5 mr-1 animate-spin" />
                                Syncing
                              </>
                            ) : (
                              <>
                                <RefreshCw className="h-2.5 w-2.5 mr-1" />
                                Sync
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Add Source Button */}
              <div className="mt-4 pt-4 border-t border-border/50 flex-shrink-0">
                <Button
                  variant="outline"
                  className="w-full justify-center gap-2 uppercase tracking-wider text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onAddSource) {
                      onAddSource(list.id);
                    } else {
                      toast.info("Add source functionality coming soon");
                    }
                  }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Google Sheet
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
