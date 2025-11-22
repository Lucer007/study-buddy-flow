import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Flame, Clock, BookOpen, Users, Share2, Library, Trophy, TrendingUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface Profile {
  username: string;
  display_name: string;
  bio: string;
  photo_url: string;
  streak: number;
  longest_streak: number;
  total_minutes: number;
}

interface Post {
  id: string;
  photo_url: string;
  timelapse_url?: string;
  minutes_studied: number;
  created_at: string;
  class_id?: string;
}

interface Class {
  id: string;
  name: string;
}

const Profile = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [studyBuddiesCount, setStudyBuddiesCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [leaderboardRank, setLeaderboardRank] = useState<number | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  const weeklyGoalHours = 10;
  const weeklyStudiedHours = Math.floor((profile?.total_minutes || 0) / 60);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      // Load posts
      const { data: postsData, error: postsError } = await supabase
        .from('feed_posts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;
      setPosts(postsData || []);

      // Load classes
      const { data: classesData, error: classesError } = await supabase
        .from('classes')
        .select('id, name')
        .eq('user_id', user.id);

      if (classesError) throw classesError;
      setClasses(classesData || []);

      // Load study buddies count (friends)
      const { data: friendsData, error: friendsError } = await supabase
        .from('friendships')
        .select('id')
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

      if (friendsError) throw friendsError;
      setStudyBuddiesCount(friendsData?.length || 0);
      setFollowingCount(friendsData?.length || 0);

      // Calculate leaderboard rank
      const { data: allProfiles, error: rankError } = await supabase
        .from('profiles')
        .select('user_id, total_minutes')
        .order('total_minutes', { ascending: false });

      if (!rankError && allProfiles) {
        const rank = allProfiles.findIndex(p => p.user_id === user.id) + 1;
        setLeaderboardRank(rank);
      }

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

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-spin text-primary">
          <Flame className="h-12 w-12" />
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const filteredPosts = selectedFilter === 'all' 
    ? posts 
    : posts.filter(post => post.class_id === selectedFilter);

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        
        {/* 1. Profile Photo + Rank Badge */}
        <div className="flex flex-col items-center space-y-3">
          <div className="relative">
            <div className="w-32 h-32 rounded-full bg-gradient-primary p-1 glow-primary animate-float">
              <div className="w-full h-full rounded-full bg-background flex items-center justify-center text-6xl font-black">
                {profile.photo_url ? (
                  <img src={profile.photo_url} alt={profile.display_name} className="w-full h-full rounded-full object-cover" />
                ) : (
                  profile.display_name[0]
                )}
              </div>
            </div>
            {leaderboardRank && leaderboardRank <= 3 && (
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-gradient-accent rounded-full px-4 py-1.5 flex items-center gap-2 glow-accent">
                <Trophy className="h-4 w-4 text-accent-foreground" />
                <span className="text-accent-foreground font-black text-sm">#{leaderboardRank}</span>
              </div>
            )}
          </div>

          {/* 2. Display Name */}
          <h1 className="text-4xl font-black text-foreground text-center">{profile.display_name}</h1>
        </div>

        {/* 3. Streak Card */}
        <div className="bg-gradient-primary rounded-3xl p-6 glow-primary hover-scale cursor-pointer">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Flame className="h-10 w-10 text-white" />
              <div>
                <div className="text-3xl font-black text-white">{profile.streak}-Day Streak</div>
                <div className="text-white/80 font-medium">Keep it going!</div>
              </div>
            </div>
            <div className="text-6xl">🔥</div>
          </div>
        </div>

        {/* 4. Weekly Study Goal Progress */}
        <div className="bg-card border-2 border-border rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="text-2xl">🎯</div>
              <div>
                <div className="text-lg font-black text-foreground">Weekly Goal</div>
                <div className="text-sm text-muted-foreground font-medium">
                  {weeklyStudiedHours} / {weeklyGoalHours} hours
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-black text-gradient-secondary">
                {Math.round((weeklyStudiedHours / weeklyGoalHours) * 100)}%
              </div>
            </div>
          </div>
          <Progress value={(weeklyStudiedHours / weeklyGoalHours) * 100} className="h-3" />
        </div>

        {/* 5. Study Activity Categories (Chips) */}
        <div className="space-y-3">
          <div className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Study Type</div>
          <div className="flex flex-wrap gap-2">
            <Badge 
              variant={selectedFilter === 'all' ? 'default' : 'outline'}
              className="rounded-full px-4 py-2 cursor-pointer hover-scale"
              onClick={() => setSelectedFilter('all')}
            >
              📚 All
            </Badge>
            <Badge 
              variant="outline"
              className="rounded-full px-4 py-2 cursor-pointer hover-scale"
            >
              📝 Homework
            </Badge>
            <Badge 
              variant="outline"
              className="rounded-full px-4 py-2 cursor-pointer hover-scale"
            >
              💻 Coding
            </Badge>
            <Badge 
              variant="outline"
              className="rounded-full px-4 py-2 cursor-pointer hover-scale"
            >
              📖 Reading
            </Badge>
            <Badge 
              variant="outline"
              className="rounded-full px-4 py-2 cursor-pointer hover-scale"
            >
              🧠 Review
            </Badge>
          </div>
        </div>

        {/* 6. Leaderboard Placement */}
        {leaderboardRank && (
          <div 
            className="bg-card border-2 border-border rounded-3xl p-6 text-center hover-scale cursor-pointer"
            onClick={() => navigate('/leaderboard')}
          >
            <div className="flex items-center justify-center gap-2 mb-2">
              <TrendingUp className="h-5 w-5 text-accent" />
              <div className="text-2xl font-black text-gradient-accent">#{leaderboardRank} Among Friends</div>
            </div>
            <div className="text-sm text-muted-foreground font-medium">View Leaderboard →</div>
          </div>
        )}

        {/* 7. Stats Row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-card border-2 border-border rounded-3xl p-5 text-center">
            <div className="text-3xl font-black text-gradient-primary mb-1">
              {Math.floor(profile.total_minutes / 60)}h
            </div>
            <div className="text-xs text-muted-foreground font-bold uppercase tracking-wider">
              Hours Studied
            </div>
          </div>

          <div className="bg-card border-2 border-border rounded-3xl p-5 text-center">
            <div className="text-3xl font-black text-gradient-secondary mb-1">
              {studyBuddiesCount}
            </div>
            <div className="text-xs text-muted-foreground font-bold uppercase tracking-wider">
              Study Buddies
            </div>
          </div>

          <div className="bg-card border-2 border-border rounded-3xl p-5 text-center">
            <div className="text-3xl font-black text-gradient-accent mb-1">
              {followingCount}
            </div>
            <div className="text-xs text-muted-foreground font-bold uppercase tracking-wider">
              Following
            </div>
          </div>
        </div>

        {/* 8. Share Profile Button */}
        <Button 
          className="w-full rounded-full py-6 text-lg font-black hover-scale"
          variant="outline"
        >
          <Share2 className="h-5 w-5 mr-2" />
          Share Profile
        </Button>

        {/* 9. Study Library Box */}
        <div className="bg-card border-2 border-border rounded-3xl p-6 hover-scale cursor-pointer">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Library className="h-8 w-8 text-primary" />
              <div>
                <div className="text-xl font-black text-foreground">My Study Library</div>
                <div className="text-sm text-muted-foreground font-medium">
                  Your notes, assignments & AI guides
                </div>
              </div>
            </div>
            <div className="text-2xl">→</div>
          </div>
        </div>

        {/* 10. Media Grid */}
        <div className="space-y-4">
          <div className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Study Content</div>
          {filteredPosts.length === 0 ? (
            <div className="text-center py-16 space-y-4 bg-card border-2 border-border rounded-3xl">
              <BookOpen className="h-16 w-16 mx-auto text-muted-foreground opacity-50" />
              <p className="text-lg text-muted-foreground font-medium">No Nudge posts yet</p>
              <p className="text-sm text-muted-foreground">Complete a study session to post!</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {filteredPosts.map((post) => (
                <div
                  key={post.id}
                  className="aspect-square bg-card border-2 border-border rounded-2xl overflow-hidden hover-scale cursor-pointer group relative"
                >
                  {post.timelapse_url ? (
                    <div className="relative w-full h-full">
                      <video src={post.timelapse_url} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-all flex items-center justify-center">
                        <div className="absolute top-2 right-2 bg-black/50 rounded-full px-2 py-1 text-xs text-white font-bold">
                          {Math.floor(post.minutes_studied)}m
                        </div>
                      </div>
                    </div>
                  ) : post.photo_url ? (
                    <>
                      <img src={post.photo_url} alt="Nudge" className="w-full h-full object-cover" />
                      <div className="absolute top-2 right-2 bg-black/50 rounded-full px-2 py-1 text-xs text-white font-bold">
                        {Math.floor(post.minutes_studied)}m
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full bg-gradient-primary flex items-center justify-center">
                      <BookOpen className="h-12 w-12 text-white" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 11. Footer - Current Classes ONLY */}
        {classes.length > 0 && (
          <div className="space-y-4 pt-8 border-t-2 border-border">
            <div className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Current Classes</div>
            <div className="flex flex-wrap gap-2">
              {classes.map((cls) => (
                <Badge 
                  key={cls.id}
                  variant="outline"
                  className="rounded-full px-4 py-2 text-sm font-bold hover-scale cursor-pointer"
                >
                  📚 {cls.name}
                </Badge>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default Profile;