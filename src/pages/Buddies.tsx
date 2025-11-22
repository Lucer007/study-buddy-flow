import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { UserPlus, Users as UsersIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface BuddyProfile {
  user_id: string;
  username: string;
  display_name: string;
  photo_url?: string;
  streak: number;
  total_minutes: number;
}

const Buddies = () => {
  const { user } = useAuth();
  const [buddies, setBuddies] = useState<BuddyProfile[]>([]);
  const [suggestions, setSuggestions] = useState<BuddyProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      loadBuddies();
    }
  }, [user]);

  const loadBuddies = async () => {
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

      // Get buddy profiles
      if (friendIds.length > 0) {
        const { data: buddiesData } = await supabase
          .from('profiles')
          .select('*')
          .in('user_id', friendIds);
        
        setBuddies(buddiesData || []);
      }

      // Get suggestions (all profiles except current user and existing buddies)
      const { data: allProfiles } = await supabase
        .from('profiles')
        .select('*')
        .neq('user_id', user.id)
        .not('user_id', 'in', `(${friendIds.join(',')})`)
        .limit(10);

      setSuggestions(allProfiles || []);
    } catch (error: any) {
      toast({
        title: "Failed to load buddies",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addBuddy = async (friendId: string) => {
    if (!user) return;

    try {
      await supabase.from('friendships').insert({
        user_id: user.id,
        friend_id: friendId
      });

      toast({
        title: "Buddy added! 🎉",
        description: "You're now study buddies",
      });

      loadBuddies();
    } catch (error: any) {
      toast({
        title: "Failed to add buddy",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    return hours > 0 ? `${hours}h` : `${minutes}m`;
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="animate-spin text-white">
          <UsersIcon className="h-12 w-12" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pb-24">
      <div className="max-w-2xl mx-auto px-5 pt-12">
        
        {/* Header */}
        <h1 className="text-white text-3xl font-bold mb-8">Study Buddies</h1>

        {/* Your Buddies */}
        <div className="mb-10">
          <h2 className="text-white text-xl font-semibold mb-4">Your Buddies ({buddies.length})</h2>
          
          {buddies.length === 0 ? (
            <div 
              className="rounded-2xl p-8 text-center"
              style={{ background: '#141414' }}
            >
              <UsersIcon className="h-16 w-16 mx-auto mb-4 text-[#888888] opacity-50" />
              <p className="text-white font-medium mb-2">No buddies yet</p>
              <p className="text-[#888888] text-sm">Add some study buddies to stay motivated!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {buddies.map((buddy) => (
                <div
                  key={buddy.user_id}
                  className="rounded-2xl p-4 flex items-center gap-4 hover-scale cursor-pointer"
                  style={{ background: '#141414' }}
                >
                  <div 
                    className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold"
                    style={{
                      background: 'linear-gradient(135deg, #FAD961 0%, #F76B1C 100%)'
                    }}
                  >
                    {buddy.photo_url ? (
                      <img src={buddy.photo_url} alt={buddy.display_name} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <span className="text-white">{buddy.display_name[0]}</span>
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <div className="text-white font-semibold">{buddy.display_name}</div>
                    <div className="text-[#888888] text-sm">@{buddy.username}</div>
                  </div>

                  <div className="text-right">
                    <div className="text-white text-sm font-medium">{formatTime(buddy.total_minutes)}</div>
                    <div className="text-[#888888] text-xs flex items-center gap-1">
                      🔥 {buddy.streak}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div>
            <h2 className="text-white text-xl font-semibold mb-4">Find Study Buddies</h2>
            <div className="space-y-3">
              {suggestions.map((profile) => (
                <div
                  key={profile.user_id}
                  className="rounded-2xl p-4 flex items-center gap-4"
                  style={{ background: '#141414' }}
                >
                  <div 
                    className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold"
                    style={{
                      background: 'linear-gradient(135deg, #FAD961 0%, #F76B1C 100%)'
                    }}
                  >
                    {profile.photo_url ? (
                      <img src={profile.photo_url} alt={profile.display_name} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <span className="text-white">{profile.display_name[0]}</span>
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <div className="text-white font-semibold">{profile.display_name}</div>
                    <div className="text-[#888888] text-sm">@{profile.username}</div>
                  </div>

                  <button
                    onClick={() => addBuddy(profile.user_id)}
                    className="w-10 h-10 rounded-full flex items-center justify-center hover-scale"
                    style={{ background: '#1C1C1C' }}
                  >
                    <UserPlus className="w-5 h-5 text-white" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default Buddies;
