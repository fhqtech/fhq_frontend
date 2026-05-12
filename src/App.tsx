import { Toaster } from "@/components/ui/toaster";

import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { AuthProvider } from "@/contexts/AuthContext";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import TourGuard from "@/components/tour/TourGuard";
import MarketingLanding from "./pages/MarketingLanding";
import ProductLanding from "./pages/ProductLanding";
import Dashboard from "./pages/Dashboard";
import PilotDashboard from "./pages/PilotDashboard";
import PoolDashboard from "./pages/PoolDashboard";
import CreateInterview from "./pages/CreateInterview";
import ManageInterviews from "./pages/ManageInterviewsEnhanced";
import InterviewDetails from "./pages/InterviewDetails";
import FitmentInterviews from "./pages/FitmentInterviews";
import FitmentInterviewDetails from "./pages/FitmentInterviewDetails";
import Lists from "./pages/Lists";
import ListDetail from "./pages/ListDetail";
import QuickTour from "./pages/QuickTour";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import OAuth2Handler from "./components/auth/OAuth2Handler";
import CandidateRegistration from "./pages/CandidateRegistration";
import CandidatePortal from "./pages/CandidatePortal";
// Interview System Pages
import InterviewPreCheckPage from "./pages/interview/InterviewPreCheckPage";
import InterviewSessionPage from "./pages/interview/InterviewSessionPage";
import InterviewThankYouPage from "./pages/interview/InterviewThankYouPage";
import InterviewResults from "./pages/InterviewResults";
import DynamicBlueprintPage from "./pages/DynamicBlueprintPage";
// C1: VideoTestPage + VideoPlayerFullPage removed (audio-only product since S1).
import EmailTemplatePreview from "./pages/EmailTemplatePreview";
import InterviewSwipeView from "./pages/InterviewSwipeView";
import AcceptInvitation from "./pages/AcceptInvitation";
import TestAssets from "./pages/TestAssets";
import HowItWorks from "./pages/HowItWorks";
import { ErrorBoundary } from "./components/ErrorBoundary";

const queryClient = new QueryClient();

// Environment variables loaded - logging removed for security
const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <WorkspaceProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
          <ErrorBoundary>
          <Routes>
            {/* Marketing landing page (public) */}
            <Route path="/" element={<MarketingLanding />} />

            {/* How It Works page (public) */}
            <Route path="/how-it-works" element={<HowItWorks />} />

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

            <Route path="/fitment-interviews/:id" element={
              <ProtectedRoute>
                <MainLayout>
                  <FitmentInterviewDetails />
                </MainLayout>
              </ProtectedRoute>
            } />

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


            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </ErrorBoundary>
        </BrowserRouter>
      </TooltipProvider>
      </WorkspaceProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
