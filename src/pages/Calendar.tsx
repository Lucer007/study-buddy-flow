import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Calendar as CalendarIcon, Clock, BookOpen, ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Calendar } from '@/components/ui/calendar';
import { format, addDays, startOfWeek, isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';
import PinkyPromiseDialog from '@/components/PinkyPromiseDialog';

interface StudyBlock {
  id: string;
  block_date: string;
  start_time: string;
  duration_minutes: number;
  class_id: string;
  assignment_id?: string;
  classes: {
    name: string;
  };
}

interface PinkyPromise {
  id: string;
  block_id: string;
  status: string;
}

const CalendarPage = () => {
  const [studyBlocks, setStudyBlocks] = useState<StudyBlock[]>([]);
  const [pinkyPromises, setPinkyPromises] = useState<PinkyPromise[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  const [selectedBlock, setSelectedBlock] = useState<StudyBlock | null>(null);
  const [showPromiseDialog, setShowPromiseDialog] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadStudyBlocks();
    loadPinkyPromises();
  }, []);

  const loadPinkyPromises = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('pinky_promises')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      setPinkyPromises(data || []);
    } catch (error: any) {
      console.error('Error loading promises:', error);
    }
  };

  const loadStudyBlocks = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('study_blocks')
        .select(`
          *,
          classes(name)
        `)
        .eq('user_id', user.id)
        .order('block_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) throw error;

      setStudyBlocks(data || []);
    } catch (error: any) {
      toast({
        title: "Failed to load calendar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Check if block has a pinky promise
  const hasPromise = (blockId: string) => {
    return pinkyPromises.some(p => p.block_id === blockId && p.status === 'active');
  };

  const handleBlockClick = (block: StudyBlock) => {
    setSelectedBlock(block);
    setShowPromiseDialog(true);
  };

  // Filter blocks for selected date(s)
  const getBlocksForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return studyBlocks.filter(block => block.block_date === dateStr);
  };

  const getWeekDates = () => {
    const start = startOfWeek(selectedDate);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  };

  const displayedBlocks = viewMode === 'day' 
    ? getBlocksForDate(selectedDate)
    : getWeekDates().flatMap(date => getBlocksForDate(date));

  // Get dates with study blocks for calendar highlighting
  const datesWithBlocks = new Set(
    studyBlocks.map(block => format(new Date(block.block_date), 'yyyy-MM-dd'))
  );

  const formatTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  // Calculate position for time blocks (7am = 0%, 11pm = 100%)
  const getTimePosition = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes;
    const startMinutes = 7 * 60; // 7 AM
    const endMinutes = 23 * 60; // 11 PM
    const relativeMinutes = totalMinutes - startMinutes;
    return (relativeMinutes / (endMinutes - startMinutes)) * 100;
  };

  const getBlockHeight = (duration: number) => {
    const totalRange = 16 * 60; // 7am to 11pm = 16 hours
    return (duration / totalRange) * 100;
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-spin text-primary">
          <CalendarIcon className="h-12 w-12" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <PinkyPromiseDialog
        isOpen={showPromiseDialog}
        onClose={() => setShowPromiseDialog(false)}
        studyBlock={selectedBlock}
        onPromiseCreated={() => {
          loadPinkyPromises();
        }}
      />

      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Study Calendar</h1>
            <p className="text-muted-foreground">AI-powered study schedule</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('day')}
              className={cn(
                "px-4 py-2 rounded-lg font-medium transition-all",
                viewMode === 'day' 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-muted hover:bg-muted/80"
              )}
            >
              Day
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={cn(
                "px-4 py-2 rounded-lg font-medium transition-all",
                viewMode === 'week' 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-muted hover:bg-muted/80"
              )}
            >
              Week
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-[300px_1fr] gap-6">
          {/* Calendar Picker */}
          <div className="bg-card border border-border rounded-2xl p-4">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              className="pointer-events-auto"
              modifiers={{
                hasBlocks: (date) => datesWithBlocks.has(format(date, 'yyyy-MM-dd'))
              }}
              modifiersClassNames={{
                hasBlocks: "bg-primary/20 font-bold"
              }}
            />
            
            <div className="mt-4 pt-4 border-t border-border space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-3 h-3 rounded-full bg-primary" />
                <span className="text-muted-foreground">Has study blocks</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-3 h-3 rounded-full bg-accent" />
                <span className="text-muted-foreground">Today</span>
              </div>
            </div>
          </div>

          {/* Timeline View */}
          <div className="bg-card border border-border rounded-2xl p-6">
            {studyBlocks.length === 0 ? (
              <div className="text-center py-12 space-y-4">
                <BookOpen className="h-16 w-16 mx-auto text-muted-foreground opacity-50" />
                <p className="text-xl font-medium text-muted-foreground">No study blocks yet</p>
                <p className="text-sm text-muted-foreground">
                  Upload a syllabus to generate your personalized study plan
                </p>
              </div>
            ) : viewMode === 'day' ? (
              // Day View
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold">
                    {format(selectedDate, 'EEEE, MMMM d')}
                  </h2>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedDate(addDays(selectedDate, -1))}
                      className="p-2 hover:bg-muted rounded-lg transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setSelectedDate(addDays(selectedDate, 1))}
                      className="p-2 hover:bg-muted rounded-lg transition-colors"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {displayedBlocks.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No study blocks for this day
                  </div>
                ) : (
                  <div className="relative h-[600px] bg-muted/20 rounded-xl p-4">
                    {/* Time labels */}
                    <div className="absolute left-0 top-0 bottom-0 w-16 flex flex-col justify-between py-4 text-xs text-muted-foreground">
                      {Array.from({ length: 17 }, (_, i) => (
                        <div key={i}>{((i + 7) % 12 || 12)}:00 {i + 7 >= 12 ? 'PM' : 'AM'}</div>
                      ))}
                    </div>

                    {/* Study blocks */}
                    <div className="ml-16 relative h-full">
                      {displayedBlocks.map((block, idx) => {
                        const hasBlockPromise = hasPromise(block.id);
                        
                        return (
                          <button
                            key={block.id}
                            onClick={() => handleBlockClick(block)}
                            className="absolute left-0 right-0 rounded-lg p-3 border-l-4 hover:shadow-lg transition-all cursor-pointer group"
                            style={{
                              top: `${getTimePosition(block.start_time)}%`,
                              height: `${getBlockHeight(block.duration_minutes)}%`,
                              backgroundColor: `hsl(var(--${idx % 3 === 0 ? 'primary' : idx % 3 === 1 ? 'secondary' : 'accent'}) / 0.2)`,
                              borderColor: `hsl(var(--${idx % 3 === 0 ? 'primary' : idx % 3 === 1 ? 'secondary' : 'accent'}))`
                            }}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 text-left">
                                <div className="font-bold text-sm truncate">{block.classes.name}</div>
                                <div className="text-xs font-medium mt-1">
                                  {formatTime(block.start_time)} • {block.duration_minutes}m
                                </div>
                              </div>
                              {hasBlockPromise && (
                                <div className="text-lg">🤙</div>
                              )}
                            </div>
                            {!hasBlockPromise && (
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-muted-foreground mt-1">
                                Click to make pinky promise
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // Week View
              <div className="space-y-4">
                <h2 className="text-2xl font-bold">Week View</h2>
                <div className="grid grid-cols-7 gap-2">
                  {getWeekDates().map((date) => {
                    const dateBlocks = getBlocksForDate(date);
                    const isToday = isSameDay(date, new Date());
                    const isSelected = isSameDay(date, selectedDate);
                    
                    return (
                      <button
                        key={date.toISOString()}
                        onClick={() => {
                          setSelectedDate(date);
                          setViewMode('day');
                        }}
                        className={cn(
                          "p-3 rounded-lg border transition-all",
                          isSelected && "border-primary bg-primary/5",
                          isToday && !isSelected && "border-accent bg-accent/5",
                          !isSelected && !isToday && "border-border hover:border-primary/50"
                        )}
                      >
                        <div className="text-xs text-muted-foreground font-medium">
                          {format(date, 'EEE')}
                        </div>
                        <div className={cn(
                          "text-2xl font-bold",
                          isToday && "text-accent"
                        )}>
                          {format(date, 'd')}
                        </div>
                        <div className="mt-2 space-y-1">
                          {dateBlocks.slice(0, 3).map((block, idx) => (
                            <div
                              key={block.id}
                              className="h-1 rounded-full"
                              style={{
                                backgroundColor: `hsl(var(--${idx % 3 === 0 ? 'primary' : idx % 3 === 1 ? 'secondary' : 'accent'}))`
                              }}
                            />
                          ))}
                          {dateBlocks.length > 3 && (
                            <div className="text-xs text-muted-foreground">+{dateBlocks.length - 3}</div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarPage;