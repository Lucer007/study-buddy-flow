import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Heart, MessageCircle, Send, Flame, MoreHorizontal } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { CreateDemoPosts } from '@/components/CreateDemoPosts';

interface FeedPost {
  id: string;
  photo_url: string;
  timelapse_url?: string;
  minutes_studied: number;
  caption?: string;
  created_at: string;
  class_id?: string;
  profiles: {
    username: string;
    display_name: string;
    photo_url?: string;
  };
  classes?: {
    name: string;
  };
}

interface Reaction {
  id: string;
  emoji: string;
  post_id: string;
  user_id: string;
}

const REACTION_EMOJIS = ['🔥', '💪', '🤯', '👏', '🎯', '⭐'];

const Feed = () => {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [reactions, setReactions] = useState<Record<string, Reaction[]>>({});
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadFeed();
    subscribeToReactions();
  }, []);

  const loadFeed = async () => {
    try {
      // Load posts
      const { data: postsData, error: postsError } = await supabase
        .from('feed_posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (postsError) throw postsError;

      // Load profile data for each post
      if (postsData) {
        const userIds = [...new Set(postsData.map(p => p.user_id))];
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, username, display_name, photo_url')
          .in('user_id', userIds);

        const classIds = postsData.filter(p => p.class_id).map(p => p.class_id);
        const { data: classesData } = await supabase
          .from('classes')
          .select('id, name')
          .in('id', classIds);

        // Map profiles and classes to posts
        const enrichedPosts = postsData.map(post => ({
          ...post,
          profiles: profilesData?.find(p => p.user_id === post.user_id) || {
            username: 'unknown',
            display_name: 'Unknown User',
          },
          classes: post.class_id ? classesData?.find(c => c.id === post.class_id) : undefined,
        }));

        setPosts(enrichedPosts);

        // Load reactions for all posts
        const postIds = postsData.map(p => p.id);
        const { data: reactionsData } = await supabase
          .from('reactions')
          .select('*')
          .in('post_id', postIds);

        if (reactionsData) {
          const grouped = reactionsData.reduce((acc, r) => {
            if (!acc[r.post_id]) acc[r.post_id] = [];
            acc[r.post_id].push(r);
            return acc;
          }, {} as Record<string, Reaction[]>);
          setReactions(grouped);
        }
      }

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
      .channel('feed-reactions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reactions'
        },
        () => {
          loadFeed(); // Refresh on any reaction change
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const toggleReaction = async (postId: string, emoji: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Login required",
          description: "You need to be logged in to react",
          variant: "destructive",
        });
        return;
      }

      // Check if user already reacted with this emoji
      const existingReaction = reactions[postId]?.find(
        r => r.user_id === user.id && r.emoji === emoji
      );

      if (existingReaction) {
        // Remove reaction
        const { error } = await supabase
          .from('reactions')
          .delete()
          .eq('id', existingReaction.id);

        if (error) throw error;
      } else {
        // Add reaction
        const { error } = await supabase
          .from('reactions')
          .insert({
            post_id: postId,
            user_id: user.id,
            emoji,
          });

        if (error) throw error;
      }

    } catch (error: any) {
      toast({
        title: "Failed to react",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getReactionCount = (postId: string, emoji: string) => {
    return reactions[postId]?.filter(r => r.emoji === emoji).length || 0;
  };

  const hasUserReacted = (postId: string, emoji: string) => {
    // TODO: Track current user ID and check
    return false;
  };

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-3xl font-black text-gradient-primary">Feed</h1>
          <CreateDemoPosts />
        </div>
      </div>

      {/* Feed */}
      <div className="max-w-2xl mx-auto pb-20">
        {posts.length === 0 ? (
          <div className="text-center py-16 px-6 space-y-4">
            <Flame className="h-16 w-16 mx-auto text-muted-foreground opacity-50" />
            <p className="text-lg text-muted-foreground font-medium">No posts yet</p>
            <p className="text-sm text-muted-foreground">Be the first to share your Nudge!</p>
          </div>
        ) : (
          <div className="space-y-0">
            {posts.map((post) => (
              <div key={post.id} className="border-b border-border/50 bg-background">
                {/* Post Header */}
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-primary p-0.5">
                      <div className="w-full h-full rounded-full bg-background flex items-center justify-center font-black text-lg">
                        {post.profiles.photo_url ? (
                          <img
                            src={post.profiles.photo_url}
                            alt={post.profiles.display_name}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          post.profiles.display_name[0]
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="font-bold text-foreground">{post.profiles.display_name}</div>
                      <div className="text-sm text-muted-foreground font-medium">
                        @{post.profiles.username} • {formatTimeAgo(post.created_at)}
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="rounded-full">
                    <MoreHorizontal className="h-5 w-5" />
                  </Button>
                </div>

                {/* Post Image/Video */}
                <div className="relative w-full aspect-square bg-card">
                  {post.timelapse_url ? (
                    <video
                      src={post.timelapse_url}
                      className="w-full h-full object-cover"
                      controls
                    />
                  ) : post.photo_url ? (
                    <img
                      src={post.photo_url}
                      alt="Nudge"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-primary flex items-center justify-center">
                      <Flame className="h-24 w-24 text-white" />
                    </div>
                  )}
                </div>

                {/* Post Actions & Info */}
                <div className="p-4 space-y-3">
                  {/* Reaction Bar */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {REACTION_EMOJIS.map((emoji) => {
                      const count = getReactionCount(post.id, emoji);
                      return (
                        <button
                          key={emoji}
                          onClick={() => toggleReaction(post.id, emoji)}
                          className={`
                            px-3 py-1.5 rounded-full border-2 transition-all hover-scale
                            ${count > 0
                              ? 'border-primary bg-primary/10'
                              : 'border-border bg-card hover:border-primary/50'
                            }
                          `}
                        >
                          <span className="text-xl">{emoji}</span>
                          {count > 0 && (
                            <span className="ml-1.5 text-sm font-bold text-foreground">
                              {count}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Study Info */}
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1.5">
                      <Flame className="h-4 w-4 text-primary" />
                      <span className="font-bold text-foreground">{post.minutes_studied} min</span>
                    </div>
                    {post.classes && (
                      <div className="px-3 py-1 bg-secondary/10 text-secondary font-bold rounded-full">
                        {post.classes.name}
                      </div>
                    )}
                  </div>

                  {/* Caption */}
                  {post.caption && (
                    <p className="text-foreground font-medium">
                      <span className="font-bold mr-2">@{post.profiles.username}</span>
                      {post.caption}
                    </p>
                  )}

                  {/* Comment Action */}
                  <button className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors font-medium">
                    <MessageCircle className="h-5 w-5" />
                    <span>View comments</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Feed;