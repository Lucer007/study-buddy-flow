import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Flame, MessageCircle, BookOpen, Clock, Calendar as CalendarIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface FeedPost {
  id: string;
  photo_url: string;
  timelapse_url?: string;
  minutes_studied: number;
  caption?: string;
  created_at: string;
  user_id: string;
  session_id?: string;
  class_id?: string;
  username: string;
  display_name: string;
  user_photo_url?: string;
  class_name?: string;
}

interface Reaction {
  id: string;
  post_id: string;
  user_id: string;
  emoji: string;
}

const REACTION_EMOJIS = ['🔥', '😭', '🤓', '☕', '💪', '🤯'];

interface StudyBlock {
  id: string;
  class_id: string;
  class_name?: string;
  assignment_id?: string;
  assignment_title?: string;
  duration_minutes: number;
  start_time?: string;
  block_date: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [todayBlock, setTodayBlock] = useState<StudyBlock | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasData, setHasData] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      loadDashboard();
      subscribeToReactions();
    }
  }, [user]);

  const loadDashboard = async () => {
    if (!user) return;

    try {
      // Check if user has any data (sessions, posts, or blocks)
      const { data: sessionsData } = await supabase
        .from('study_sessions')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      const hasAnyData = (sessionsData && sessionsData.length > 0);
      setHasData(hasAnyData);

      if (hasAnyData) {
        // Load today's study block only if user has any study data
        await loadTodayBlock();
      }
      // Always load feed so users see friends/fake posts even before first session
      await loadFeed();
    } catch (error: any) {
      toast({
        title: "Failed to load dashboard",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadTodayBlock = async () => {
    if (!user) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data: blocksData } = await supabase
        .from('study_blocks')
        .select('*')
        .eq('user_id', user.id)
        .eq('block_date', today)
        .order('start_time', { ascending: true })
        .limit(1);

      if (blocksData && blocksData.length > 0) {
        const block = blocksData[0];
        
        // Get class info
        const { data: classData } = await supabase
          .from('classes')
          .select('name')
          .eq('id', block.class_id)
          .single();

        // Get assignment info if exists
        let assignmentTitle = undefined;
        if (block.assignment_id) {
          const { data: assignmentData } = await supabase
            .from('assignments')
            .select('title')
            .eq('id', block.assignment_id)
            .single();
          assignmentTitle = assignmentData?.title;
        }

        setTodayBlock({
          ...block,
          class_name: classData?.name,
          assignment_title: assignmentTitle
        });
      }
    } catch (error: any) {
      console.error('Error loading today block:', error);
    }
  };

  const loadFeed = async () => {
    if (!user) return;

    try {
      // Get friendships
      const { data: friendships } = await supabase
        .from('friendships')
        .select('friend_id, user_id')
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

      const friendIds = friendships?.map(f => 
        f.user_id === user.id ? f.friend_id : f.user_id
      ) || [];

      // Include own posts
      const allUserIds = [user.id, ...friendIds];

      // Get posts
      const { data: postsData, error: postsError } = await supabase
        .from('feed_posts')
        .select('*')
        .in('user_id', allUserIds)
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;

      // Get profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, display_name, photo_url')
        .in('user_id', allUserIds);

      // Get classes
      const classIds = postsData?.map(p => p.class_id).filter(Boolean) || [];
      const { data: classes } = await supabase
        .from('classes')
        .select('id, name')
        .in('id', classIds);

      // Get reactions
      const postIds = postsData?.map(p => p.id) || [];
      const { data: reactionsData } = await supabase
        .from('reactions')
        .select('*')
        .in('post_id', postIds);

      setReactions(reactionsData || []);

      // Enrich posts
      const enrichedPosts = postsData?.map(post => {
        const profile = profiles?.find(p => p.user_id === post.user_id);
        const classInfo = classes?.find(c => c.id === post.class_id);
        return {
          ...post,
          username: profile?.username || 'unknown',
          display_name: profile?.display_name || 'Unknown User',
          user_photo_url: profile?.photo_url,
          class_name: classInfo?.name
        };
      }) || [];

      // Add fake friend posts for demo (if no real posts exist)
      const fakePosts: FeedPost[] = [
        {
          id: 'fake-1',
          user_id: 'fake-user-1',
          session_id: 'fake-session-1',
          photo_url: 'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=800&q=80',
          minutes_studied: 40,
          class_id: null,
          class_name: 'CS220',
          created_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
          username: 'allen_codes',
          display_name: 'Allen',
          user_photo_url: undefined,
          caption: 'Finally cracked this algorithm 💻'
        },
        {
          id: 'fake-2',
          user_id: 'fake-user-2',
          session_id: 'fake-session-2',
          photo_url: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800&q=80',
          minutes_studied: 35,
          class_id: null,
          class_name: 'IT101',
          created_at: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
          username: 'amani_tech',
          display_name: 'Amani',
          user_photo_url: undefined,
          caption: 'Late night grind 🌙'
        },
        {
          id: 'fake-3',
          user_id: 'fake-user-3',
          session_id: 'fake-session-3',
          photo_url: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&q=80',
          minutes_studied: 52,
          class_id: null,
          class_name: 'MATH301',
          created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
          username: 'jordan_math',
          display_name: 'Jordan',
          user_photo_url: undefined,
          caption: 'Calculus never felt so good ✨'
        }
      ];

      // Add fake reactions for demo posts
      const fakeReactions: Reaction[] = [
        { id: 'fake-r1', post_id: 'fake-1', user_id: 'fake-user-4', emoji: '🔥' },
        { id: 'fake-r2', post_id: 'fake-1', user_id: 'fake-user-5', emoji: '🔥' },
        { id: 'fake-r3', post_id: 'fake-1', user_id: 'fake-user-6', emoji: '🤓' },
        { id: 'fake-r4', post_id: 'fake-2', user_id: 'fake-user-4', emoji: '💪' },
        { id: 'fake-r5', post_id: 'fake-2', user_id: 'fake-user-5', emoji: '☕' },
        { id: 'fake-r6', post_id: 'fake-3', user_id: 'fake-user-4', emoji: '🔥' },
        { id: 'fake-r7', post_id: 'fake-3', user_id: 'fake-user-5', emoji: '🔥' },
        { id: 'fake-r8', post_id: 'fake-3', user_id: 'fake-user-6', emoji: '🤓' },
      ];

      // Combine real posts with fake posts (real posts first)
      const allPosts = enrichedPosts.length > 0 ? enrichedPosts : [...fakePosts];
      const allReactions = [...(reactionsData || []), ...fakeReactions];

      setPosts(allPosts);
      setReactions(allReactions);
    } catch (error: any) {
      toast({
        title: "Failed to load feed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const subscribeToReactions = () => {
    const channel = supabase
      .channel('reactions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reactions'
        },
        () => {
          loadFeed();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const toggleReaction = async (postId: string, emoji: string) => {
    if (!user) return;

    try {
      const existing = reactions.find(
        r => r.post_id === postId && r.user_id === user.id && r.emoji === emoji
      );

      if (existing) {
        await supabase.from('reactions').delete().eq('id', existing.id);
      } else {
        await supabase.from('reactions').insert({
          post_id: postId,
          user_id: user.id,
          emoji
        });
      }
    } catch (error: any) {
      toast({
        title: "Failed to update reaction",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getReactionCount = (postId: string, emoji: string) => {
    return reactions.filter(r => r.post_id === postId && r.emoji === emoji).length;
  };

  const formatTimeAgo = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="animate-spin text-white">
          <Flame className="h-12 w-12" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pb-24">
      <div className="max-w-2xl mx-auto">
        
        {/* Header */}
        <div className="sticky top-0 z-10 bg-black/95 backdrop-blur-sm border-b border-[#1C1C1C] px-5 py-4">
          <h1 className="text-white text-2xl font-bold">Home</h1>
          <p className="text-[#888888] text-sm">Your study dashboard & feed</p>
        </div>

        {/* Empty State - First Time */}
        {!loading && !hasData && (
          <div className="px-5 py-12">
            <div 
              className="rounded-2xl p-8 text-center space-y-4"
              style={{ background: '#141414' }}
            >
              <div className="text-6xl mb-4">👋</div>
              <h2 className="text-white text-2xl font-bold">HEY {user?.email?.split('@')[0]?.toUpperCase()}</h2>
              <p className="text-white text-lg">Ready to lock in? It's time to Nudge.</p>
              <p className="text-[#BFBFBF]">Capture your study moment and share it.</p>
              
              <button
                onClick={() => navigate('/nudge-camera')}
                className="w-full h-14 rounded-[28px] text-white font-semibold text-base hover-scale mt-6"
                style={{
                  background: 'linear-gradient(135deg, #FAD961 0%, #F76B1C 100%)',
                  boxShadow: '0 8px 24px rgba(247, 107, 28, 0.4)'
                }}
              >
                Start Your First Study Nudge
              </button>

              <p className="text-[#888888] text-sm mt-4">
                Once you study, you'll see your buddies' sessions here too.
              </p>
            </div>
          </div>
        )}

        {/* Dashboard with Data */}
        {!loading && hasData && (
          <div className="space-y-6">
            
            {/* Today's Plan Section */}
            {todayBlock && (
              <div className="px-5 pt-6">
                <h2 className="text-white text-lg font-semibold mb-3">📚 Today's Nudge</h2>
                <div 
                  className="rounded-2xl p-5 space-y-4"
                  style={{ background: '#141414' }}
                >
                  <div>
                    <div className="text-white font-semibold text-lg mb-1">
                      {todayBlock.class_name}
                      {todayBlock.assignment_title && ` – ${todayBlock.assignment_title}`}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-[#888888]">
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {todayBlock.duration_minutes} min
                      </span>
                      {todayBlock.start_time && (
                        <span className="flex items-center gap-1">
                          <CalendarIcon className="w-4 h-4" />
                          {todayBlock.start_time}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <button
                    onClick={() => navigate('/nudge-camera')}
                    className="w-full h-12 rounded-[24px] text-white font-semibold text-base hover-scale"
                    style={{
                      background: 'linear-gradient(135deg, #FAD961 0%, #F76B1C 100%)',
                      boxShadow: '0 8px 24px rgba(247, 107, 28, 0.4)'
                    }}
                  >
                    Start Nudge Now
                  </button>
                </div>
              </div>
            )}

            {/* Feed Section */}
            <div className="px-5">
              <h2 className="text-white text-lg font-semibold mb-3">🔥 Study Buddies Feed</h2>
              
              {posts.length === 0 ? (
                <div 
                  className="rounded-2xl p-8 text-center space-y-4"
                  style={{ background: '#141414' }}
                >
                  <BookOpen className="h-16 w-16 mx-auto text-[#888888] opacity-50" />
                  <h3 className="text-white text-xl font-semibold">Wow, it's calm in here 💤</h3>
                  <p className="text-[#888888]">Add more buddies to make it lively!</p>
                  <button
                    onClick={() => navigate('/buddies')}
                    className="mt-4 h-12 px-6 rounded-[24px] bg-[#1C1C1C] text-white font-medium hover-scale"
                  >
                    Find Study Buddies
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {posts.map((post) => (
                    <div key={post.id} className="rounded-2xl overflow-hidden" style={{ background: '#141414' }}>
                      
                      {/* Header */}
                      <div className="p-4 flex items-center gap-3">
                        <div 
                          className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold"
                          style={{
                            background: 'linear-gradient(135deg, #FAD961 0%, #F76B1C 100%)'
                          }}
                        >
                          {post.user_photo_url ? (
                            <img src={post.user_photo_url} alt={post.display_name} className="w-full h-full rounded-full object-cover" />
                          ) : (
                            <span className="text-white">{post.display_name[0]}</span>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="text-white font-semibold text-sm">{post.display_name}</div>
                          <div className="text-[#888888] text-xs">{formatTimeAgo(post.created_at)}</div>
                        </div>
                      </div>

                      {/* Media */}
                      <div className="relative">
                        {post.timelapse_url ? (
                          <video src={post.timelapse_url} className="w-full aspect-[4/3] object-cover" controls />
                        ) : (
                          <img src={post.photo_url} alt="Study session" className="w-full aspect-[4/3] object-cover" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="p-4 space-y-3">
                        {/* Reaction Bar */}
                        <div className="flex gap-2 flex-wrap">
                          {REACTION_EMOJIS.map((emoji) => {
                            const count = getReactionCount(post.id, emoji);
                            return (
                              <button
                                key={emoji}
                                onClick={() => toggleReaction(post.id, emoji)}
                                className="px-3 py-1.5 rounded-full text-sm hover-scale"
                                style={{
                                  background: count > 0 ? '#1C1C1C' : '#0A0A0A',
                                  border: '1px solid #2A2A2A'
                                }}
                              >
                                <span>{emoji}</span>
                                {count > 0 && <span className="ml-1.5 text-white text-xs font-medium">{count}</span>}
                              </button>
                            );
                          })}
                        </div>

                        {/* Study Info */}
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-white font-medium">{Math.floor(post.minutes_studied)}m studied</span>
                          {post.class_name && (
                            <>
                              <span className="text-[#888888]">•</span>
                              <span className="text-[#888888]">{post.class_name}</span>
                            </>
                          )}
                        </div>

                        {/* Caption */}
                        {post.caption && (
                          <p className="text-white text-sm">{post.caption}</p>
                        )}

                        {/* Comment Button */}
                        <button className="flex items-center gap-2 text-[#888888] text-sm hover:text-white transition-colors">
                          <MessageCircle className="w-4 h-4" />
                          <span>Add a comment</span>
                        </button>
                      </div>

                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

      </div>
    </div>
  );
};

export default Dashboard;
