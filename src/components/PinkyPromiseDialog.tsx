import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface PinkyPromiseDialogProps {
  isOpen: boolean;
  onClose: () => void;
  studyBlock: {
    id: string;
    block_date: string;
    start_time: string;
    duration_minutes: number;
    classes: { name: string };
  } | null;
  onPromiseCreated: () => void;
}

const PinkyPromiseDialog = ({ isOpen, onClose, studyBlock, onPromiseCreated }: PinkyPromiseDialogProps) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleCreatePromise = async () => {
    if (!studyBlock) return;

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Check if promise already exists
      const { data: existing } = await supabase
        .from('pinky_promises')
        .select('id')
        .eq('user_id', user.id)
        .eq('block_id', studyBlock.id)
        .eq('date', studyBlock.block_date)
        .single();

      if (existing) {
        toast({
          title: "Promise already exists",
          description: "You've already made a pinky promise for this study block!",
        });
        onClose();
        return;
      }

      // Create pinky promise
      const { error } = await supabase
        .from('pinky_promises')
        .insert({
          user_id: user.id,
          block_id: studyBlock.id,
          date: studyBlock.block_date,
          status: 'active',
        });

      if (error) throw error;

      toast({
        title: "Pinky Promise Made! 🤙",
        description: "You've committed to this study block. We'll remind you!",
      });

      onPromiseCreated();
      onClose();
    } catch (error: any) {
      console.error('Error creating promise:', error);
      toast({
        title: "Failed to create promise",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!studyBlock) return null;

  const formatTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            🤙 Make a Pinky Promise
          </DialogTitle>
          <DialogDescription>
            Commit to completing this study block. We'll hold you accountable!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Study Block Details */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="font-bold text-lg">{studyBlock.classes.name}</div>
            <div className="text-sm text-muted-foreground">
              {formatDate(studyBlock.block_date)}
            </div>
            <div className="flex items-center gap-4 text-sm">
              <span className="font-medium">
                {formatTime(studyBlock.start_time)}
              </span>
              <span className="text-muted-foreground">
                {studyBlock.duration_minutes} minutes
              </span>
            </div>
          </div>

          {/* Accountability Notice */}
          <div className="bg-accent/10 border border-accent/20 rounded-lg p-4 space-y-2">
            <div className="font-medium text-sm">What happens next:</div>
            <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
              <li>You'll get a reminder 1 hour before</li>
              <li>We'll check if you completed it</li>
              <li>Break promises too often and lose credibility</li>
            </ul>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreatePromise}
            className="flex-1 bg-gradient-to-r from-primary to-secondary"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                🤙 Make Promise
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PinkyPromiseDialog;
