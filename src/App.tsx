import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { OnboardingProvider } from "./contexts/OnboardingContext";
import { AuthProvider } from "./contexts/AuthContext";
import Splash from "./pages/Splash";
import AccountSetup from "./pages/AccountSetup";
import WeekdayStudyTime from "./pages/WeekdayStudyTime";
import WeekendStudyTime from "./pages/WeekendStudyTime";
import AddClasses from "./pages/AddClasses";
import Dashboard from "./pages/Dashboard";
import ClassDetail from "./pages/ClassDetail";
import AIProcessing from "./pages/AIProcessing";
import AssignmentSummary from "./pages/AssignmentSummary";
import StudyPlan from "./pages/StudyPlan";
import Home from "./pages/Home";
import Calendar from "./pages/Calendar";
import Profile from "./pages/Profile";
import Leaderboard from "./pages/Leaderboard";
import Feed from "./pages/Feed";
import NudgeCamera from "./pages/NudgeCamera";
import SessionSetup from "./pages/SessionSetup";
import LockMode from "./pages/LockMode";
import SessionComplete from "./pages/SessionComplete";
import ReviewPost from "./pages/ReviewPost";
import Buddies from "./pages/Buddies";
import Chat from "./pages/Chat";
import Layout from "./components/Layout";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <OnboardingProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
          <Routes>
            {/* Onboarding - No Nav */}
            <Route path="/" element={<Splash />} />
            <Route path="/account-setup" element={<AccountSetup />} />
            <Route path="/weekday-time" element={<WeekdayStudyTime />} />
            <Route path="/weekend-time" element={<WeekendStudyTime />} />
            <Route path="/add-classes" element={<AddClasses />} />
            
            {/* Class Management - No Nav */}
            <Route path="/class/:classId" element={<ClassDetail />} />
            <Route path="/ai-processing/:classId" element={<AIProcessing />} />
            <Route path="/assignment-summary/:classId" element={<AssignmentSummary />} />
            <Route path="/study-plan/:classId" element={<StudyPlan />} />
            
            {/* Camera & Lock Mode - No Nav */}
            <Route path="/nudge-camera" element={<NudgeCamera />} />
            <Route path="/review-post" element={<ReviewPost />} />
            <Route path="/session-setup" element={<SessionSetup />} />
            <Route path="/lock-mode" element={<LockMode />} />
            <Route path="/session-complete" element={<SessionComplete />} />
            
            {/* Main App - With Bottom Nav */}
            <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
            <Route path="/buddies" element={<Layout><Buddies /></Layout>} />
            <Route path="/chat" element={<Layout><Chat /></Layout>} />
            <Route path="/profile" element={<Layout><Profile /></Layout>} />
            
            {/* Other - With Nav */}
            <Route path="/home" element={<Layout><Home /></Layout>} />
            <Route path="/calendar" element={<Layout><Calendar /></Layout>} />
            <Route path="/leaderboard" element={<Layout><Leaderboard /></Layout>} />
            <Route path="/feed" element={<Layout><Feed /></Layout>} />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </OnboardingProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
