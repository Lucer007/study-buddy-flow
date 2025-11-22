import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Flame, MessageCircle, BookOpen } from 'lucide-react';
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

const Dashboard = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      loadFeed();
      subscribeToReactions();
    }
  }, [user]);

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

      setPosts(enrichedPosts);
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
    <div className="min-h-screen bg-black pb-20">
      <div className="max-w-2xl mx-auto">
        
        {/* Header */}
        <div className="sticky top-0 z-10 bg-black/95 backdrop-blur-sm border-b border-[#1C1C1C] px-5 py-4">
          <h1 className="text-white text-2xl font-bold">Study Buddies</h1>
          <p className="text-[#888888] text-sm">See what your friends are working on</p>
        </div>

        {/* Empty State */}
        {posts.length === 0 && (
          <div className="px-5 py-16 text-center space-y-4">
            <BookOpen className="h-16 w-16 mx-auto text-[#888888] opacity-50" />
            <h2 className="text-white text-xl font-semibold">Wow, it's calm in here 💤</h2>
            <p className="text-[#888888]">Add more buddies to make it lively!</p>
          </div>
        )}

        {/* Feed Posts */}
        <div className="divide-y divide-[#1C1C1C]">
          {posts.map((post) => (
            <div key={post.id} className="px-5 py-4 space-y-3">
              
              {/* Header */}
              <div className="flex items-center gap-3">
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
              <div className="rounded-2xl overflow-hidden bg-[#141414] relative">
                {post.timelapse_url ? (
                  <video src={post.timelapse_url} className="w-full aspect-[4/3] object-cover" controls />
                ) : (
                  <img src={post.photo_url} alt="Study session" className="w-full aspect-[4/3] object-cover" />
                )}
              </div>

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
          ))}
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
