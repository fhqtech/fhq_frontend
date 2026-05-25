import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, User, CheckCircle2, Clock, XCircle, AlertCircle, Eye, CheckCircle, MapPin, ThumbsUp, ThumbsDown, Check, X, Copy, Mail, MailWarning, MailCheck, RefreshCw, RotateCcw } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { interviewApi } from "@/services/interviewApi";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
} from "recharts";
import SkillsGraph from "../ui/SkillsGraph";
import { ReviewerSkillsGraph } from "../ui/ReviewerSkillsGraph";

interface CandidateCardProps {
  candidate: any;
  onClick?: () => void;
  hideViewButton?: boolean;
  /** Called after a successful reset so the parent can refetch the candidate list. */
  onRefresh?: () => void | Promise<void>;
}

export function CandidateCard({ candidate, onClick, hideViewButton = false, onRefresh }: CandidateCardProps) {
  const [copied, setCopied] = useState(false);
  const [resending, setResending] = useState(false);
  const [resetting, setResetting] = useState(false);
  // Local optimistic mirror of the email_* fields so the UI flips
  // immediately after a Resend without re-fetching the whole list.
  const [emailState, setEmailState] = useState<{
    sent: boolean | null;
    sentAt: string | null;
    error: string | null;
  }>({
    sent: candidate.email_sent ?? null,
    sentAt: candidate.email_sent_at ?? null,
    error: candidate.email_error ?? null,
  });
  const { toast } = useToast();
  const hasSession = candidate.session_id && candidate.session_status === "completed";
  const hasScore = candidate.score !== null && candidate.score !== undefined;

  const handleResend = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!candidate.invitation_id) {
      toast({ title: "Cannot resend", description: "Missing invitation id", variant: "destructive" });
      return;
    }
    setResending(true);
    try {
      const result = await interviewApi.resendInvitationEmail(candidate.invitation_id);
      setEmailState({
        sent: result.email_sent,
        sentAt: result.email_sent_at,
        error: result.email_error,
      });
      if (result.email_sent) {
        toast({ title: "Email resent", description: `Sent to ${candidate.email}` });
      } else {
        toast({
          title: "Resend failed",
          description: result.email_error || "Email did not send",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      if (err?.status === 429) {
        toast({
          title: "Slow down",
          description: "Resend rate limit hit. Try again in a minute.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Resend failed",
          description: err?.message || "Network error",
          variant: "destructive",
        });
      }
    } finally {
      setResending(false);
    }
  };

  const handleResetAndReinvite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!candidate.invitation_id) {
      toast({
        title: "Cannot reset",
        description: "Missing invitation id — refresh the page and try again.",
        variant: "destructive",
      });
      return;
    }
    const confirmed = window.confirm(
      `Reset ${candidate.name || "this candidate"}'s attempts and send a new invitation? ` +
      `This marks the previous session and score as abandoned (kept for audit) ` +
      `and lets them retake the interview from scratch.`
    );
    if (!confirmed) return;
    setResetting(true);
    try {
      const result = await interviewApi.resetAndReinviteCandidate(candidate.invitation_id);
      toast({
        title: "Candidate reset",
        description: result.email_sent
          ? `Cleared previous attempts and re-sent invitation to ${candidate.email || "candidate"}.`
          : `Cleared previous attempts. Email send may have failed — check the candidate's row.`,
      });
      if (onRefresh) {
        await onRefresh();
      }
    } catch (err: any) {
      toast({
        title: "Reset failed",
        description: err?.message || "Network error",
        variant: "destructive",
      });
    } finally {
      setResetting(false);
    }
  };

  // Get blueprint from the latest attempt (if exists)
  const blueprint = candidate.attempts && candidate.attempts.length > 0
    ? candidate.attempts[candidate.attempts.length - 1].blueprint
    : null;

  // Debug: Log candidate data to check invitation_token

  // Build radar data from competencies array in blueprint
  const radarData = blueprint && blueprint.competencies ?
    blueprint.competencies
      .map((comp: any) => ({
        skill: comp.pillar_name,
        value: comp.pillar_score
      }))
      .slice(0, 8) // Limit to 8 axes for readability
    : [];

  // Check if we should show the radar chart (has competencies data)
  const hasBlueprint = radarData.length > 0;

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-success";
    if (score >= 80) return "text-primary";
    if (score >= 70) return "text-accent";
    return "text-muted-foreground";
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const capitalizeWords = (text: string) => {
    return text
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };

  const formatLocation = (location: string) => {
    const parts = location.split(',').map(part => part.trim());
    if (parts.length > 1) {
      return `${parts[0]}, ${parts[parts.length - 1]}`;
    }
    return location;
  };

  const getCardStyle = () => {
    // Priority 1: Swipe decision colors override everything
    if (candidate.swipe_decision) {
      return candidate.swipe_decision.decision === 'shortlist'
        ? 'border-2 border-rule bg-success-soft/50 shadow-[0_4px_12px_rgba(34,197,94,0.15)]'
        : 'border-2 border-rule bg-danger-soft/50 shadow-[0_4px_12px_rgba(239,68,68,0.15)]';
    }

    // Priority 2: Availability color coding
    const availability = candidate.availableIn?.toLowerCase() || '';
    if (availability.includes('immediate')) {
      return 'border-[1.5px] border-rule/30 bg-info/5';
    } else if (availability.includes('2 week') || availability.includes('< 2')) {
      return 'border-[1.5px] border-rule/30 bg-gold/5';
    } else if (availability.includes('month') || availability.includes('> 1')) {
      return 'border-[1.5px] border-rule/30 bg-orange/5';
    }

    // Default: Gray with hover effect
    return 'border-[1.5px] border-rule-strong/30 bg-muted/5 hover:border-primary/30';
  };

  const getExperienceBadge = () => {
    // Parse experience - handle both number and string formats
    let expYears = 0;
    let expMonths = 0;

    if (typeof candidate.experience === 'number') {
      expYears = candidate.experience;
    } else if (typeof candidate.experience === 'string') {
      // Extract years and months from strings like "1 year 6 months", "5 years", "0 years"
      const yearMatch = candidate.experience.match(/(\d+)\s*year/i);
      const monthMatch = candidate.experience.match(/(\d+)\s*month/i);

      if (yearMatch) expYears = parseInt(yearMatch[1]);
      if (monthMatch) expMonths = parseInt(monthMatch[1]);
    }

    // Determine display: number and suffix separately
    let number = '';
    let suffix = '';

    if (expYears === 0 && expMonths > 0) {
      number = '< 1';
      suffix = 'YR';
    } else if (expYears === 1 && expMonths > 0) {
      number = '1+';
      suffix = 'YR';
    } else if (expYears > 1 && expMonths > 0) {
      number = `${expYears}+`;
      suffix = 'YRS';
    } else if (expYears === 1) {
      number = '1';
      suffix = 'YR';
    } else if (expYears === 0) {
      number = '0';
      suffix = 'YRS';
    } else if (expYears >= 10) {
      number = '10+';
      suffix = 'YRS';
    } else {
      number = `${expYears}`;
      suffix = 'YRS';
    }

    // Color coding based on years
    if (expYears >= 10) return { number, suffix, color: 'bg-gold' };
    if (expYears >= 5) return { number, suffix, color: 'bg-success' };
    if (expYears >= 2) return { number, suffix, color: 'bg-warning' };
    return { number, suffix, color: 'bg-info' };
  };

  const experienceBadge = getExperienceBadge();

  return (
    <Card
      className={`group shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] transition-all duration-300 relative overflow-hidden rounded-sm ${onClick ? "cursor-pointer" : ""} ${getCardStyle()}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      <div className="absolute inset-0 bg-paper-2 from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <CardContent className="p-5 relative">
        {/* Header with Score Badge */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="flex flex-col items-center gap-1">
              <Avatar className="h-12 w-12 shrink-0">
                <AvatarImage
                  src={candidate.profilePicture || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(candidate.name)}`}
                  alt={candidate.name}
                />
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                  {getInitials(candidate.name)}
                </AvatarFallback>
              </Avatar>
              {/* Experience Chip below Avatar */}
              {candidate.experience !== null && candidate.experience !== undefined && (
                <div className={`${experienceBadge.color} text-paper px-2 py-0.5 rounded inline-flex items-center gap-0.5 text-[10px] font-bold shadow-1 w-12 justify-center`}>
                  <span className="text-sm leading-none">{experienceBadge.number}</span>
                  <span className="text-[7px] leading-none">{experienceBadge.suffix}</span>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                {capitalizeWords(candidate.name)}
              </h3>
              <p className="text-sm text-muted-foreground truncate">
                {candidate.jobTitle ? capitalizeWords(candidate.jobTitle) : 'Not Registered'}
              </p>
              {candidate.location ? (
                <div className="flex items-center gap-1 mt-1">
                  <MapPin className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground truncate">{formatLocation(candidate.location)}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 mt-1">
                  <MapPin className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground truncate">Not Registered</span>
                </div>
              )}
            </div>
          </div>
          {hasScore && (
            <div className="shrink-0 text-center ml-2">
              <div className={`text-3xl font-bold ${getScoreColor(candidate.score)}`}>
                {candidate.score}
              </div>
              <div className="text-xs text-muted-foreground">Score</div>
              {blueprint?.role_fit_score !== null && blueprint?.role_fit_score !== undefined && (
                <div className="text-xs font-semibold text-ink mt-1">
                  {Math.round(blueprint.role_fit_score)}% Match
                </div>
              )}
            </div>
          )}
        </div>

        {/* Status Badge - Full Width Card.
            R1 (2026-05-25): three-state logic.
              A. session_status !== "completed" → "NOT INTERVIEWED" (grey)
              B. completed + blueprint.hireability_recommendation → coloured banner
              C. completed but no recommendation → "RESULTS PENDING" (amber)
            Previously the badge read only blueprint.hireability_recommendation,
            so any completed session without a reviewer-produced recommendation
            displayed "NOT INTERVIEWED" — visibly wrong for candidates with
            scores like 77/0/66. */}
        <div className="mb-4">
          {(() => {
            const isCompletedSession = candidate.session_status === "completed";
            const rec = blueprint?.hireability_recommendation as string | undefined;
            if (!isCompletedSession) {
              return (
                <div className="w-full px-4 py-3 text-center font-bold text-[11px] bg-muted/50 text-muted-foreground border border-border shadow-2">
                  NOT INTERVIEWED
                </div>
              );
            }
            if (rec) {
              const colorClass =
                rec === "Strongly Recommend" || rec === "Strong Recommend" || rec === "Recommend"
                  ? "bg-success/10 text-success border border-rule/30"
                  : rec === "Recommend with Reservations"
                    ? "bg-warning/10 text-warning border border-rule/30"
                    : rec === "Do Not Recommend"
                      ? "bg-danger/10 text-danger border border-rule/30"
                      : "bg-muted/50 text-muted-foreground border border-border";
              return (
                <div className={`w-full px-4 py-3 text-center font-bold text-[11px] shadow-2 ${colorClass}`}>
                  {rec.toUpperCase()}
                </div>
              );
            }
            return (
              <div className="w-full px-4 py-3 text-center font-bold text-[11px] bg-amber-50 text-amber-900 border border-amber-200 shadow-2">
                RESULTS PENDING
              </div>
            );
          })()}
          {/* Copy candidate link (A2 2026-05-12).
              Pre-registration → /register/{token}
              Post-registration → /candidate-portal/{token}
              Visible on every card now so recruiters can re-send a
              link at any stage (e.g. candidate lost it). */}
          {candidate.invitation_token && (() => {
            const isRegistered = ['registered', 'completed', 'scheduling'].includes(candidate.status);
            const path = isRegistered ? 'candidate-portal' : 'register';
            const label = isRegistered ? 'Copy Portal Link' : 'Copy Invitation Link';
            return (
              <div className="mt-4 flex items-center justify-center gap-2">
                <span className="text-xs text-muted-foreground font-medium">{label}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const link = `${window.location.origin}/${path}/${candidate.invitation_token}`;
                    navigator.clipboard.writeText(link);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="shrink-0 p-1.5 rounded bg-ink hover:bg-ink text-paper transition-colors shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
                  title={isRegistered ? 'Copy candidate portal URL' : 'Copy registration URL'}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-success" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
            );
          })()}

          {/* Email-delivery status chip + Resend (Phase 3b) */}
          {candidate.invitation_id && (() => {
            const sent = emailState.sent;
            const sentAt = emailState.sentAt;
            const error = emailState.error;
            let chipClass = "border-border bg-muted/40 text-muted-foreground";
            let icon = <Mail className="h-3 w-3" />;
            let label = "Email pending";
            if (sent === true) {
              chipClass = "border-rule bg-success-soft text-success";
              icon = <MailCheck className="h-3 w-3" />;
              const when = sentAt
                ? new Date(sentAt).toLocaleDateString()
                : "";
              label = when ? `Email sent · ${when}` : "Email sent";
            } else if (sent === false) {
              chipClass = "border-rule bg-danger-soft text-danger";
              icon = <MailWarning className="h-3 w-3" />;
              label = "Email failed";
            }
            return (
              <div className="mt-3 flex items-center justify-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px]   font-semibold rounded border ${chipClass}`}
                  title={error || (sentAt ? `Sent ${new Date(sentAt).toLocaleString()}` : "")}
                >
                  {icon}
                  {label}
                </span>
                <button
                  onClick={handleResend}
                  disabled={resending || resetting}
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded border border-primary text-primary hover:bg-primary hover:text-paper disabled:opacity-50 transition-colors"
                  title="Resend invitation email"
                >
                  <RefreshCw
                    className={`h-3 w-3 ${resending ? "animate-spin" : ""}`}
                  />
                  {resending
                    ? "Resending…"
                    : sent === true
                    ? "Resend again"
                    : "Resend"}
                </button>
                {candidate.invitation_id && (
                  <button
                    onClick={handleResetAndReinvite}
                    disabled={resetting || resending}
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded border border-destructive text-destructive hover:bg-destructive hover:text-paper disabled:opacity-50 transition-colors"
                    title="Mark previous attempts as abandoned and re-send the invitation"
                  >
                    <RotateCcw
                      className={`h-3 w-3 ${resetting ? "animate-spin" : ""}`}
                    />
                    {resetting ? "Resetting…" : "Reset & re-invite"}
                  </button>
                )}
              </div>
            );
          })()}
        </div>

        {/* Strength & Weakness Indicators */}
        {blueprint && (blueprint.key_strengths || blueprint.key_weaknesses || blueprint.standout_moments) && (
          <div className="flex items-center justify-between mb-4 px-2">
            {/* Left side: Strengths & Weaknesses */}
            <div className="flex items-center gap-4">
              {/* Strengths Count */}
              {blueprint.key_strengths && blueprint.key_strengths.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-2xl font-bold text-ink">
                    {blueprint.key_strengths.length}
                  </span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="#16a34a" viewBox="0 0 256 256">
                    <path d="M239.22,59.44l-45.63,95.82a3.54,3.54,0,0,1-.16.34l-34.21,71.84a8,8,0,1,1-14.44-6.88L173.62,160H40a8,8,0,0,1-5.66-13.66L76.69,104,34.34,61.66A8,8,0,0,1,40,48H232a8,8,0,0,1,7.22,11.44Z"></path>
                  </svg>
                </div>
              )}

              {/* Weaknesses Count */}
              {blueprint.key_weaknesses && blueprint.key_weaknesses.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-2xl font-bold text-ink">
                    {blueprint.key_weaknesses.length}
                  </span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="#dc2626" viewBox="0 0 256 256">
                    <path d="M239.22,59.44l-45.63,95.82a3.54,3.54,0,0,1-.16.34l-34.21,71.84a8,8,0,1,1-14.44-6.88L173.62,160H40a8,8,0,0,1-5.66-13.66L76.69,104,34.34,61.66A8,8,0,0,1,40,48H232a8,8,0,0,1,7.22,11.44Z"></path>
                  </svg>
                </div>
              )}
            </div>

            {/* Right side: Standout Moments */}
            {blueprint.standout_moments && blueprint.standout_moments.length > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="text-2xl font-bold text-ink">
                  {blueprint.standout_moments.length}
                </span>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="#eab308" viewBox="0 0 256 256">
                  <path d="M216,96A88,88,0,1,0,72,163.83V240a8,8,0,0,0,11.58,7.16L128,225l44.43,22.21A8.07,8.07,0,0,0,176,248a8,8,0,0,0,8-8V163.83A87.85,87.85,0,0,0,216,96ZM56,96a72,72,0,1,1,72,72A72.08,72.08,0,0,1,56,96Zm16,0a56,56,0,1,1,56,56A56.06,56.06,0,0,1,72,96Z"></path>
                </svg>
              </div>
            )}
          </div>
        )}

        {/* Skill Graph (Preferred) or Radar Chart (Fallback) */}
        {blueprint?.graph_data ? (
          <div className="mb-4 -mx-2 bg-paper rounded-sm p-0 overflow-hidden flex justify-center">
            {(() => {
              // Transform graph_data nodes to BlueprintSkill format
              const graphSkills = blueprint.graph_data.nodes
                .filter((n: any) => ['skill', 'gap', 'transferable'].includes(n.type))
                .map((node: any) => {
                  let category = 'developing';

                  if (node.type === 'gap') {
                    category = 'gap';
                  } else if (node.type === 'transferable') {
                    category = 'transferable';
                  } else {
                    // Skill Type Analysis
                    const prof = (node.proficiency_label || '').toLowerCase();
                    const label = (node.label || '').toLowerCase();

                    if (prof.includes('gap') || prof.includes('significant') || prof.includes('minimal') || prof.includes('below')) {
                      category = 'gap';
                    } else if (prof.includes('not assessed')) {
                      category = 'not_assessed';
                    } else if (prof.includes('expert') || prof.includes('advanced') || prof.includes('strong')) {
                      category = 'strong_match';
                    } else {
                      category = 'developing';
                    }
                  }

                  return {
                    skill_id: node.id,
                    name: node.label,
                    shortName: node.label,
                    description: node.proficiency_label || 'Skill evaluation based on interview performance',
                    findings: node.evidence || [],
                    category: category,
                    expected_proficiency: 3,
                    proficiency_levels: []
                  };
                });

              // Construct layout from graph_data if needed, or let SkillsGraph auto-layout
              // SkillsGraph uses generateLayoutFromData. We need to pass skills.

              return (
                <ReviewerSkillsGraph
                  roleTitle={candidate.jobTitle || "Candidate Role"}
                  skills={graphSkills}
                  size={280}
                />
              );
            })()}
          </div>
        ) : hasBlueprint ? (
          <div className="mb-4 -mx-2 bg-paper rounded-sm p-2">
            <ResponsiveContainer width="100%" height={240}>
              <RadarChart data={radarData} margin={{ top: 25, right: 35, bottom: 25, left: 35 }}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis
                  dataKey="skill"
                  tick={(props: any) => {
                    const { x, y, payload, cx, cy } = props;
                    const words = payload.value.split(' ');

                    // Calculate angle and distance from center
                    const angle = Math.atan2(y - cy, x - cx);
                    const distance = 20; // Additional distance from edge

                    // Calculate new position further from center
                    const newX = x + Math.cos(angle) * distance;
                    const newY = y + Math.sin(angle) * distance;

                    return (
                      <text
                        x={newX}
                        y={newY}
                        textAnchor="middle"
                        fill="hsl(var(--muted-foreground))"
                        fontSize={10}
                      >
                        {words.map((word: string, i: number) => (
                          <tspan key={i} x={newX} dy={i === 0 ? 0 : 11}>
                            {word}
                          </tspan>
                        ))}
                      </text>
                    );
                  }}
                />
                <Radar
                  name="Proficiency"
                  dataKey="value"
                  stroke="#000000"
                  fill="#000000"
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="mb-4 h-[180px] flex items-center justify-center bg-transparent rounded-lg border border-border/30">
            <div className="text-center">
              <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                {hasSession ? 'Results Pending' : 'No Interview Yet'}
              </p>
            </div>
          </div>
        )}


        {/* Session Info */}
        {hasSession && candidate.attempts && candidate.attempts.length > 0 && (
          <div className="mb-3 p-3 rounded-lg bg-transparent border border-border/30">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Attempts:</span>
              <span className="font-semibold">{candidate.attempts.length}</span>
            </div>
            {candidate.duration && (
              <div className="flex items-center justify-between text-xs mt-1">
                <span className="text-muted-foreground">Duration:</span>
                <span className="font-semibold">{Math.floor(candidate.duration / 60)}m {candidate.duration % 60}s</span>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons - Hide for candidates without sessions */}
        {!hideViewButton && candidate.session_status !== 'no_session' && (
          <div className="flex items-center gap-3">
            {/* Shortlist Icon */}
            <button
              className={`rounded shadow-[0_2px_8px_rgba(0,0,0,0.08)] transition-all ${candidate.swipe_decision?.decision === 'shortlist'
                ? 'text-success'
                : 'text-muted-2 hover:text-success'
                }`}
              onClick={(e) => {
                e.stopPropagation();
                // TODO: Handle shortlist action
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </button>

            {/* Details Button — disabled when there's no completed session
                to view (F30.5: prevent silent no-op clicks that used to
                navigate nowhere). */}
            <Button
              className="flex-1 bg-ink hover:bg-ink-soft text-paper rounded shadow-[0_2px_8px_rgba(0,0,0,0.08)] font-bold text-xs border-none disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-ink"
              disabled={!hasSession}
              title={
                hasSession
                  ? "View applicant results"
                  : "Results available after the applicant completes the interview"
              }
              onClick={(e) => {
                e.stopPropagation();
                if (!hasSession) return;
                onClick?.();
              }}
            >
              Details
            </Button>

            {/* Reject Icon */}
            <button
              className={`rounded shadow-[0_2px_8px_rgba(0,0,0,0.08)] transition-all ${candidate.swipe_decision?.decision === 'reject'
                ? 'text-danger'
                : 'text-muted-2 hover:text-danger'
                }`}
              onClick={(e) => {
                e.stopPropagation();
                // TODO: Handle reject action
              }}
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
