import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";

import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { AuthProvider } from "@/contexts/AuthContext";
import { CandidateAuthProvider } from "@/contexts/CandidateAuthContext";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import { ConsentProvider } from "@/contexts/ConsentContext";
import { FlagProvider } from "@/lib/flags/FlagProvider";
import { ConsentBanner } from "@/components/ConsentBanner";
import { CommandPalette } from "@/components/CommandPalette";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import AdminRoute from "@/components/auth/AdminRoute";
import { OneBuilderRedirect } from "@/components/role/OneBuilderRedirect";
import { UnifiedRedirect } from "@/components/routing/UnifiedRedirect";
import CandidateProtectedRoute from "@/components/auth/CandidateProtectedRoute";
import { InvitationAuthGate } from "@/components/auth/InvitationAuthGate";
import { PageSkeleton } from "@/components/ui/shimmer";
// Eager: landing-path bundle (marketing → login → OAuth → 404). Keep these
// in the entry chunk so the first-paint network round trip stays small.
import MarketingLanding from "./pages/MarketingLanding";
import StartChooser from "./pages/StartChooser";
import NotFound from "./pages/NotFound";
import OAuth2Handler from "./components/auth/OAuth2Handler";
import { ErrorBoundary } from "./components/ErrorBoundary";

// C6: lazy-loaded routes. Each lazy() becomes a separate chunk in the
// build. Candidates hitting /interview/:id/* no longer download the
// recruiter dashboard JS; recruiters hitting /dashboard no longer
// download the AssemblyAI + Three.js + framer-motion session bundle.
const ProductLanding = lazy(() => import("./pages/ProductLanding"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Home = lazy(() => import("./pages/Home"));
const RoleContainer = lazy(() => import("./pages/RoleContainer"));
const OpenRoleFlow = lazy(() => import("./components/role/OpenRoleFlow"));
const Talent = lazy(() => import("./pages/Talent"));
const Candidate360 = lazy(() => import("./pages/Candidate360"));
const PilotDashboard = lazy(() => import("./pages/PilotDashboard"));
const PoolDashboard = lazy(() => import("./pages/PoolDashboard"));
const SkillMatcher = lazy(() => import("./pages/SkillMatcher"));
const CreateInterview = lazy(() => import("./pages/CreateInterview"));
const ManageInterviews = lazy(() => import("./pages/ManageInterviewsEnhanced"));
const InterviewDetails = lazy(() => import("./pages/InterviewDetails"));
const Practicals = lazy(() => import("./pages/Practicals"));
const Lists = lazy(() => import("./pages/Lists"));
const ListDetail = lazy(() => import("./pages/ListDetail"));
const QuickTour = lazy(() => import("./pages/QuickTour"));
const Settings = lazy(() => import("./pages/Settings"));
const SettingsPlan = lazy(() => import("./pages/Settings/Plan"));
const AdminWorkspaces = lazy(() => import("./pages/admin/Workspaces"));
const CandidateRegistration = lazy(() => import("./pages/CandidateRegistration"));
const CandidatePortal = lazy(() => import("./pages/CandidatePortal"));
const InterviewPreCheckPage = lazy(() => import("./pages/interview/InterviewPreCheckPage"));
const InterviewSessionV2Page = lazy(() => import("./pages/interview/InterviewSessionV2Page"));
const InterviewThankYouPage = lazy(() => import("./pages/interview/InterviewThankYouPage"));
const InterviewExpiredPage = lazy(() => import("./pages/interview/InterviewExpiredPage"));
const InterviewResults = lazy(() => import("./pages/InterviewResults"));
const DynamicBlueprintPage = lazy(() => import("./pages/DynamicBlueprintPage"));
const EmailTemplatePreview = lazy(() => import("./pages/EmailTemplatePreview"));
const InterviewSwipeView = lazy(() => import("./pages/InterviewSwipeView"));
const AcceptInvitation = lazy(() => import("./pages/AcceptInvitation"));
const TestAssets = lazy(() => import("./pages/TestAssets"));
const PrivacyPolicy = lazy(() => import("./pages/legal/PrivacyPolicy"));
const SampleTag = lazy(() => import("./pages/SampleTag"));
const TermsOfService = lazy(() => import("./pages/legal/TermsOfService"));
const DataAccount = lazy(() => import("./pages/account/DataAccount"));
const CandidateDataAccount = lazy(() => import("./pages/candidate/account/CandidateDataAccount"));

// Phase 4-6: candidate dashboard suite
const CandidateLogin = lazy(() => import("./pages/candidate/CandidateLogin"));
const CandidateClaimPassword = lazy(() => import("./pages/candidate/ClaimPassword"));
const CandidateForgotPassword = lazy(() => import("./pages/candidate/ForgotPassword"));
const CandidateOAuthSuccess = lazy(() => import("./pages/candidate/OAuthSuccess"));
const CandidateConfirmName = lazy(() => import("./pages/candidate/ConfirmName"));
const CandidateDashboard = lazy(() => import("./pages/candidate/CandidateDashboard"));
const CandidateInterviewDetail = lazy(() => import("./pages/candidate/CandidateInterviewDetail"));
const CandidateResults = lazy(() => import("./pages/candidate/CandidateResults"));
const CandidateProfile = lazy(() => import("./pages/candidate/CandidateProfile"));
const CandidateProfileTag = lazy(() => import("./pages/candidate/CandidateProfileTag"));
const CandidateSettings = lazy(() => import("./pages/candidate/CandidateSettings"));
const CandidateScenario = lazy(() => import("./pages/candidate/CandidateScenario"));
const CandidateArtifact = lazy(() => import("./pages/candidate/CandidateArtifact"));
const CandidatePracticalSubmit = lazy(() => import("./pages/candidate/CandidatePracticalSubmit"));
const CandidateInterviewWorkSample = lazy(() => import("./pages/candidate/CandidateInterviewWorkSample"));
const CandidatePracticalDefense = lazy(() => import("./pages/candidate/CandidatePracticalDefense"));
const CandidateJourney = lazy(() => import("./pages/candidate/CandidateJourney"));
const JourneyBuilder = lazy(() => import("./pages/JourneyBuilder"));
const RolePipeline = lazy(() => import("./pages/RolePipeline"));
const Programs = lazy(() => import("./pages/Programs"));

const LegacyFitmentRedirect = () => {
  const { id } = useParams();
  return <Navigate to={`/interviews/${id}`} replace />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <FlagProvider>
    <ConsentProvider>
    <AuthProvider>
      <CandidateAuthProvider>
      <WorkspaceProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true,
            }}
          >
          <ErrorBoundary>
          <ConsentBanner />
          <CommandPalette />
          <Suspense fallback={<PageSkeleton />}>
          <Routes>
            {/* Marketing landing page (public) */}
            <Route path="/" element={<MarketingLanding />} />
            <Route path="/start" element={<StartChooser />} />
            {/* P1-5: public sample Talent Analysis Graph — the payoff before signup */}
            <Route path="/sample-tag" element={<SampleTag />} />

            {/* Legal — DPDP-required, linked from CandidateRegistration consent */}
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />

            {/* Product landing / Login page (no sidebar) */}
            <Route path="/product-landing" element={<ProductLanding />} />
            <Route path="/login" element={<Navigate to="/product-landing" replace />} />
            <Route path="/signin" element={<Navigate to="/product-landing" replace />} />

            {/* OAuth callback handler for Google login */}
            <Route path="/auth/callback" element={<OAuth2Handler />} />
            <Route path="/oauth/callback" element={<OAuth2Handler />} />

            {/* P7: candidate registration page — now gated by candidate login + identity match */}
            <Route
              path="/register/:token"
              element={
                <InvitationAuthGate endpoint="register">
                  {() => <CandidateRegistration />}
                </InvitationAuthGate>
              }
            />

            {/* R11.1c: expired-invitation candidate-facing error page */}
            <Route path="/interview/:token/expired" element={<InterviewExpiredPage />} />

            {/* P7: candidate portal page — same gating as /register */}
            <Route
              path="/candidate-portal/:token"
              element={
                <InvitationAuthGate endpoint="candidate-portal">
                  {() => <CandidatePortal />}
                </InvitationAuthGate>
              }
            />

            {/* Interview System Routes (public, no auth required) */}
            <Route path="/interview/:interviewId/pre-check" element={<InterviewPreCheckPage />} />
            {/* v2 page only — v1 (InterviewSessionPage) deleted in C2.
                Old /session URLs 404 by design; the only entry-point is
                the pre-check flow, which now routes directly to /session-v2. */}
            <Route path="/interview/:interviewId/session-v2" element={<InterviewSessionV2Page />} />
            <Route path="/interview/:interviewId/complete" element={<InterviewThankYouPage />} />

            {/* Mobile Swipe Review (public, uses OTP verification) */}
            <Route path="/swipe/:interviewId" element={<InterviewSwipeView />} />

            {/* Accept Invitation (public, handles auth redirect) */}
            <Route path="/accept-invitation/:token" element={<AcceptInvitation />} />

            {/* Dashboard and other authenticated routes (with header, sidebar and protection) */}
            {/* Unified IA cutover: redirects to /home before the shell renders when unified_ia is on (Task 4) */}
            <Route path="/dashboard" element={
              <UnifiedRedirect to="/home">
                <ProtectedRoute>
                  <MainLayout>
                    <Dashboard />
                  </MainLayout>
                </ProtectedRoute>
              </UnifiedRedirect>
            } />
            {/* P2-1: workspace-pulse Home (default post-login when role_home is on) */}
            <Route path="/home" element={
              <ProtectedRoute>
                <MainLayout>
                  <Home />
                </MainLayout>
              </ProtectedRoute>
            } />
            {/* P2-2: role-as-home pipeline board (additive; legacy /programs/:id stays) */}
            {/* Unified IA front door: role list index route (Task 3) */}
            <Route path="/roles" element={
              <ProtectedRoute>
                <MainLayout>
                  <Programs />
                </MainLayout>
              </ProtectedRoute>
            } />
            <Route path="/roles/new" element={
              <ProtectedRoute>
                <MainLayout>
                  <OpenRoleFlow />
                </MainLayout>
              </ProtectedRoute>
            } />
            <Route path="/roles/:programId" element={
              <ProtectedRoute>
                <MainLayout>
                  <RoleContainer />
                </MainLayout>
              </ProtectedRoute>
            } />

            {/* P5-2: candidate-360 read-time fan-in. Flag gate is inside Candidate360
                (candidate_360 off -> NotFound, i.e. today's 404 for this URL). */}
            <Route path="/roles/:programId/candidates/:candidateId" element={
              <ProtectedRoute>
                <MainLayout>
                  <Candidate360 />
                </MainLayout>
              </ProtectedRoute>
            } />

            {/* P1 O5: pilot operational dashboard (recruiter-only) */}
            <Route path="/admin/pilot" element={
              <ProtectedRoute>
                <MainLayout>
                  <PilotDashboard />
                </MainLayout>
              </ProtectedRoute>
            } />

            {/* T3: Pool TAG dashboard — aggregate view of a qualified list. */}
            <Route path="/lists/:listId/pool" element={
              <ProtectedRoute>
                <MainLayout>
                  <PoolDashboard />
                </MainLayout>
              </ProtectedRoute>
            } />

            {/* Unified IA cutover: retired create/manage surfaces redirect before the shell renders when unified_ia is on (Task 4) */}
            <Route path="/interviews/create" element={
              <UnifiedRedirect to="/roles/new">
                <ProtectedRoute>
                  <MainLayout>
                    <CreateInterview />
                  </MainLayout>
                </ProtectedRoute>
              </UnifiedRedirect>
            } />

            <Route path="/interviews/manage" element={
              <UnifiedRedirect to="/roles">
                <ProtectedRoute>
                  <MainLayout>
                    <ManageInterviews />
                  </MainLayout>
                </ProtectedRoute>
              </UnifiedRedirect>
            } />

            <Route path="/interviews/fitment" element={
              <UnifiedRedirect to="/roles">
                <ProtectedRoute>
                  <MainLayout>
                    <ManageInterviews />
                  </MainLayout>
                </ProtectedRoute>
              </UnifiedRedirect>
            } />

            <Route path="/interviews/skill-analysis" element={
              <UnifiedRedirect to="/roles">
                <ProtectedRoute>
                  <MainLayout>
                    <ManageInterviews />
                  </MainLayout>
                </ProtectedRoute>
              </UnifiedRedirect>
            } />

            <Route path="/interviews/:id" element={
              <ProtectedRoute>
                <MainLayout>
                  <InterviewDetails />
                </MainLayout>
              </ProtectedRoute>
            } />

            {/* Unified-evaluation practical flow (recruiter). Retired under unified_ia -> /roles (Task 4) */}
            <Route path="/practicals" element={
              <UnifiedRedirect to="/roles">
                <ProtectedRoute>
                  <MainLayout>
                    <Practicals />
                  </MainLayout>
                </ProtectedRoute>
              </UnifiedRedirect>
            } />
            {/* P2-4: with one_builder on, the legacy create surface redirects to open-a-role */}
            <Route path="/journeys/new" element={
              <ProtectedRoute>
                <MainLayout>
                  <OneBuilderRedirect to={() => "/roles/new"}>
                    <JourneyBuilder />
                  </OneBuilderRedirect>
                </MainLayout>
              </ProtectedRoute>
            } />
            {/* Retired under unified_ia -> /roles, folded in with the Task 3 /roles index route (Task 4) */}
            <Route path="/programs" element={
              <UnifiedRedirect to="/roles">
                <ProtectedRoute>
                  <MainLayout>
                    <Programs />
                  </MainLayout>
                </ProtectedRoute>
              </UnifiedRedirect>
            } />

            {/* P2-4: with one_builder on, the legacy pipeline redirects to the new board */}
            <Route path="/programs/:programId" element={
              <ProtectedRoute>
                <MainLayout>
                  <OneBuilderRedirect to={(p) => `/roles/${p.programId}`}>
                    <RolePipeline />
                  </OneBuilderRedirect>
                </MainLayout>
              </ProtectedRoute>
            } />

            <Route path="/interview/:interviewId/results/:sessionId" element={
              <ProtectedRoute>
                <MainLayout>
                  <InterviewResults />
                </MainLayout>
              </ProtectedRoute>
            } />

            {/* C1: video review routes removed; recruiters now click into
                /interview/:interviewId/results/:sessionId for the TAG view. */}

            {/* P0-8: dev/test-only tools. Mounted ONLY in dev builds (import.meta.env.DEV
                is false in production bundles) AND gated behind AdminRoute, so even in a
                dev/preview build a non-admin can't reach them. Paths live under /admin/test/*. */}
            {import.meta.env.DEV && (
              <>
                <Route path="/admin/test/email-templates" element={
                  <AdminRoute><EmailTemplatePreview /></AdminRoute>
                } />
                {/* Test Assets page for 3D model viewing */}
                <Route path="/admin/test/assets" element={
                  <AdminRoute><TestAssets /></AdminRoute>
                } />
              </>
            )}

            <Route path="/interview-blueprint/:interviewId" element={
              <ProtectedRoute>
                <MainLayout>
                  <DynamicBlueprintPage />
                </MainLayout>
              </ProtectedRoute>
            } />

            <Route path="/fitment-interviews/:id" element={<LegacyFitmentRedirect />} />

            {/* P3-1: cross-role Talent index. Route is always mounted (deep links
                resolve); the `talent` flag only gates its surfacing in the nav. */}
            <Route path="/talent" element={
              <ProtectedRoute>
                <MainLayout>
                  <Talent />
                </MainLayout>
              </ProtectedRoute>
            } />

            <Route path="/lists" element={
              <ProtectedRoute>
                <MainLayout>
                  <Lists />
                </MainLayout>
              </ProtectedRoute>
            } />

            {/* Retired under unified_ia -> /talent (Task 4) */}
            <Route path="/skill-matcher" element={
              <UnifiedRedirect to="/talent">
                <ProtectedRoute>
                  <MainLayout>
                    <SkillMatcher />
                  </MainLayout>
                </ProtectedRoute>
              </UnifiedRedirect>
            } />

            <Route path="/lists/:listId" element={
              <ProtectedRoute>
                <MainLayout>
                  <ListDetail />
                </MainLayout>
              </ProtectedRoute>
            } />

            <Route path="/quick-tour" element={
              <ProtectedRoute>
                <MainLayout>
                  <QuickTour />
                </MainLayout>
              </ProtectedRoute>
            } />

            <Route path="/settings" element={
              <ProtectedRoute>
                <MainLayout>
                  <Settings />
                </MainLayout>
              </ProtectedRoute>
            } />

            <Route path="/settings/plan" element={
              <ProtectedRoute>
                <MainLayout>
                  <SettingsPlan />
                </MainLayout>
              </ProtectedRoute>
            } />

            {/* Superadmin — workspace plan + credit assignment */}
            <Route path="/admin/workspaces" element={
              <ProtectedRoute>
                <MainLayout>
                  <AdminWorkspaces />
                </MainLayout>
              </ProtectedRoute>
            } />

            {/* DPDP §11–13 rights surface (workspace) */}
            <Route path="/account/data" element={
              <ProtectedRoute>
                <MainLayout>
                  <DataAccount />
                </MainLayout>
              </ProtectedRoute>
            } />


            {/* Phase 4-6: Candidate dashboard suite (persistent accounts) */}
            <Route path="/candidate/login" element={<CandidateLogin />} />
            <Route path="/candidate/oauth-success" element={<CandidateOAuthSuccess />} />
            <Route path="/candidate/confirm-name" element={<CandidateConfirmName />} />
            <Route path="/claim-password/:token" element={<CandidateClaimPassword />} />
            <Route path="/forgot-password" element={<CandidateForgotPassword />} />
            <Route
              path="/candidate/dashboard"
              element={
                <CandidateProtectedRoute>
                  <CandidateDashboard />
                </CandidateProtectedRoute>
              }
            />
            <Route
              path="/candidate/assessment/:scenarioId"
              element={
                <CandidateProtectedRoute>
                  <CandidateScenario />
                </CandidateProtectedRoute>
              }
            />
            <Route
              path="/candidate/assessment-artifact/:itemId"
              element={
                <CandidateProtectedRoute>
                  <CandidateArtifact />
                </CandidateProtectedRoute>
              }
            />
            {/* Practical flow (candidate). Submit page is token-gated and
                prompts sign-in itself (it must show the public invitation
                first); the defense page requires a candidate session. */}
            <Route
              path="/practical-register/:token"
              element={<CandidatePracticalSubmit />}
            />
            {/* Work sample folded into an interview — candidate already
                invited, so this is candidate-session-guarded (no token). */}
            <Route
              path="/candidate/interview/:interviewId/work-sample"
              element={
                <CandidateProtectedRoute>
                  <CandidateInterviewWorkSample />
                </CandidateProtectedRoute>
              }
            />
            <Route
              path="/candidate/practical-defense/:submissionId"
              element={
                <CandidateProtectedRoute>
                  <CandidatePracticalDefense />
                </CandidateProtectedRoute>
              }
            />
            <Route
              path="/candidate/journeys"
              element={
                <CandidateProtectedRoute>
                  <CandidateJourney />
                </CandidateProtectedRoute>
              }
            />

            <Route
              path="/candidate/interviews/:id"
              element={
                <CandidateProtectedRoute>
                  <CandidateInterviewDetail />
                </CandidateProtectedRoute>
              }
            />
            <Route
              path="/candidate/interviews/:id/results"
              element={
                <CandidateProtectedRoute>
                  <CandidateResults />
                </CandidateProtectedRoute>
              }
            />
            <Route
              path="/candidate/profile"
              element={
                <CandidateProtectedRoute>
                  <CandidateProfile />
                </CandidateProtectedRoute>
              }
            />
            {/* Phase 1.8: Profile TAG page — narrative + journey + skill graph.
                Two entry points:
                  /candidate/profile-tag                       (candidate viewing self)
                  /candidates/:candidateId/profile-tag         (recruiter view) */}
            <Route
              path="/candidate/profile-tag"
              element={
                <CandidateProtectedRoute>
                  <CandidateProfileTag />
                </CandidateProtectedRoute>
              }
            />
            <Route
              path="/candidates/:candidateId/profile-tag"
              element={
                <ProtectedRoute>
                  <CandidateProfileTag />
                </ProtectedRoute>
              }
            />
            <Route
              path="/candidate/settings"
              element={
                <CandidateProtectedRoute>
                  <CandidateSettings />
                </CandidateProtectedRoute>
              }
            />
            {/* DPDP §11–13 rights surface (applicant) */}
            <Route
              path="/candidate/account/data"
              element={
                <CandidateProtectedRoute>
                  <CandidateDataAccount />
                </CandidateProtectedRoute>
              }
            />

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
          </ErrorBoundary>
        </BrowserRouter>
      </TooltipProvider>
      </WorkspaceProvider>
      </CandidateAuthProvider>
    </AuthProvider>
    </ConsentProvider>
    </FlagProvider>
  </QueryClientProvider>
);

export default App;
