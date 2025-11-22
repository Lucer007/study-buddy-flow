import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Bot, AlertCircle } from 'lucide-react';
import AITutorModal from '@/components/AITutorModal';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const LockMode = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [timeRemaining, setTimeRemaining] = useState(parseInt(searchParams.get('duration') || '45') * 60); // in seconds
  const [showAITutor, setShowAITutor] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const className = searchParams.get('class') || 'Study Session';
  const assignment = searchParams.get('assignment') || '';
  const photo = searchParams.get('photo') || '';

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          // Navigate to session complete
          navigate(`/session-complete?duration=${searchParams.get('duration')}&class=${className}&assignment=${assignment}&photo=${photo}`);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Prevent navigation away
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEndEarly = () => {
    setShowExitDialog(true);
  };

  const confirmEndEarly = () => {
    // TODO: Save session as ended_early, no streak increment
    navigate('/dashboard');
  };

  // Block back navigation
  useEffect(() => {
    const handlePopState = () => {
      setShowExitDialog(true);
      window.history.pushState(null, '', window.location.pathname);
    };

    window.history.pushState(null, '', window.location.pathname);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-between p-8">
      
      {/* Top - Timer */}
      <div className="text-center pt-12 space-y-2">
        <div className="text-white text-7xl font-bold tracking-tight">
          {formatTime(timeRemaining)}
        </div>
        <div className="text-[#888888] text-lg">
          Locked in for {className}
          {assignment && ` – ${assignment}`}
        </div>
      </div>

      {/* Center - Nudge Photo Card */}
      <div className="flex flex-col items-center space-y-6">
        <div 
          className="w-64 h-80 rounded-3xl overflow-hidden relative"
          style={{
            background: '#141414',
            boxShadow: '0 20px 60px rgba(161, 108, 255, 0.2)'
          }}
        >
          {photo ? (
            <img src={photo} alt="Study moment" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-6xl">📚</div>
            </div>
          )}
          
          {/* Selfie bubble overlay */}
          <div 
            className="absolute top-4 left-4 w-20 h-24 rounded-2xl overflow-hidden border-2 border-white"
            style={{ background: '#1C1C1C' }}
          >
            <div className="w-full h-full flex items-center justify-center text-3xl">
              😊
            </div>
          </div>
        </div>

        {/* Timelapse indicator */}
        <div className="flex items-center gap-2 text-[#888888] text-sm">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span>Timelapse recording...</span>
        </div>
      </div>

      {/* Bottom - Actions */}
      <div className="w-full max-w-md space-y-4">
        <button
          onClick={() => setShowAITutor(true)}
          className="w-full h-14 rounded-[28px] flex items-center justify-center gap-3 text-white font-semibold text-base hover-scale"
          style={{
            background: 'linear-gradient(135deg, #A16CFF 0%, #FF6F9C 100%)',
            boxShadow: '0 8px 24px rgba(161, 108, 255, 0.4)'
          }}
        >
          <Bot className="w-5 h-5" />
          AI Tutor
        </button>

        <button
          onClick={handleEndEarly}
          className="text-[#888888] text-sm hover:text-white transition-colors"
        >
          End session early
        </button>

        <p className="text-[#666666] text-xs text-center">
          Leaving early breaks today's streak 😌
        </p>
      </div>

      {/* AI Tutor Modal */}
      <AITutorModal
        isOpen={showAITutor}
        onClose={() => setShowAITutor(false)}
        className={className}
        assignmentTitle={assignment}
      />

      {/* Exit Confirmation Dialog */}
      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent className="bg-[#0A0A0A] border border-[#1C1C1C]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-500" />
              Stay locked in to keep your streak 🔥
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[#888888]">
              Ending your session early will break your daily streak. Are you sure you want to stop now?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-[#1C1C1C] text-white border-none hover:bg-[#2A2A2A]">
              Keep studying
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmEndEarly}
              className="bg-red-500 text-white hover:bg-red-600"
            >
              End & break streak
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default LockMode;
