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
import { ConsentBanner } from "@/components/ConsentBanner";
import { CommandPalette } from "@/components/CommandPalette";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import CandidateProtectedRoute from "@/components/auth/CandidateProtectedRoute";
import TourGuard from "@/components/tour/TourGuard";
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
const PilotDashboard = lazy(() => import("./pages/PilotDashboard"));
const PoolDashboard = lazy(() => import("./pages/PoolDashboard"));
const CreateInterview = lazy(() => import("./pages/CreateInterview"));
const ManageInterviews = lazy(() => import("./pages/ManageInterviewsEnhanced"));
const InterviewDetails = lazy(() => import("./pages/InterviewDetails"));
const FitmentInterviews = lazy(() => import("./pages/FitmentInterviews"));
const Lists = lazy(() => import("./pages/Lists"));
const ListDetail = lazy(() => import("./pages/ListDetail"));
const QuickTour = lazy(() => import("./pages/QuickTour"));
const Settings = lazy(() => import("./pages/Settings"));
const CandidateRegistration = lazy(() => import("./pages/CandidateRegistration"));
const CandidatePortal = lazy(() => import("./pages/CandidatePortal"));
const InterviewPreCheckPage = lazy(() => import("./pages/interview/InterviewPreCheckPage"));
const InterviewSessionPage = lazy(() => import("./pages/interview/InterviewSessionPage"));
const InterviewThankYouPage = lazy(() => import("./pages/interview/InterviewThankYouPage"));
const InterviewResults = lazy(() => import("./pages/InterviewResults"));
const DynamicBlueprintPage = lazy(() => import("./pages/DynamicBlueprintPage"));
const EmailTemplatePreview = lazy(() => import("./pages/EmailTemplatePreview"));
const InterviewSwipeView = lazy(() => import("./pages/InterviewSwipeView"));
const AcceptInvitation = lazy(() => import("./pages/AcceptInvitation"));
const TestAssets = lazy(() => import("./pages/TestAssets"));
const PrivacyPolicy = lazy(() => import("./pages/legal/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/legal/TermsOfService"));
const DataAccount = lazy(() => import("./pages/account/DataAccount"));
const CandidateDataAccount = lazy(() => import("./pages/candidate/account/CandidateDataAccount"));

// Phase 4-6: candidate dashboard suite
const CandidateLogin = lazy(() => import("./pages/candidate/CandidateLogin"));
const CandidateClaimPassword = lazy(() => import("./pages/candidate/ClaimPassword"));
const CandidateForgotPassword = lazy(() => import("./pages/candidate/ForgotPassword"));
const CandidateOAuthSuccess = lazy(() => import("./pages/candidate/OAuthSuccess"));
const CandidateDashboard = lazy(() => import("./pages/candidate/CandidateDashboard"));
const CandidateInterviewDetail = lazy(() => import("./pages/candidate/CandidateInterviewDetail"));
const CandidateResults = lazy(() => import("./pages/candidate/CandidateResults"));
const CandidateProfile = lazy(() => import("./pages/candidate/CandidateProfile"));
const CandidateSettings = lazy(() => import("./pages/candidate/CandidateSettings"));

const LegacyFitmentRedirect = () => {
  const { id } = useParams();
  return <Navigate to={`/interviews/${id}`} replace />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ConsentProvider>
    <AuthProvider>
      <CandidateAuthProvider>
      <WorkspaceProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
          <ErrorBoundary>
          <ConsentBanner />
          <CommandPalette />
          <Suspense fallback={<PageSkeleton />}>
          <Routes>
            {/* Marketing landing page (public) */}
            <Route path="/" element={<MarketingLanding />} />
            <Route path="/start" element={<StartChooser />} />

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

            {/* Candidate registration page (public, no auth required) */}
            <Route path="/register/:token" element={<CandidateRegistration />} />

            {/* Candidate portal page (public, no auth required) */}
            <Route path="/candidate-portal/:token" element={<CandidatePortal />} />

            {/* Interview System Routes (public, no auth required) */}
            <Route path="/interview/:interviewId/pre-check" element={<InterviewPreCheckPage />} />
            <Route path="/interview/:interviewId/session" element={<InterviewSessionPage />} />
            <Route path="/interview/:interviewId/complete" element={<InterviewThankYouPage />} />

            {/* Mobile Swipe Review (public, uses OTP verification) */}
            <Route path="/swipe/:interviewId" element={<InterviewSwipeView />} />

            {/* Accept Invitation (public, handles auth redirect) */}
            <Route path="/accept-invitation/:token" element={<AcceptInvitation />} />

            {/* Dashboard and other authenticated routes (with header, sidebar and protection) */}
            <Route path="/dashboard" element={
              <TourGuard>
                <MainLayout>
                  <Dashboard />
                </MainLayout>
              </TourGuard>
            } />

            {/* P1 O5: pilot operational dashboard (recruiter-only) */}
            <Route path="/admin/pilot" element={
              <TourGuard>
                <MainLayout>
                  <PilotDashboard />
                </MainLayout>
              </TourGuard>
            } />

            {/* T3: Pool TAG dashboard — aggregate view of a qualified list. */}
            <Route path="/lists/:listId/pool" element={
              <TourGuard>
                <MainLayout>
                  <PoolDashboard />
                </MainLayout>
              </TourGuard>
            } />

            <Route path="/interviews/create" element={
              <TourGuard>
                <MainLayout>
                  <CreateInterview />
                </MainLayout>
              </TourGuard>
            } />

            <Route path="/interviews/manage" element={
              <TourGuard>
                <MainLayout>
                  <ManageInterviews />
                </MainLayout>
              </TourGuard>
            } />

            <Route path="/interviews/fitment" element={
              <TourGuard>
                <MainLayout>
                  <ManageInterviews />
                </MainLayout>
              </TourGuard>
            } />

            <Route path="/interviews/:id" element={
              <TourGuard>
                <MainLayout>
                  <InterviewDetails />
                </MainLayout>
              </TourGuard>
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

            <Route path="/email-templates/prelims" element={<EmailTemplatePreview />} />

            {/* Test Assets page for 3D model viewing */}
            <Route path="/test-assets" element={<TestAssets />} />

            <Route path="/interview-blueprint/:interviewId" element={
              <ProtectedRoute>
                <MainLayout>
                  <DynamicBlueprintPage />
                </MainLayout>
              </ProtectedRoute>
            } />

            <Route path="/interviews/fitment" element={
              <ProtectedRoute>
                <MainLayout>
                  <FitmentInterviews />
                </MainLayout>
              </ProtectedRoute>
            } />

            <Route path="/fitment-interviews/:id" element={<LegacyFitmentRedirect />} />

            <Route path="/lists" element={
              <TourGuard>
                <MainLayout>
                  <Lists />
                </MainLayout>
              </TourGuard>
            } />

            <Route path="/lists/:listId" element={
              <TourGuard>
                <MainLayout>
                  <ListDetail />
                </MainLayout>
              </TourGuard>
            } />

            <Route path="/quick-tour" element={
              <TourGuard>
                <MainLayout>
                  <QuickTour />
                </MainLayout>
              </TourGuard>
            } />

            <Route path="/settings" element={
              <ProtectedRoute>
                <MainLayout>
                  <Settings />
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
  </QueryClientProvider>
);

export default App;
