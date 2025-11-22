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
            <Route path="/" element={<Splash />} />
            <Route path="/account-setup" element={<AccountSetup />} />
            <Route path="/weekday-time" element={<WeekdayStudyTime />} />
            <Route path="/weekend-time" element={<WeekendStudyTime />} />
            <Route path="/add-classes" element={<AddClasses />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/class/:classId" element={<ClassDetail />} />
            <Route path="/ai-processing/:classId" element={<AIProcessing />} />
            <Route path="/assignment-summary/:classId" element={<AssignmentSummary />} />
            <Route path="/study-plan/:classId" element={<StudyPlan />} />
            <Route path="/home" element={<Home />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/feed" element={<Feed />} />
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
