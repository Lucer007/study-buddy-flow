import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import Confetti from 'react-confetti';
import { useWindowSize } from '@/hooks/use-window-size';

const SessionComplete = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const { width, height } = useWindowSize();
  const { toast } = useToast();
  
  const [showConfetti, setShowConfetti] = useState(true);
  const [visibility, setVisibility] = useState<'buddies' | 'everyone' | 'only_me'>('buddies');
  const [streak, setStreak] = useState(0);
  
  const duration = parseInt(searchParams.get('duration') || '45');
  const className = searchParams.get('class') || 'Study Session';
  const assignment = searchParams.get('assignment') || '';
  const photo = searchParams.get('photo') || '';

  useEffect(() => {
    updateStreakAndStats();
    setTimeout(() => setShowConfetti(false), 5000);
  }, []);

  const updateStreakAndStats = async () => {
    if (!user) return;

    try {
      // Call the streak update function
      const { error: streakError } = await supabase.rpc('update_user_streak', {
        p_user_id: user.id,
        p_minutes: duration
      });

      if (streakError) throw streakError;

      // Get updated profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('streak')
        .eq('user_id', user.id)
        .single();

      if (profileData) {
        setStreak(profileData.streak || 0);
      }
    } catch (error: any) {
      console.error('Error updating streak:', error);
    }
  };

  const handleShare = async () => {
    if (!user) return;

    try {
      // Create study session record
      const { data: sessionData, error: sessionError } = await supabase
        .from('study_sessions')
        .insert({
          user_id: user.id,
          minutes_studied: duration,
          started_at: new Date(Date.now() - duration * 60 * 1000).toISOString(),
          completed_at: new Date().toISOString(),
          photo_url: photo || null,
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      // Create feed post if not "only_me"
      if (visibility !== 'only_me' && sessionData) {
        const { error: postError } = await supabase
          .from('feed_posts')
          .insert({
            user_id: user.id,
            session_id: sessionData.id,
            photo_url: photo || 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800',
            minutes_studied: duration,
          });

        if (postError) throw postError;
      }

      toast({
        title: "Session saved! 🎉",
        description: visibility === 'only_me' ? "Kept private as requested" : "Shared with your study buddies",
      });

      navigate('/dashboard');
    } catch (error: any) {
      toast({
        title: "Failed to save session",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSkip = () => {
    navigate('/dashboard');
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {showConfetti && <Confetti width={width} height={height} recycle={false} numberOfPieces={500} />}
      
      <div className="flex-1 flex flex-col items-center justify-center px-5 space-y-8">
        
        {/* Celebration */}
        <div className="text-center space-y-3">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-white text-3xl font-bold">Nice work, {user?.email?.split('@')[0]}!</h1>
          <p className="text-white text-lg">You just studied for {duration} minutes</p>
        </div>

        {/* Session Card */}
        <div 
          className="w-full max-w-md rounded-3xl overflow-hidden"
          style={{ background: '#141414' }}
        >
          {/* Photo Preview */}
          <div className="relative h-64 bg-[#0A0A0A]">
            {photo ? (
              <img src={photo} alt="Study session" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-6xl">📚</div>
              </div>
            )}
            
            {/* Selfie bubble */}
            <div 
              className="absolute top-4 left-4 w-16 h-20 rounded-2xl overflow-hidden border-2 border-white"
              style={{ background: '#1C1C1C' }}
            >
              <div className="w-full h-full flex items-center justify-center text-2xl">
                😊
              </div>
            </div>

            {/* Time badge */}
            <div 
              className="absolute bottom-4 right-4 rounded-full px-4 py-2"
              style={{ background: 'rgba(0,0,0,0.7)' }}
            >
              <span className="text-white font-semibold text-sm">{duration}m</span>
            </div>
          </div>

          {/* Info */}
          <div className="p-6 space-y-4">
            <div>
              <div className="text-white font-semibold text-lg">{className}</div>
              {assignment && (
                <div className="text-[#888888] text-sm">{assignment}</div>
              )}
            </div>

            <div 
              className="flex items-center gap-2 px-4 py-3 rounded-2xl"
              style={{
                background: 'linear-gradient(135deg, rgba(249, 185, 74, 0.1) 0%, rgba(247, 107, 28, 0.1) 100%)'
              }}
            >
              <span className="text-2xl">🔥</span>
              <div>
                <div className="text-white font-semibold">Streak: {streak} days</div>
                <div className="text-[#888888] text-xs">Keep it going!</div>
              </div>
            </div>
          </div>
        </div>

        {/* Visibility Options */}
        <div className="w-full max-w-md space-y-3">
          <label className="text-white text-sm font-medium">Who can see this Nudge?</label>
          <div className="flex gap-2">
            <button
              onClick={() => setVisibility('buddies')}
              className={`flex-1 py-3 rounded-full text-sm font-medium transition-all ${
                visibility === 'buddies'
                  ? 'text-white'
                  : 'bg-[#1C1C1C] text-[#888888]'
              }`}
              style={visibility === 'buddies' ? {
                background: 'linear-gradient(135deg, #FAD961 0%, #F76B1C 100%)'
              } : {}}
            >
              Study Buddies
            </button>
            <button
              onClick={() => setVisibility('everyone')}
              className={`flex-1 py-3 rounded-full text-sm font-medium transition-all ${
                visibility === 'everyone'
                  ? 'text-white'
                  : 'bg-[#1C1C1C] text-[#888888]'
              }`}
              style={visibility === 'everyone' ? {
                background: 'linear-gradient(135deg, #FAD961 0%, #F76B1C 100%)'
              } : {}}
            >
              Everyone
            </button>
            <button
              onClick={() => setVisibility('only_me')}
              className={`flex-1 py-3 rounded-full text-sm font-medium transition-all ${
                visibility === 'only_me'
                  ? 'text-white'
                  : 'bg-[#1C1C1C] text-[#888888]'
              }`}
              style={visibility === 'only_me' ? {
                background: 'linear-gradient(135deg, #FAD961 0%, #F76B1C 100%)'
              } : {}}
            >
              Only Me
            </button>
          </div>
        </div>

      </div>

      {/* Bottom Actions */}
      <div className="p-5 space-y-3 pb-safe">
        <button
          onClick={handleShare}
          className="w-full h-14 rounded-[28px] text-white font-semibold text-base hover-scale"
          style={{
            background: 'linear-gradient(135deg, #FAD961 0%, #F76B1C 100%)',
            boxShadow: '0 8px 24px rgba(247, 107, 28, 0.4)'
          }}
        >
          Share Nudge
        </button>
        
        <button
          onClick={handleSkip}
          className="w-full text-[#888888] text-sm hover:text-white transition-colors"
        >
          Skip sharing for now
        </button>
      </div>
    </div>
  );
};

export default SessionComplete;
