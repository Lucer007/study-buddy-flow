import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { BookOpen, Share2, ChevronRight, Flame, PlayCircle } from 'lucide-react';
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

  const getTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffWeeks = Math.floor(diffDays / 7);
    
    if (diffDays === 0) return 'today';
    if (diffDays === 1) return '1d';
    if (diffDays < 7) return `${diffDays}d`;
    if (diffWeeks === 1) return '1w';
    return `${diffWeeks}w`;
  };

  if (loading || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: '#0E0E0F' }}>
        <div className="animate-spin">
          <BookOpen className="h-12 w-12 text-white" />
        </div>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="min-h-screen pb-24" style={{ background: '#0E0E0F' }}>
      <div className="max-w-2xl mx-auto">
        
        {/* 1. Header Section */}
        <div className="flex flex-col items-center px-6 pt-8 pb-4">
          {/* Profile Image */}
          <div 
            className="w-[100px] h-[100px] rounded-full overflow-hidden mb-3"
            style={{
              boxShadow: '0 4px 12px rgba(0,0,0,0.4)'
            }}
          >
            {profile.photo_url ? (
              <img src={profile.photo_url} alt={profile.display_name} className="w-full h-full object-cover" />
            ) : (
              <div 
                className="w-full h-full flex items-center justify-center text-3xl font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #14B8A6 0%, #8B5CF6 100%)' }}
              >
                {profile.display_name[0]}
              </div>
            )}
          </div>

          {/* User Name */}
          <h1 className="text-white text-[22px] font-semibold mb-3">{profile.display_name}</h1>

          {/* Share Profile Button */}
          <button 
            className="w-full h-[42px] flex items-center justify-center gap-2 text-white font-medium rounded-full hover-scale"
            style={{ background: '#2B2B2F' }}
          >
            <Share2 className="w-4 h-4" />
            <span>Share Profile</span>
          </button>
        </div>

        {/* 2. Class Progress Section */}
        <div className="px-5 pt-0 pb-2 space-y-4">
          {classes.length === 0 ? (
            <div 
              className="text-center py-12 rounded-2xl"
              style={{ 
                background: '#1A1A1D',
                boxShadow: '0 4px 12px rgba(0,0,0,0.4)'
              }}
            >
              <BookOpen className="h-12 w-12 mx-auto mb-3 text-white opacity-50" />
              <p className="text-white font-medium mb-1">No classes yet</p>
              <p className="text-white text-sm opacity-60">Add your first class to get started</p>
            </div>
          ) : (
            classes.map((cls) => (
              <div 
                key={cls.id}
                onClick={() => navigate(`/class/${cls.id}`)}
                className="p-5 rounded-2xl cursor-pointer hover-scale"
                style={{ 
                  background: '#1A1A1D',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.4)'
                }}
              >
                {/* Title */}
                <h3 className="text-white text-lg font-semibold mb-2">
                  {cls.name}
                </h3>

                {/* Progress Label */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white text-sm" style={{ opacity: 0.7 }}>
                    Progress: {cls.progress_percentage}%
                  </span>
                </div>

                {/* Progress Bar */}
                <div 
                  className="h-[10px] rounded-lg overflow-hidden mb-3"
                  style={{ background: '#2A2A2F' }}
                >
                  <div 
                    className="h-full transition-all duration-500"
                    style={{ 
                      width: `${cls.progress_percentage}%`,
                      background: 'linear-gradient(90deg, #14B8A6 0%, #8B5CF6 100%)'
                    }}
                  />
                </div>

                {/* Streak and Last Studied */}
                <div className="flex items-center justify-between">
                  {cls.streak > 0 && (
                    <div className="flex items-center gap-1 text-white text-sm">
                      <Flame className="w-4 h-4 text-orange-500" />
                      <span>Streak: {cls.streak} days</span>
                    </div>
                  )}
                  <span className="text-white text-xs ml-auto" style={{ opacity: 0.6 }}>
                    Last studied: {getLastStudiedText(cls.last_studied_date)}
                  </span>
                </div>

                {/* CTA */}
                <div className="flex items-center justify-end gap-1 text-white text-sm mt-2" style={{ opacity: 0.8 }}>
                  <span>Open Class</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            ))
          )}
        </div>

        {/* 3. Media Grid Section */}
        <div className="px-5 pt-5 pb-2">
          {posts.length === 0 ? (
            <div 
              className="text-center py-12 rounded-2xl"
              style={{ 
                background: '#1A1A1D',
                boxShadow: '0 4px 12px rgba(0,0,0,0.4)'
              }}
            >
              <BookOpen className="h-12 w-12 mx-auto mb-3 text-white opacity-50" />
              <p className="text-white font-medium mb-1">No posts yet</p>
              <p className="text-white text-sm opacity-60">Complete a study session to share!</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-[10px]">
              {posts.map((post) => (
                <div
                  key={post.id}
                  className="aspect-square rounded-xl overflow-hidden hover-scale cursor-pointer relative"
                  style={{ 
                    background: '#1A1A1D',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.4)'
                  }}
                >
                  {post.timelapse_url ? (
                    <>
                      <video src={post.timelapse_url} className="w-full h-full object-cover" />
                      <div className="absolute top-2 right-2">
                        <PlayCircle className="w-5 h-5 text-white" fill="rgba(255,255,255,0.3)" />
                      </div>
                    </>
                  ) : post.photo_url ? (
                    <img src={post.photo_url} alt="Study session" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #14B8A6 0%, #8B5CF6 100%)' }}>
                      <BookOpen className="h-8 w-8 text-white" />
                    </div>
                  )}
                  
                  {/* Time Ago Label */}
                  <div 
                    className="absolute bottom-2 left-2 px-2 py-1 rounded text-xs text-white font-medium"
                    style={{ background: 'rgba(0,0,0,0.6)' }}
                  >
                    {getTimeAgo(post.created_at)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 4. Footer - Current Classes */}
        {classes.length > 0 && (
          <div className="px-6 pt-6 pb-8">
            <h3 className="text-white font-semibold text-sm mb-3 opacity-70">CURRENT CLASSES</h3>
            <div className="flex flex-wrap gap-2">
              {classes.map((cls) => (
                <div 
                  key={cls.id}
                  className="px-[14px] py-[10px] rounded-xl text-white text-sm font-medium"
                  style={{ background: '#2A2A2F' }}
                >
                  {cls.name.split(' ')[0]}
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
