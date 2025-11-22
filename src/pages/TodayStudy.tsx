import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Calendar, Clock, BookOpen, Camera, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, isToday, isTomorrow, parseISO } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';

interface StudyBlock {
  id: string;
  block_date: string;
  start_time: string | null;
  duration_minutes: number;
  class_id: string;
  assignment_id?: string;
  classes: {
    name: string;
  };
}

const TodayStudy = () => {
  const [todayBlocks, setTodayBlocks] = useState<StudyBlock[]>([]);
  const [upcomingBlocks, setUpcomingBlocks] = useState<StudyBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    loadStudyBlocks();
    requestNotificationPermission();
  }, [user]);

  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  };

  const loadStudyBlocks = async () => {
    try {
      if (!user) return;

      const today = format(new Date(), 'yyyy-MM-dd');
      const tomorrow = format(new Date(Date.now() + 86400000), 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('study_blocks')
        .select(`
          *,
          classes(name)
        `)
        .eq('user_id', user.id)
        .gte('block_date', today)
        .order('block_date', { ascending: true })
        .order('start_time', { ascending: true })
        .limit(10);

      if (error) throw error;

      const today_blocks = data?.filter(b => b.block_date === today) || [];
      const upcoming_blocks = data?.filter(b => b.block_date > today) || [];

      setTodayBlocks(today_blocks);
      setUpcomingBlocks(upcoming_blocks.slice(0, 3));
    } catch (error) {
      console.error('Error loading study blocks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartSession = (block: StudyBlock) => {
    // Navigate to camera to take nudge photo
    navigate('/nudge-camera', {
      state: {
        classId: block.class_id,
        blockId: block.id,
        duration: block.duration_minutes,
        assignmentId: block.assignment_id
      }
    });
  };

  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return 'All day';
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const formatDate = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'EEE, MMM d');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin text-primary">
          <Sparkles className="h-12 w-12" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-4xl mx-auto px-5 py-6 space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Today's Study</h1>
          <p className="text-muted-foreground">Your AI-powered study schedule</p>
        </div>

        {/* Today's Sessions */}
        {todayBlocks.length > 0 ? (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Today
            </h2>
            {todayBlocks.map((block) => (
              <Card key={block.id} className="p-5 space-y-4 border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <h3 className="font-bold text-lg text-foreground">{block.classes.name}</h3>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {formatTime(block.start_time)}
                      </span>
                      <span>{block.duration_minutes} min</span>
                    </div>
                  </div>
                  <Button
                    onClick={() => handleStartSession(block)}
                    className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-opacity"
                    size="lg"
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Study Now
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center space-y-3 border-dashed">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold text-foreground">No study sessions today</h3>
            <p className="text-sm text-muted-foreground">
              Upload a syllabus to generate your AI-powered study schedule
            </p>
            <Button onClick={() => navigate('/add-classes')} className="mt-4">
              Add Class
            </Button>
          </Card>
        )}

        {/* Upcoming Sessions */}
        {upcomingBlocks.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-secondary" />
              Coming Up
            </h2>
            {upcomingBlocks.map((block) => (
              <Card key={block.id} className="p-4 border-border/50">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="font-semibold text-foreground">{block.classes.name}</h3>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span>{formatDate(block.block_date)}</span>
                      <span>•</span>
                      <span>{formatTime(block.start_time)}</span>
                      <span>•</span>
                      <span>{block.duration_minutes} min</span>
                    </div>
                  </div>
                  <Button
                    onClick={() => navigate('/calendar')}
                    variant="outline"
                    size="sm"
                  >
                    View Calendar
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Quick Stats */}
        <Card className="p-6 bg-gradient-to-br from-accent/10 to-primary/10 border-accent/20">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="space-y-1">
              <div className="text-3xl font-bold text-foreground">
                {todayBlocks.reduce((sum, b) => sum + b.duration_minutes, 0)}
              </div>
              <div className="text-sm text-muted-foreground">Minutes Today</div>
            </div>
            <div className="space-y-1">
              <div className="text-3xl font-bold text-foreground">
                {todayBlocks.length}
              </div>
              <div className="text-sm text-muted-foreground">Sessions Today</div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default TodayStudy;
