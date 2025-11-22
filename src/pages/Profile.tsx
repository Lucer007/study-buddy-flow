import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { BookOpen, Trophy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

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
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [studyBuddiesCount, setStudyBuddiesCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [leaderboardRank, setLeaderboardRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  const weeklyGoalHours = 10;
  const weeklyStudiedHours = Math.floor((profile?.total_minutes || 0) / 60);

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

  if (loading || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="animate-spin text-white">
          <BookOpen className="h-12 w-12" />
        </div>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-black pb-24">
      <div className="max-w-2xl mx-auto px-5 pt-10 space-y-5">
        
        {/* 1. Profile Photo + Rank Badge */}
        <div className="flex flex-col items-center">
          <div className="relative mb-3">
            <div 
              className="w-[120px] h-[120px] rounded-full p-[3px] animate-float"
              style={{
                background: 'linear-gradient(135deg, #FAD961 0%, #F76B1C 100%)',
                boxShadow: '0 8px 32px rgba(247, 107, 28, 0.4)'
              }}
            >
              <div className="w-full h-full rounded-full bg-black flex items-center justify-center text-5xl font-black overflow-hidden">
                {profile.photo_url ? (
                  <img src={profile.photo_url} alt={profile.display_name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white">{profile.display_name[0]}</span>
                )}
              </div>
            </div>
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-6 h-6 flex items-center justify-center">
              <Trophy className="w-6 h-6" style={{ color: '#FFD700' }} />
            </div>
          </div>

          {/* 2. Name */}
          <h1 className="text-[26px] font-semibold text-white text-center mb-5">{profile.display_name}</h1>
        </div>

        {/* 3. Streak Card */}
        <div 
          className="h-[54px] rounded-[28px] px-6 flex items-center justify-between hover-scale cursor-pointer"
          style={{
            background: 'linear-gradient(90deg, #3A1C00 0%, #1A0F00 100%)'
          }}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔥</span>
            <div>
              <div className="text-white font-bold text-base leading-tight">{profile.streak} Day Streak</div>
              <div className="text-[#C9C9C9] text-xs">Keep it going!</div>
            </div>
          </div>
        </div>

        {/* 4. Weekly Study Goal Bar */}
        <div 
          className="h-[66px] rounded-[20px] p-4 flex items-center justify-between"
          style={{ background: '#141414' }}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎯</span>
            <div>
              <div className="text-white font-medium text-sm leading-tight">Goal: {weeklyGoalHours}h/week</div>
              <div className="text-[#888888] text-xs">{weeklyStudiedHours} of {weeklyGoalHours} done</div>
            </div>
          </div>
          <div className="flex gap-2">
            {[...Array(4)].map((_, i) => (
              <div 
                key={i}
                className="w-3 h-3 rounded-full"
                style={{
                  background: i < Math.ceil((weeklyStudiedHours / weeklyGoalHours) * 4) 
                    ? 'linear-gradient(135deg, #FAD961 0%, #F76B1C 100%)' 
                    : '#333333',
                  boxShadow: i < Math.ceil((weeklyStudiedHours / weeklyGoalHours) * 4) 
                    ? '0 0 8px rgba(247, 107, 28, 0.6)' 
                    : 'none'
                }}
              />
            ))}
          </div>
        </div>

        {/* 5. Leaderboard Section */}
        {leaderboardRank && (
          <div className="text-center py-4">
            <div className="text-white font-semibold text-lg mb-1">#{leaderboardRank} Among Friends</div>
            <button 
              onClick={() => navigate('/leaderboard')}
              className="text-[#6EA8FF] text-sm hover:underline"
            >
              View Leaderboard →
            </button>
          </div>
        )}

        {/* 6. Stats Row */}
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center">
            <div className="text-white font-semibold text-xl mb-1">
              {Math.floor(profile.total_minutes / 60)}
            </div>
            <div className="text-[#888888] text-xs">
              Hours Studied
            </div>
          </div>

          <div className="text-center">
            <div className="text-white font-semibold text-xl mb-1">
              {studyBuddiesCount}
            </div>
            <div className="text-[#888888] text-xs">
              Study Buddies
            </div>
          </div>

          <div className="text-center">
            <div className="text-white font-semibold text-xl mb-1">
              {followingCount}
            </div>
            <div className="text-[#888888] text-xs">
              Following
            </div>
          </div>
        </div>

        {/* 7. Share Profile Button */}
        <div className="flex justify-center">
          <button 
            className="h-[48px] rounded-[26px] px-8 text-white font-semibold text-base hover-scale"
            style={{ 
              background: '#1C1C1C',
              width: '85%'
            }}
          >
            Share Profile
          </button>
        </div>

        {/* 8. Study Library Card */}
        <div 
          className="rounded-[20px] p-[18px] hover-scale cursor-pointer"
          style={{ background: '#141414' }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📂</span>
              <div>
                <div className="text-white font-semibold text-base leading-tight">My Study Library</div>
                <div className="text-[#888888] text-xs mt-1">Your notes, assignments & AI guides</div>
              </div>
            </div>
            <div className="text-white text-xl">→</div>
          </div>
        </div>

        {/* 9. Media Grid */}
        {posts.length === 0 ? (
          <div className="text-center py-16 space-y-4 rounded-[20px]" style={{ background: '#141414' }}>
            <BookOpen className="h-16 w-16 mx-auto text-[#888888] opacity-50" />
            <p className="text-white font-medium">No Nudge posts yet</p>
            <p className="text-[#888888] text-sm">Complete a study session to post!</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {posts.map((post) => (
              <div
                key={post.id}
                className="aspect-square rounded-[14px] overflow-hidden hover-scale cursor-pointer group relative"
                style={{ background: '#141414' }}
              >
                {post.timelapse_url ? (
                  <div className="relative w-full h-full">
                    <video src={post.timelapse_url} className="w-full h-full object-cover" />
                    <div className="absolute top-2 right-2 rounded-xl px-2 py-1 text-white text-xs font-medium" style={{ background: 'rgba(0,0,0,0.6)' }}>
                      {Math.floor(post.minutes_studied)}m
                    </div>
                  </div>
                ) : post.photo_url ? (
                  <>
                    <img src={post.photo_url} alt="Nudge" className="w-full h-full object-cover" />
                    <div className="absolute top-2 right-2 rounded-xl px-2 py-1 text-white text-xs font-medium" style={{ background: 'rgba(0,0,0,0.6)' }}>
                      {Math.floor(post.minutes_studied)}m
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #FAD961 0%, #F76B1C 100%)' }}>
                    <BookOpen className="h-12 w-12 text-white" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 10. Footer - Current Classes ONLY */}
        {classes.length > 0 && (
          <div className="pt-5 pb-8">
            <div className="text-white font-bold text-lg mb-2.5">📚 Current Classes</div>
            <div className="flex flex-wrap gap-2">
              {classes.map((cls) => (
                <div 
                  key={cls.id}
                  className="rounded-[18px] px-[14px] py-2 text-white text-sm hover-scale cursor-pointer"
                  style={{ background: '#1B1B1B' }}
                >
                  {cls.name}
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default Profile;