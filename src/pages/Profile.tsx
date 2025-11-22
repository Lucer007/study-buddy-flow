import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { BookOpen, Flame } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface Profile {
  username: string;
  display_name: string;
  bio: string;
  photo_url: string;
  total_minutes: number;
}

interface ClassWithProgress {
  id: string;
  name: string;
  progress_percentage: number;
  streak: number;
  last_studied_date: string | null;
}

interface Post {
  id: string;
  photo_url: string;
  timelapse_url?: string;
  minutes_studied: number;
  created_at: string;
}

const Profile = () => {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [classes, setClasses] = useState<ClassWithProgress[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && user) {
      loadProfile();
    }
  }, [user, authLoading]);

  const loadProfile = async () => {
    if (!user) return;
    
    try {
      // Load profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      // Load classes with progress
      const { data: classesData, error: classesError } = await supabase
        .from('classes')
        .select('id, name, progress_percentage, streak, last_studied_date')
        .eq('user_id', user.id)
        .order('progress_percentage', { ascending: false });

      if (classesError) throw classesError;
      setClasses(classesData || []);

      // Load posts
      const { data: postsData, error: postsError } = await supabase
        .from('feed_posts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;
      setPosts(postsData || []);

    } catch (error: any) {
      toast({
        title: "Failed to load profile",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getLastStudiedText = (date: string | null) => {
    if (!date) return 'Never studied';
    const lastDate = new Date(date);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - lastDate.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays} days ago`;
  };

  if (loading || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-spin">
          <BookOpen className="h-12 w-12" />
        </div>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-2xl mx-auto px-5 pt-10 space-y-6">
        
        {/* Header - Profile Info */}
        <div className="flex flex-col items-center space-y-3">
          <div 
            className="w-24 h-24 rounded-full flex items-center justify-center text-4xl font-black overflow-hidden bg-gradient-to-br from-primary to-secondary"
          >
            {profile.photo_url ? (
              <img src={profile.photo_url} alt={profile.display_name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-primary-foreground">{profile.display_name[0]}</span>
            )}
          </div>
          <h1 className="text-2xl font-bold">{profile.display_name}</h1>
          <button 
            className="px-6 py-2 rounded-full bg-muted hover:bg-muted/80 font-medium text-sm"
          >
            Share Profile
          </button>
        </div>

        {/* Current Classes Overview */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold flex items-center gap-2">
            📚 Current Classes
          </h2>
          
          {classes.length === 0 ? (
            <div className="text-center py-12 bg-muted/50 rounded-2xl">
              <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium mb-1">No classes yet</p>
              <p className="text-sm text-muted-foreground">Add your first class to get started</p>
            </div>
          ) : (
            classes.map((cls) => (
              <div 
                key={cls.id}
                onClick={() => navigate(`/class/${cls.id}`)}
                className="bg-card border border-border rounded-2xl p-5 hover-scale cursor-pointer space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-bold text-base mb-1">{cls.name}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>Last studied: {getLastStudiedText(cls.last_studied_date)}</span>
                    </div>
                  </div>
                  {cls.streak > 0 && (
                    <div className="flex items-center gap-1 bg-gradient-to-r from-orange-500/20 to-red-500/20 px-3 py-1.5 rounded-full">
                      <Flame className="w-4 h-4 text-orange-500" />
                      <span className="font-bold text-sm">{cls.streak}</span>
                    </div>
                  )}
                </div>
                
                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Progress through study plan</span>
                    <span className="font-bold">{cls.progress_percentage}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-500"
                      style={{ width: `${cls.progress_percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Study Stats */}
        <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
          <h3 className="font-bold">📊 Total Stats</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold">{Math.floor(profile.total_minutes / 60)}</div>
              <div className="text-xs text-muted-foreground">Hours</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{classes.length}</div>
              <div className="text-xs text-muted-foreground">Classes</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{posts.length}</div>
              <div className="text-xs text-muted-foreground">Posts</div>
            </div>
          </div>
        </div>

        {/* Media Grid */}
        <div className="space-y-3">
          <h3 className="font-bold">📸 StudyGrams</h3>
          {posts.length === 0 ? (
            <div className="text-center py-12 bg-muted/50 rounded-2xl">
              <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium mb-1">No posts yet</p>
              <p className="text-sm text-muted-foreground">Complete a study session to share!</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {posts.map((post) => (
                <div
                  key={post.id}
                  className="aspect-square rounded-xl overflow-hidden hover-scale cursor-pointer relative bg-muted"
                >
                  {post.timelapse_url ? (
                    <video src={post.timelapse_url} className="w-full h-full object-cover" />
                  ) : post.photo_url ? (
                    <img src={post.photo_url} alt="Study session" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary to-secondary">
                      <BookOpen className="h-8 w-8 text-primary-foreground" />
                    </div>
                  )}
                  <div className="absolute bottom-2 right-2 bg-background/80 backdrop-blur-sm rounded-lg px-2 py-1 text-xs font-bold">
                    {Math.floor(post.minutes_studied)}m
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
