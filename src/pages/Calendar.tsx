import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Calendar as CalendarIcon, Clock, BookOpen, List, Grid3x3, ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format, isSameDay, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

interface StudyBlock {
  id: string;
  block_date: string;
  start_time: string | null;
  duration_minutes: number;
  class_id: string;
  classes: {
    name: string;
  };
  assignments: {
    title: string;
  } | null;
}

type ViewMode = 'month' | 'list';

const Calendar = () => {
  const [studyBlocks, setStudyBlocks] = useState<StudyBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const { toast } = useToast();

  const loadStudyBlocks = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('study_blocks')
        .select(`
          *,
          classes(name),
          assignments(title)
        `)
        .eq('user_id', user.id)
        .order('block_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) throw error;

      setStudyBlocks(data || []);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      toast({
        title: "Failed to load calendar",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadStudyBlocks();
  }, [loadStudyBlocks]);

  // Group blocks by date
  const groupedBlocks = studyBlocks.reduce((acc, block) => {
    const date = block.block_date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(block);
    return acc;
  }, {} as Record<string, StudyBlock[]>);

  // Get dates that have study blocks
  const datesWithBlocks = Object.keys(groupedBlocks).map(date => parseISO(date));

  // Get study blocks for selected date
  const selectedDateBlocks = selectedDate 
    ? groupedBlocks[format(selectedDate, 'yyyy-MM-dd')] || []
    : [];

  // Check if a date has study blocks
  const hasStudyBlocks = (date: Date) => {
    return datesWithBlocks.some(d => isSameDay(d, date));
  };

  // Get number of blocks for a date
  const getBlockCount = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return groupedBlocks[dateStr]?.length || 0;
  };

  const formatDate = (dateStr: string) => {
    const date = parseISO(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (isSameDay(date, today)) return 'Today';
    if (isSameDay(date, tomorrow)) return 'Tomorrow';

    return format(date, 'EEEE, MMM d');
  };

  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return 'All day';
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="animate-spin text-white">
          <CalendarIcon className="h-12 w-12" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pb-24">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-black/95 backdrop-blur-sm border-b border-[#1C1C1C] px-5 py-4">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-white text-2xl font-bold">Calendar</h1>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('month')}
                className={cn(
                  "p-2 rounded-lg transition-colors",
                  viewMode === 'month' 
                    ? "bg-[#1C1C1C] text-white" 
                    : "text-[#888888] hover:text-white"
                )}
              >
                <Grid3x3 className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  "p-2 rounded-lg transition-colors",
                  viewMode === 'list' 
                    ? "bg-[#1C1C1C] text-white" 
                    : "text-[#888888] hover:text-white"
                )}
              >
                <List className="w-5 h-5" />
              </button>
            </div>
          </div>
          <p className="text-[#888888] text-sm">Your study schedule</p>
        </div>

        {/* Calendar Content */}
        {Object.keys(groupedBlocks).length === 0 ? (
          <div className="px-5 py-12">
            <div 
              className="rounded-2xl p-8 text-center space-y-4"
              style={{ background: '#141414' }}
            >
              <BookOpen className="h-16 w-16 mx-auto text-[#888888] opacity-50" />
              <h2 className="text-white text-xl font-semibold">No study blocks yet</h2>
              <p className="text-[#888888] text-sm">
              Upload a syllabus to generate your personalized study plan
            </p>
            </div>
          </div>
        ) : (
          <div className="px-5 py-6 space-y-6">
            {/* Month View */}
            {viewMode === 'month' && (
              <>
                {/* Calendar Grid */}
                <div 
                  className="rounded-2xl p-4"
                  style={{ background: '#141414' }}
                >
                  <CalendarComponent
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    month={currentMonth}
                    onMonthChange={setCurrentMonth}
                    className="rounded-lg"
                    classNames={{
                      months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                      month: "space-y-4",
                      caption: "flex justify-center pt-1 relative items-center",
                      caption_label: "text-sm font-medium text-white",
                      nav: "space-x-1 flex items-center",
                      nav_button: cn(
                        "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 text-white border border-[#1C1C1C] hover:border-[#2A2A2A] rounded-md"
                      ),
                      nav_button_previous: "absolute left-1",
                      nav_button_next: "absolute right-1",
                      table: "w-full border-collapse space-y-1",
                      head_row: "flex",
                      head_cell: "text-[#888888] rounded-md w-9 font-normal text-[0.8rem]",
                      row: "flex w-full mt-2",
                      cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                      day: cn(
                        "h-9 w-9 p-0 font-normal aria-selected:opacity-100 rounded-md hover:bg-[#1C1C1C] transition-colors relative",
                        "text-white"
                      ),
                      day_range_end: "day-range-end",
                      day_selected: "bg-gradient-to-br from-[#FAD961] to-[#F76B1C] text-white hover:bg-gradient-to-br hover:from-[#FAD961] hover:to-[#F76B1C] focus:bg-gradient-to-br focus:from-[#FAD961] focus:to-[#F76B1C]",
                      day_today: "bg-[#1C1C1C] text-white font-semibold",
                      day_outside: "day-outside text-[#888888] opacity-50",
                      day_disabled: "text-[#888888] opacity-50",
                      day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
                      day_hidden: "invisible",
                    }}
                    modifiers={{
                      hasBlocks: (date) => hasStudyBlocks(date),
                    }}
                    modifiersClassNames={{
                      hasBlocks: "after:content-[''] after:absolute after:bottom-0.5 after:left-1/2 after:-translate-x-1/2 after:w-1.5 after:h-1.5 after:rounded-full after:bg-[#F76B1C]",
                    }}
                    components={{
                      IconLeft: ({ ...props }) => <ChevronLeft className="h-4 w-4" {...props} />,
                      IconRight: ({ ...props }) => <ChevronRight className="h-4 w-4" {...props} />,
                    }}
                  />
                </div>

                {/* Selected Date Study Blocks */}
                {selectedDate && selectedDateBlocks.length > 0 && (
                  <div className="space-y-3">
                    <h2 className="text-white text-lg font-semibold">
                      {formatDate(format(selectedDate, 'yyyy-MM-dd'))}
                    </h2>
                    <div className="space-y-3">
                      {selectedDateBlocks.map((block, index) => (
                        <div
                          key={block.id}
                          className="rounded-2xl p-5 border border-[#1C1C1C] hover:border-[#2A2A2A] transition-all"
                          style={{ background: '#141414' }}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-3 h-3 rounded-full"
                                  style={{
                                    background: index % 3 === 0 
                                      ? 'linear-gradient(135deg, #FAD961 0%, #F76B1C 100%)'
                                      : index % 3 === 1
                                      ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                                      : 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
                                  }}
                                />
                                <h3 className="text-lg font-bold text-white">
                                  {block.classes.name}
                                </h3>
                              </div>
                              {block.assignments && (
                                <p className="text-sm text-[#888888] font-medium pl-5">
                                  {block.assignments.title}
                                </p>
                              )}
                            </div>
                            <div className="text-right space-y-1">
                              {block.start_time && (
                                <div className="flex items-center gap-2 text-white font-bold text-sm">
                                  <Clock className="h-4 w-4" />
                                  <span>{formatTime(block.start_time)}</span>
                                </div>
                              )}
                              <div className="text-xs text-[#888888] font-medium">
                                {block.duration_minutes} min
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedDate && selectedDateBlocks.length === 0 && (
                  <div 
                    className="rounded-2xl p-6 text-center"
                    style={{ background: '#141414' }}
                  >
                    <p className="text-[#888888] text-sm">
                      No study blocks scheduled for {formatDate(format(selectedDate, 'yyyy-MM-dd'))}
                    </p>
                  </div>
                )}
              </>
            )}

            {/* List View */}
            {viewMode === 'list' && (
              <div className="space-y-6">
                {Object.entries(groupedBlocks).map(([date, blocks]: [string, StudyBlock[]]) => (
                  <div key={date} className="space-y-3">
                    <div className="sticky top-16 z-10 bg-black/80 backdrop-blur-lg py-3">
                      <h2 className="text-xl font-bold text-white">
                        {formatDate(date)}
                      </h2>
                      <div 
                        className="h-1 w-16 rounded-full mt-2"
                        style={{
                          background: 'linear-gradient(135deg, #FAD961 0%, #F76B1C 100%)'
                        }}
                      />
                    </div>
                <div className="space-y-3">
                  {blocks.map((block, index) => (
                    <div
                      key={block.id}
                          className="rounded-2xl p-5 border border-[#1C1C1C] hover:border-[#2A2A2A] transition-all hover-scale"
                          style={{ background: '#141414' }}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                                <div 
                                  className="w-3 h-3 rounded-full"
                                  style={{
                                    background: index % 3 === 0 
                                      ? 'linear-gradient(135deg, #FAD961 0%, #F76B1C 100%)'
                                      : index % 3 === 1
                                      ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                                      : 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
                                  }}
                                />
                                <h3 className="text-lg font-bold text-white">
                              {block.classes.name}
                            </h3>
                          </div>
                          {block.assignments && (
                                <p className="text-sm text-[#888888] font-medium pl-5">
                              {block.assignments.title}
                            </p>
                          )}
                        </div>
                        <div className="text-right space-y-1">
                              {block.start_time && (
                                <div className="flex items-center gap-2 text-white font-bold text-sm">
                            <Clock className="h-4 w-4" />
                            <span>{formatTime(block.start_time)}</span>
                          </div>
                              )}
                              <div className="text-xs text-[#888888] font-medium">
                            {block.duration_minutes} min
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Calendar;