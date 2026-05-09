import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquareQuote, CheckCircle, TrendingDown, Lightbulb, Zap, Target } from "lucide-react";

interface Competency {
  pillar_name: string;
  pillar_score: number;
  overall_strength?: string;
  overall_weakness?: string;
  skills?: any[];
}

interface ResultsData {
  overall_summary?: string;
  hireability_recommendation?: string;
  suggested_next_steps?: string | string[];
  competencies?: Competency[];
}

interface VideoAnalyticsDrawerProps {
  resultsData: ResultsData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidateName?: string;
  SkillsRadarChart?: React.ComponentType<{ competencies: Competency[] }>;
}

export function VideoAnalyticsDrawer({
  resultsData,
  open,
  onOpenChange,
  candidateName = "Candidate",
  SkillsRadarChart
}: VideoAnalyticsDrawerProps) {
  if (!resultsData) return null;

  const getBadgeClass = (decision: string) => {
    const lowerDecision = decision.toLowerCase();
    if (lowerDecision.includes("not recommend")) return "bg-red-100 text-red-800 border-red-300";
    if (lowerDecision.includes("reservations")) return "bg-yellow-100 text-yellow-800 border-yellow-300";
    if (lowerDecision.includes("recommend")) return "bg-green-100 text-green-800 border-green-300";
    return "bg-slate-100 text-slate-800 border-slate-300";
  };

  const getIcon = (decision: string) => {
    const lowerDecision = decision.toLowerCase();
    if (lowerDecision.includes("not recommend")) return <TrendingDown className="h-5 w-5 text-red-600" />;
    if (lowerDecision.includes("reservations")) return <Lightbulb className="h-5 w-5 text-yellow-600" />;
    if (lowerDecision.includes("recommend")) return <CheckCircle className="h-5 w-5 text-green-600" />;
    return null;
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return "text-green-600 bg-green-100 border-green-300";
    if (score >= 6) return "text-yellow-600 bg-yellow-100 border-yellow-300";
    if (score >= 4) return "text-orange-600 bg-orange-100 border-orange-300";
    return "text-red-600 bg-red-100 border-red-300";
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="text-2xl flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary" />
            Interview Analytics
          </SheetTitle>
          <p className="text-sm text-muted-foreground">
            Comprehensive assessment for {candidateName}
          </p>
        </SheetHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="competencies">Competencies</TabsTrigger>
            <TabsTrigger value="competencies-detail">
              <span>Competencies <span className="text-[10px] text-muted-foreground">(Detail)</span></span>
            </TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
          </TabsList>

          {/* OVERVIEW TAB */}
          <TabsContent value="overview" className="space-y-6">
            {/* Overall Summary */}
            {resultsData.overall_summary && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <MessageSquareQuote className="h-5 w-5 text-primary" />
                    Overall Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {resultsData.overall_summary}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Hireability Recommendation */}
            {resultsData.hireability_recommendation && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Hireability Recommendation</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    {getIcon(resultsData.hireability_recommendation)}
                    <Badge variant="outline" className={`text-base font-semibold ${getBadgeClass(resultsData.hireability_recommendation)}`}>
                      {resultsData.hireability_recommendation}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Suggested Next Steps */}
            {resultsData.suggested_next_steps && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Target className="h-5 w-5 text-green-600" />
                    What Next?
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {(Array.isArray(resultsData.suggested_next_steps)
                      ? resultsData.suggested_next_steps.slice(0, 3)
                      : [resultsData.suggested_next_steps]
                    ).map((step, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mt-0.5">
                          <span className="text-xs font-bold text-green-700">
                            {index + 1}
                          </span>
                        </div>
                        <span className="text-sm text-foreground leading-relaxed flex-1">
                          {step}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* COMPETENCIES TAB - Radar Chart */}
          <TabsContent value="competencies" className="space-y-6">
            {/* Skills Radar Chart */}
            {SkillsRadarChart && resultsData.competencies && resultsData.competencies.length > 0 && (
              <Card>
                <CardContent className="flex items-center justify-center py-4">
                  <SkillsRadarChart competencies={resultsData.competencies} />
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* COMPETENCIES DETAIL TAB */}
          <TabsContent value="competencies-detail" className="space-y-3">
            {/* Competencies Detail Section - Bento Grid Style */}
            {resultsData.competencies && resultsData.competencies.length > 0 && (
              <div className="space-y-3">
                {resultsData.competencies.map((comp, index) => {
                  const scoreNum = comp.pillar_score;

                  return (
                    <div key={index} className="group border-2 border-gray-200 rounded-xl overflow-hidden hover:border-primary/50 hover:shadow-xl transition-all duration-300">
                      {/* Header Row with Score Bar */}
                      <div className="relative bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 px-4 py-3 border-b-2 border-gray-100">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-bold text-gray-900 group-hover:text-primary transition-colors">
                            {comp.pillar_name}
                          </h4>
                          <Badge variant="outline" className={`font-bold text-sm px-3 py-1 shadow-sm ${getScoreColor(scoreNum)}`}>
                            {scoreNum.toFixed(1)}<span className="text-[10px] ml-0.5">/10</span>
                          </Badge>
                        </div>
                        {/* Score Progress Bar */}
                        <div className="w-full bg-white/60 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-primary to-purple-600 rounded-full transition-all duration-500"
                            style={{ width: `${(scoreNum / 10) * 100}%` }}
                          />
                        </div>
                      </div>

                      {/* Content Grid - 2 Columns */}
                      <div className="grid grid-cols-2 divide-x-2 divide-gray-100">
                        {/* Strength Column */}
                        {comp.overall_strength && (
                          <div className="p-4 bg-gradient-to-br from-emerald-50/50 to-green-50/30 hover:from-emerald-50 hover:to-green-50 transition-colors">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-sm">
                                <span className="text-white text-[10px] font-bold">✓</span>
                              </div>
                              <h5 className="text-xs font-bold text-green-800 uppercase tracking-wide">Strength</h5>
                            </div>
                            <p className="text-xs text-gray-700 leading-relaxed">
                              {comp.overall_strength}
                            </p>
                          </div>
                        )}

                        {/* Growth Column */}
                        {comp.overall_weakness && (
                          <div className="p-4 bg-gradient-to-br from-amber-50/50 to-orange-50/30 hover:from-amber-50 hover:to-orange-50 transition-colors">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-sm">
                                <span className="text-white text-[10px] font-bold">↗</span>
                              </div>
                              <h5 className="text-xs font-bold text-orange-800 uppercase tracking-wide">Growth</h5>
                            </div>
                            <p className="text-xs text-gray-700 leading-relaxed">
                              {comp.overall_weakness}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* INSIGHTS TAB */}
          <TabsContent value="insights" className="space-y-6">
            <Card className="bg-muted/50">
              <CardContent className="py-12 text-center">
                <Lightbulb className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">
                  Additional insights coming soon
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
