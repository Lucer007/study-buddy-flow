import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";

export function CreateDemoPosts() {
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateDemoPosts = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in first");
        return;
      }

      // Get user's classes
      const { data: classes } = await supabase
        .from('classes')
        .select('id')
        .eq('user_id', user.id)
        .limit(6);

      if (!classes || classes.length === 0) {
        toast.error("Please add some classes first");
        return;
      }

      const classIds = classes.map(c => c.id);

      toast.info("Generating demo study posts with AI photos... This may take a minute ⏳");

      const { data, error } = await supabase.functions.invoke('create-demo-posts', {
        body: { 
          userId: user.id,
          classIds 
        }
      });

      if (error) throw error;

      toast.success(`✨ Created ${data.postsCreated} demo posts! Check out the Feed tab`);
      
      // Refresh the page to show new posts
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      console.error('Error creating demo posts:', error);
      toast.error("Failed to create demo posts");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button 
      onClick={handleCreateDemoPosts}
      disabled={isLoading}
      className="gap-2 bg-gradient-neon"
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Generating...
        </>
      ) : (
        <>
          <Sparkles className="w-4 h-4" />
          Create Demo Posts
        </>
      )}
    </Button>
  );
}