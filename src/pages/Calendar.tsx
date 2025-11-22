import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Calendar as CalendarIcon, Clock, BookOpen, List, Grid3x3, ChevronLeft, ChevronRight, Upload, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format, isSameDay, parseISO, addDays, startOfWeek } from 'date-fns';
import { cn } from '@/lib/utils';
import PinkyPromiseDialog from '@/components/PinkyPromiseDialog';
import ICAL from 'ical.js';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

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

interface PinkyPromise {
  id: string;
  block_id: string;
  status: string;
}

type ViewMode = 'month' | 'list' | 'day' | 'week';

const CalendarPage = () => {
  const [studyBlocks, setStudyBlocks] = useState<StudyBlock[]>([]);
  const [pinkyPromises, setPinkyPromises] = useState<PinkyPromise[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [selectedBlock, setSelectedBlock] = useState<StudyBlock | null>(null);
  const [showPromiseDialog, setShowPromiseDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

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
    } catch (error) {
      console.error('Error loading promises:', error);
    }
  };

  const loadStudyBlocks = useCallback(async () => {
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
    loadPinkyPromises();
  }, [loadStudyBlocks]);

  const handleImportCalendar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.ics')) {
      toast({
        title: "Invalid file type",
        description: "Please upload a .ics file from Canvas, Blackboard, Google Calendar, or Apple Calendar",
        variant: "destructive",
      });
      return;
    }

    setIsImporting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Read file content
      const fileContent = await file.text();
      
      // Parse ICS file
      const jcalData = ICAL.parse(fileContent);
      const comp = new ICAL.Component(jcalData);
      const events = comp.getAllSubcomponents('vevent');

      if (events.length === 0) {
        throw new Error('No events found in calendar file');
      }

      // Process events and create study blocks
      const classMap = new Map<string, string>(); // Map class names to class IDs
      const studyBlocksToInsert: Array<{
        user_id: string;
        class_id: string;
        block_date: string;
        start_time: string | null;
        duration_minutes: number;
      }> = [];

      for (const event of events) {
        const vevent = new ICAL.Event(event);
        const summary = vevent.summary || 'Untitled Event';
        const startDate = vevent.startDate.toJSDate();
        const endDate = vevent.endDate?.toJSDate();
        
        // Calculate duration in minutes
        const durationMinutes = endDate 
          ? Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60))
          : 60; // Default to 60 minutes if no end time

        // Extract class name from summary (remove common prefixes)
        const className = summary
          .replace(/^(Assignment|Homework|Quiz|Exam|Lab|Lecture|Discussion|Reading):\s*/i, '')
          .replace(/\s*-\s*.*$/, '') // Remove suffixes after dash
          .trim() || 'Imported Class';

        // Get or create class
        let classId = classMap.get(className);
        if (!classId) {
          // Check if class exists
          const { data: existingClass } = await supabase
            .from('classes')
            .select('id')
            .eq('user_id', user.id)
            .eq('name', className)
            .single();

          if (existingClass) {
            classId = existingClass.id;
          } else {
            // Create new class
            const { data: newClass, error: classError } = await supabase
              .from('classes')
              .insert({
                user_id: user.id,
                name: className,
              })
              .select('id')
              .single();

            if (classError) throw classError;
            classId = newClass.id;
          }
          classMap.set(className, classId);
        }

        // Format date and time
        const blockDate = format(startDate, 'yyyy-MM-dd');
        const startTime = format(startDate, 'HH:mm');

        studyBlocksToInsert.push({
          user_id: user.id,
          class_id: classId,
          block_date: blockDate,
          start_time: startTime,
          duration_minutes: durationMinutes,
        });
      }

      // Insert all study blocks
      if (studyBlocksToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('study_blocks')
          .insert(studyBlocksToInsert);

        if (insertError) throw insertError;

        toast({
          title: "Calendar imported! ✨",
          description: `Successfully imported ${studyBlocksToInsert.length} events from your calendar`,
        });

        // Reload study blocks
        await loadStudyBlocks();
        setShowImportDialog(false);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      toast({
        title: "Import failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Group blocks by date
  const groupedBlocks = studyBlocks.reduce((acc, block) => {
    const date = block.block_date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(block);
    return acc;
  }, {} as Record<string, StudyBlock[]>);

  // Get dates that have study blocks
  const datesWithBlocksArray = Object.keys(groupedBlocks).map(date => parseISO(date));
  const datesWithBlocksSet = new Set(
    studyBlocks.map(block => format(new Date(block.block_date), 'yyyy-MM-dd'))
  );

  // Get study blocks for selected date
  const selectedDateBlocks = selectedDate 
    ? groupedBlocks[format(selectedDate, 'yyyy-MM-dd')] || []
    : [];

  // Check if a date has study blocks
  const hasStudyBlocks = (date: Date) => {
    return datesWithBlocksArray.some(d => isSameDay(d, date));
  };

  // Get number of blocks for a date
  const getBlockCount = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return groupedBlocks[dateStr]?.length || 0;
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
    : viewMode === 'week'
    ? getWeekDates().flatMap(date => getBlocksForDate(date))
    : [];

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
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="animate-spin text-white">
          <CalendarIcon className="h-12 w-12" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pb-24">
      <PinkyPromiseDialog
        isOpen={showPromiseDialog}
        onClose={() => setShowPromiseDialog(false)}
        studyBlock={selectedBlock}
        onPromiseCreated={() => {
          loadPinkyPromises();
        }}
      />
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-black/95 backdrop-blur-sm border-b border-[#1C1C1C] px-5 py-4">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-white text-2xl font-bold">Calendar</h1>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowImportDialog(true)}
                className="p-2 rounded-lg transition-colors text-[#888888] hover:text-white hover:bg-[#1C1C1C]"
                title="Import calendar"
              >
                <Upload className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('month')}
                className={cn(
                  "p-2 rounded-lg transition-colors",
                  viewMode === 'month' 
                    ? "bg-[#1C1C1C] text-white" 
                    : "text-[#888888] hover:text-white"
                )}
                title="Month View"
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
                title="List View"
              >
                <List className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('day')}
                className={cn(
                  "px-3 py-2 rounded-lg transition-colors text-sm font-medium",
                  viewMode === 'day' 
                    ? "bg-[#1C1C1C] text-white" 
                    : "text-[#888888] hover:text-white"
                )}
              >
                Day
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={cn(
                  "px-3 py-2 rounded-lg transition-colors text-sm font-medium",
                  viewMode === 'week' 
                    ? "bg-[#1C1C1C] text-white" 
                    : "text-[#888888] hover:text-white"
                )}
              >
                Week
              </button>
            </div>
          </div>
          <p className="text-[#888888] text-sm">Your study schedule</p>
        </div>

        {/* Calendar Content */}
        {studyBlocks.length === 0 ? (
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
        ) : viewMode === 'month' || viewMode === 'list' ? (
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
                      {selectedDateBlocks.map((block, index) => {
                        const hasBlockPromise = hasPromise(block.id);
                        return (
                          <button
                            key={block.id}
                            onClick={() => handleBlockClick(block)}
                            className="w-full rounded-2xl p-5 border border-[#1C1C1C] hover:border-[#2A2A2A] transition-all text-left"
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
                                  {hasBlockPromise && (
                                    <span className="text-lg">🤙</span>
                                  )}
                                </div>
                                {block.assignment_id && (
                                  <p className="text-sm text-[#888888] font-medium pl-5">
                                    Assignment: {block.assignment_id}
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
                          </button>
                        );
                      })}
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
                  {blocks.map((block, index) => {
                    const hasBlockPromise = hasPromise(block.id);
                    return (
                      <button
                        key={block.id}
                        onClick={() => handleBlockClick(block)}
                        className="w-full rounded-2xl p-5 border border-[#1C1C1C] hover:border-[#2A2A2A] transition-all hover-scale text-left"
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
                              {hasBlockPromise && (
                                <span className="text-lg">🤙</span>
                              )}
                            </div>
                            {block.assignment_id && (
                              <p className="text-sm text-[#888888] font-medium pl-5">
                                Assignment: {block.assignment_id}
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
                      </button>
                    );
                  })}
                </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Day/Week View */
          <div className="px-5 py-6">
            <div className="grid md:grid-cols-[300px_1fr] gap-6">
              {/* Calendar Picker */}
              <div 
                className="rounded-2xl p-4"
                style={{ background: '#141414', border: '1px solid #1C1C1C' }}
              >
                <CalendarComponent
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
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
                    hasBlocks: (date) => datesWithBlocksSet.has(format(date, 'yyyy-MM-dd')),
                  }}
                  modifiersClassNames={{
                    hasBlocks: "after:content-[''] after:absolute after:bottom-0.5 after:left-1/2 after:-translate-x-1/2 after:w-1.5 after:h-1.5 after:rounded-full after:bg-[#F76B1C]",
                  }}
                  components={{
                    IconLeft: ({ ...props }) => <ChevronLeft className="h-4 w-4" {...props} />,
                    IconRight: ({ ...props }) => <ChevronRight className="h-4 w-4" {...props} />,
                  }}
                />
                
                <div className="mt-4 pt-4 border-t border-[#1C1C1C] space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded-full bg-[#F76B1C]" />
                    <span className="text-[#888888]">Has study blocks</span>
                  </div>
                </div>
              </div>

              {/* Timeline View */}
              <div 
                className="rounded-2xl p-6"
                style={{ background: '#141414', border: '1px solid #1C1C1C' }}
              >
                {viewMode === 'day' ? (
                  // Day View
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-white text-2xl font-bold">
                        {format(selectedDate, 'EEEE, MMMM d')}
                      </h2>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedDate(addDays(selectedDate, -1))}
                          className="p-2 hover:bg-[#1C1C1C] rounded-lg transition-colors text-white"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => setSelectedDate(addDays(selectedDate, 1))}
                          className="p-2 hover:bg-[#1C1C1C] rounded-lg transition-colors text-white"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    {displayedBlocks.length === 0 ? (
                      <div className="text-center py-8 text-[#888888]">
                        No study blocks for this day
                      </div>
                    ) : (
                      <div className="relative h-[600px] bg-[#0A0A0A] rounded-xl p-4">
                        {/* Time labels */}
                        <div className="absolute left-0 top-0 bottom-0 w-16 flex flex-col justify-between py-4 text-xs text-[#888888]">
                          {Array.from({ length: 17 }, (_, i) => (
                            <div key={i}>{((i + 7) % 12 || 12)}:00 {i + 7 >= 12 ? 'PM' : 'AM'}</div>
                          ))}
                        </div>

                        {/* Study blocks */}
                        <div className="ml-16 relative h-full">
                          {displayedBlocks.map((block, idx) => {
                            const hasBlockPromise = hasPromise(block.id);
                            if (!block.start_time) return null;
                            
                            return (
                              <button
                                key={block.id}
                                onClick={() => handleBlockClick(block)}
                                className="absolute left-0 right-0 rounded-lg p-3 border-l-4 hover:shadow-lg transition-all cursor-pointer group"
                                style={{
                                  top: `${getTimePosition(block.start_time)}%`,
                                  height: `${getBlockHeight(block.duration_minutes)}%`,
                                  backgroundColor: idx % 3 === 0 
                                    ? 'rgba(250, 217, 97, 0.2)'
                                    : idx % 3 === 1
                                    ? 'rgba(102, 126, 234, 0.2)'
                                    : 'rgba(240, 147, 251, 0.2)',
                                  borderColor: idx % 3 === 0 
                                    ? '#FAD961'
                                    : idx % 3 === 1
                                    ? '#667eea'
                                    : '#f093fb'
                                }}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 text-left">
                                    <div className="font-bold text-sm text-white truncate">{block.classes.name}</div>
                                    <div className="text-xs font-medium mt-1 text-[#888888]">
                                      {formatTime(block.start_time)} • {block.duration_minutes}m
                                    </div>
                                  </div>
                                  {hasBlockPromise && (
                                    <div className="text-lg">🤙</div>
                                  )}
                                </div>
                                {!hasBlockPromise && (
                                  <div className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-[#888888] mt-1">
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
                    <h2 className="text-white text-2xl font-bold">Week View</h2>
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
                              isSelected && "border-[#FAD961] bg-[#FAD961]/10",
                              isToday && !isSelected && "border-[#1C1C1C] bg-[#1C1C1C]",
                              !isSelected && !isToday && "border-[#1C1C1C] hover:border-[#2A2A2A] bg-[#0A0A0A]"
                            )}
                          >
                            <div className="text-xs text-[#888888] font-medium">
                              {format(date, 'EEE')}
                            </div>
                            <div className={cn(
                              "text-2xl font-bold",
                              isToday && "text-[#FAD961]",
                              !isToday && "text-white"
                            )}>
                              {format(date, 'd')}
                            </div>
                            <div className="mt-2 space-y-1">
                              {dateBlocks.slice(0, 3).map((block, idx) => (
                                <div
                                  key={block.id}
                                  className="h-1 rounded-full"
                                  style={{
                                    backgroundColor: idx % 3 === 0 
                                      ? '#FAD961'
                                      : idx % 3 === 1
                                      ? '#667eea'
                                      : '#f093fb'
                                  }}
                                />
                              ))}
                              {dateBlocks.length > 3 && (
                                <div className="text-xs text-[#888888]">+{dateBlocks.length - 3}</div>
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
        )}
      </div>

      {/* Import Calendar Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="bg-[#141414] border-[#1C1C1C] text-white">
          <DialogHeader>
            <DialogTitle className="text-white text-xl font-bold">Import Calendar</DialogTitle>
            <DialogDescription className="text-[#888888]">
              Import your calendar from Canvas, Blackboard, Google Calendar, or Apple Calendar
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <p className="text-sm text-[#888888]">
                Upload a .ics file exported from:
              </p>
              <ul className="text-sm text-[#888888] list-disc list-inside space-y-1 ml-2">
                <li>Canvas: Settings → Calendar → Export Calendar</li>
                <li>Blackboard: Calendar → Export Calendar</li>
                <li>Google Calendar: Settings → Export</li>
                <li>Apple Calendar: File → Export → Export...</li>
              </ul>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".ics"
              onChange={handleImportCalendar}
              className="hidden"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              className="w-full h-12 bg-gradient-to-r from-[#FAD961] to-[#F76B1C] hover:opacity-90 text-white font-semibold"
            >
              {isImporting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Importing...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  <span>Choose .ics File</span>
                </div>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CalendarPage;