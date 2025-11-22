import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Share2, Sparkles, BookOpen, Flame, Clock, Users, UserPlus, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

interface Profile {
  user_id: string;
  username: string;
  display_name: string;
  photo_url?: string;
  streak: number;
  total_minutes: number;
  bio?: string;
}

interface ClassWithProgress {
  id: string;
  name: string;
  title?: string;
  progress_percentage: number;
  streak: number;
  last_studied_date?: string;
  estimated_remaining_minutes: number;
  difficulty?: string;
}

interface Post {
  id: string;
  photo_url?: string;
  front_photo_url?: string;
  back_photo_url?: string;
  timelapse_url?: string;
  created_at: string;
  minutes_studied: number;
  class_id?: string;
}

const Profile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [classes, setClasses] = useState<ClassWithProgress[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;

    try {
      // Load profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      setProfile(profileData);

      // Load classes
      const { data: classesData } = await supabase
        .from('classes')
        .select('*')
        .eq('user_id', user.id)
        .order('progress_percentage', { ascending: false });

      setClasses(classesData || []);

      // Load posts
      const { data: postsData } = await supabase
        .from('feed_posts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(12);

      setPosts(postsData || []);

      // Load followers/following counts
      const { data: followersData } = await supabase
        .from('friendships')
        .select('id')
        .eq('friend_id', user.id);

      const { data: followingData } = await supabase
        .from('friendships')
        .select('id')
        .eq('user_id', user.id);

      setFollowersCount(followersData?.length || 0);
      setFollowingCount(followingData?.length || 0);

      setLoading(false);
    } catch (error) {
      console.error('Error loading profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to load profile',
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  const getLastStudiedText = (date?: string) => {
    if (!date) return 'Not studied yet';
    
    const lastDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    lastDate.setHours(0, 0, 0, 0);
    
    const diffTime = today.getTime() - lastDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays} days ago`;
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return `${Math.floor(diffDays / 7)}w`;
  };

  const totalHours = Math.floor((profile?.total_minutes || 0) / 60);

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-24 px-4">
        <div className="max-w-2xl mx-auto pt-8 space-y-6">
          <Skeleton className="h-48 w-full rounded-3xl" />
          <Skeleton className="h-32 w-full rounded-3xl" />
          <Skeleton className="h-64 w-full rounded-3xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-2xl mx-auto px-4 pt-8 space-y-6 animate-fade-in">
        
        {/* Profile Header */}
        <div className="bg-card rounded-3xl p-6 glow-primary border border-border">
          <div className="flex flex-col items-center text-center space-y-4">
            <Avatar className="w-24 h-24 border-4 border-primary glow-primary">
              <AvatarImage src={profile?.photo_url || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150'} />
              <AvatarFallback className="bg-gradient-primary text-2xl">
                {profile?.display_name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            
            <div>
              <h1 className="text-2xl font-bold text-foreground">{profile?.display_name || 'Student'}</h1>
              <p className="text-muted-foreground">@{profile?.username || 'student'}</p>
            </div>

            <div className="inline-flex items-center gap-2 px-4 py-1 bg-gradient-primary rounded-full text-xs font-medium text-white">
              🎓 College Student
            </div>

            {/* Social Stats */}
            <div className="flex gap-6 w-full justify-center py-4">
              <button 
                onClick={() => navigate('/buddies')}
                className="flex flex-col items-center hover-scale"
              >
                <span className="text-2xl font-bold text-gradient-primary">{followersCount}</span>
                <span className="text-xs text-muted-foreground">Followers</span>
              </button>
              
              <button 
                onClick={() => navigate('/buddies')}
                className="flex flex-col items-center hover-scale"
              >
                <span className="text-2xl font-bold text-gradient-secondary">{followingCount}</span>
                <span className="text-xs text-muted-foreground">Following</span>
              </button>
              
              <div className="flex flex-col items-center">
                <span className="text-2xl font-bold text-gradient-accent">{totalHours}h</span>
                <span className="text-xs text-muted-foreground">Studied</span>
              </div>
            </div>

            <Button 
              className="w-full bg-gradient-primary hover:opacity-90 text-white font-medium"
              onClick={() => {
                navigator.share?.({
                  title: 'My Nudge Profile',
                  text: `Check out my study profile on Nudge! I've studied ${totalHours} hours 📚`,
                  url: window.location.href,
                }).catch(() => {
                  toast({
                    title: 'Link copied!',
                    description: 'Profile link copied to clipboard',
                  });
                });
              }}
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share Profile
            </Button>
          </div>
        </div>

        {/* My Classes */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2 px-2">
            📚 My Classes
          </h2>
          
          {classes.length === 0 ? (
            <div className="bg-card rounded-3xl p-8 text-center border border-border">
              <BookOpen className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground mb-4">No classes yet</p>
              <Button onClick={() => navigate('/add-classes')} className="bg-gradient-primary text-white">
                Add Your First Class
              </Button>
            </div>
          ) : (
            classes.map((cls) => (
              <div 
                key={cls.id} 
                className="bg-card rounded-3xl p-5 border border-border hover-scale cursor-pointer"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="font-bold text-foreground">{cls.name}</h3>
                    {cls.title && (
                      <p className="text-sm text-muted-foreground">{cls.title}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 bg-gradient-primary px-3 py-1 rounded-full text-xs font-medium text-white">
                    🔥 {cls.streak}-day
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-bold text-neon-teal">{cls.progress_percentage}%</span>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-progress transition-all duration-500"
                      style={{ width: `${cls.progress_percentage}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Last studied: {getLastStudiedText(cls.last_studied_date)}
                  </span>
                </div>

                <div className="flex gap-2 mt-4">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => navigate(`/class/${cls.id}`)}
                  >
                    View Class
                  </Button>
                  <Button 
                    size="sm" 
                    className="flex-1 bg-gradient-neon text-white hover:opacity-90"
                    onClick={() => navigate(`/gemini-study-plan?classId=${cls.id}`)}
                  >
                    <Sparkles className="w-4 h-4 mr-1" />
                    Ask Gemini
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Gemini Integration Section */}
        <div className="bg-card rounded-3xl p-6 border-2 border-neon-cyan glow-secondary">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-neon flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-foreground mb-1">Gemini Study Brain 🤖✨</h2>
              <p className="text-sm text-muted-foreground">
                Powered by Google Gemini · AI that reads your syllabus
              </p>
            </div>
          </div>

          <p className="text-sm text-foreground mb-4">
            Gemini reads your syllabi, estimates how long each topic will take, and builds a study plan for you.
          </p>

          {/* AI Metrics */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-background rounded-xl p-3 text-center">
              <div className="text-xl font-bold text-neon-cyan">{Math.floor((profile?.total_minutes || 0) / 60)}h</div>
              <div className="text-xs text-muted-foreground">This week</div>
            </div>
            <div className="bg-background rounded-xl p-3 text-center">
              <div className="text-xl font-bold text-neon-lime">{classes.length}</div>
              <div className="text-xs text-muted-foreground">Classes</div>
            </div>
            <div className="bg-background rounded-xl p-3 text-center">
              <div className="text-xl font-bold text-primary">{classes.reduce((sum, c) => sum + c.streak, 0)}</div>
              <div className="text-xs text-muted-foreground">Total streaks</div>
            </div>
          </div>

          <Button 
            className="w-full bg-gradient-neon hover:opacity-90 text-white font-medium mb-2"
            onClick={() => navigate('/gemini-study-plan')}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            View AI Study Plan
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>

          <div className="text-center text-xs text-muted-foreground mt-3">
            ⚡ Powered by Gemini (syllabus parsing + time estimates + schedule)
          </div>
        </div>

        {/* Study Media Grid */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2 px-2">
            🎞 My Study Moments
          </h2>
          
          {posts.length === 0 ? (
            <div className="bg-card rounded-3xl p-8 text-center border border-border">
              <div className="text-5xl mb-3">📸</div>
              <p className="text-muted-foreground mb-4">No study posts yet</p>
              <Button onClick={() => navigate('/nudge-camera')} className="bg-gradient-primary text-white">
                <Clock className="w-4 h-4 mr-2" />
                Start Your First Session
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {posts.map((post) => (
                <div 
                  key={post.id}
                  className="aspect-square rounded-2xl overflow-hidden relative hover-scale cursor-pointer border border-border"
                  onClick={() => navigate(`/feed`)}
                >
                  <img 
                    src={post.photo_url || post.front_photo_url || post.back_photo_url || 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=400'}
                    alt="Study moment"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 right-2">
                    <div className="bg-black/70 backdrop-blur-sm px-2 py-1 rounded-full text-xs text-white font-medium">
                      {formatTimeAgo(post.created_at)}
                    </div>
                  </div>
                  {post.timelapse_url && (
                    <div className="absolute bottom-2 left-2">
                      <div className="bg-black/70 backdrop-blur-sm p-1.5 rounded-full">
                        🎥
                      </div>
                    </div>
                  )}
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
