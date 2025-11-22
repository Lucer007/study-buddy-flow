import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const ReviewPost = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isPosting, setIsPosting] = useState(false);
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [duration, setDuration] = useState('45');
  
  const frontPhoto = searchParams.get('front');
  const backPhoto = searchParams.get('back');

  useEffect(() => {
    loadClasses();
  }, []);

  const loadClasses = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('classes')
      .select('*')
      .eq('user_id', user.id);
    
    if (data && data.length > 0) {
      setClasses(data);
      setSelectedClass(data[0].id);
    }
  };

  const handlePost = async () => {
    if (!user || !selectedClass) {
      toast({
        title: "Missing information",
        description: "Please select a class",
        variant: "destructive",
      });
      return;
    }

    setIsPosting(true);
    try {
      const now = new Date().toISOString();
      const startedAt = new Date(Date.now() - parseInt(duration) * 60000).toISOString();

      // Create study session
      const { data: session, error: sessionError } = await supabase
        .from('study_sessions')
        .insert({
          user_id: user.id,
          class_id: selectedClass,
          minutes_studied: parseInt(duration),
          started_at: startedAt,
          completed_at: now,
          photo_url: backPhoto,
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      // Create feed post
      const { error: postError } = await supabase
        .from('feed_posts')
        .insert({
          user_id: user.id,
          session_id: session.id,
          class_id: selectedClass,
          photo_url: backPhoto || '',
          minutes_studied: parseInt(duration),
          caption: 'Locked in! 🔥',
        });

      if (postError) throw postError;

      // Update class streak
      await supabase.rpc('update_class_streak', {
        p_class_id: selectedClass,
        p_user_id: user.id,
        p_minutes: parseInt(duration),
      });

      toast({
        title: "Posted! 🎉",
        description: "Your StudyGram is live on the feed",
      });

      navigate('/dashboard');
    } catch (error: any) {
      console.error('Post error:', error);
      toast({
        title: "Failed to post",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsPosting(false);
    }
  };

  if (!frontPhoto || !backPhoto) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-muted-foreground">No photos found. Please capture again.</p>
          <Button onClick={() => navigate('/nudge-camera')} className="mt-4">
            Take Photos
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-3 p-4">
          <button
            onClick={() => navigate(-1)}
            className="hover-scale"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">Lock-in check 📸</h1>
        </div>
      </div>

      <div className="p-5 space-y-6 pb-32">
        {/* Photo Preview - BeReal Style */}
        <div className="relative w-full aspect-[3/4] rounded-3xl overflow-hidden bg-muted">
          <img 
            src={backPhoto} 
            alt="Study setup" 
            className="w-full h-full object-cover"
          />
          
          {/* Front photo bubble */}
          <div 
            className="absolute top-4 left-4 w-24 h-32 rounded-2xl overflow-hidden border-4 border-white shadow-2xl"
          >
            <img 
              src={frontPhoto} 
              alt="Selfie" 
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        <p className="text-sm text-muted-foreground text-center">
          This is your StudyGram for this session. Happy with it?
        </p>

        {/* Class Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Class</label>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="w-full h-12 px-4 rounded-xl bg-muted border border-border"
          >
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name}
              </option>
            ))}
          </select>
        </div>

        {/* Duration */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Duration (minutes)</label>
          <input
            type="number"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className="w-full h-12 px-4 rounded-xl bg-muted border border-border"
            min="1"
            max="240"
          />
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 p-5 bg-background border-t border-border space-y-3">
        <Button
          onClick={() => navigate('/nudge-camera')}
          variant="outline"
          className="w-full h-14"
        >
          Retake
        </Button>
        <Button
          onClick={handlePost}
          disabled={isPosting || !selectedClass}
          className="w-full h-14 bg-gradient-to-r from-[#FAD961] to-[#F76B1C] hover:opacity-90 text-white font-semibold"
        >
          {isPosting ? 'Posting...' : 'Post StudyGram →'}
        </Button>
      </div>
    </div>
  );
};

export default ReviewPost;
