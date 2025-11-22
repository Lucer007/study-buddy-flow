import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Sparkles, BookOpen, Clock, Calendar, Target, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

interface Class {
  id: string;
  name: string;
  title?: string;
  progress_percentage: number;
  ai_parsed: boolean;
}

interface Topic {
  id: string;
  title: string;
  description?: string;
  estimated_minutes: number;
  order_index: number;
}

interface Assignment {
  id: string;
  title: string;
  type?: string;
  due_date?: string;
  estimated_minutes: number;
}

interface StudyBlock {
  id: string;
  block_date: string;
  start_time?: string;
  duration_minutes: number;
  class_id: string;
  assignment_id?: string;
}

const GeminiStudyPlan = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [studyBlocks, setStudyBlocks] = useState<StudyBlock[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  useEffect(() => {
    if (selectedClassId) {
      loadClassData(selectedClassId);
    }
  }, [selectedClassId]);

  const loadData = async () => {
    if (!user) return;

    try {
      // Load classes
      const { data: classesData } = await supabase
        .from('classes')
        .select('*')
        .eq('user_id', user.id)
        .order('name');

      setClasses(classesData || []);
      
      // Set initial selected class from URL or first class
      const classIdParam = searchParams.get('classId');
      if (classIdParam && classesData?.some(c => c.id === classIdParam)) {
        setSelectedClassId(classIdParam);
      } else if (classesData && classesData.length > 0) {
        setSelectedClassId(classesData[0].id);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load study plan',
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  const loadClassData = async (classId: string) => {
    try {
      // Load topics
      const { data: topicsData } = await supabase
        .from('syllabus_topics')
        .select('*')
        .eq('class_id', classId)
        .order('order_index');

      setTopics(topicsData || []);

      // Load assignments
      const { data: assignmentsData } = await supabase
        .from('syllabus_assignments')
        .select('*')
        .eq('class_id', classId)
        .order('due_date');

      setAssignments(assignmentsData || []);

      // Load study blocks
      const { data: blocksData } = await supabase
        .from('study_blocks')
        .select('*')
        .eq('class_id', classId)
        .gte('block_date', new Date().toISOString().split('T')[0])
        .order('block_date')
        .limit(10);

      setStudyBlocks(blocksData || []);
    } catch (error) {
      console.error('Error loading class data:', error);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'No due date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  const getTotalEstimatedTime = () => {
    const topicsTime = topics.reduce((sum, t) => sum + t.estimated_minutes, 0);
    const assignmentsTime = assignments.reduce((sum, a) => sum + a.estimated_minutes, 0);
    return topicsTime + assignmentsTime;
  };

  const selectedClass = classes.find(c => c.id === selectedClassId);

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-24 px-4">
        <div className="max-w-2xl mx-auto pt-8 space-y-6">
          <Skeleton className="h-12 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-3xl" />
          <Skeleton className="h-48 w-full rounded-3xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-2xl mx-auto px-4 pt-8 space-y-6 animate-fade-in">
        
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate('/profile')}
            className="rounded-full"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-neon-cyan" />
              Your AI Study Plan
            </h1>
            <p className="text-sm text-muted-foreground">Generated by Gemini from your uploaded syllabi</p>
          </div>
        </div>

        {/* Class Filter */}
        {classes.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {classes.map((cls) => (
              <button
                key={cls.id}
                onClick={() => setSelectedClassId(cls.id)}
                className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-all ${
                  selectedClassId === cls.id
                    ? 'bg-gradient-neon text-white'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {cls.name}
              </button>
            ))}
          </div>
        )}

        {/* AI Status Banner */}
        {selectedClass && (
          <div className={`rounded-3xl p-5 border-2 ${
            selectedClass.ai_parsed 
              ? 'bg-card border-neon-cyan' 
              : 'bg-card border-border'
          }`}>
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                selectedClass.ai_parsed ? 'bg-gradient-neon' : 'bg-muted'
              }`}>
                {selectedClass.ai_parsed ? '✅' : '⏳'}
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-foreground mb-1">
                  {selectedClass.ai_parsed ? 'Gemini Analysis Complete' : 'Processing with Gemini...'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {selectedClass.ai_parsed 
                    ? `Total estimated time: ${formatTime(getTotalEstimatedTime())}`
                    : 'Gemini is reading your syllabus and creating a personalized plan'
                  }
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Topics Section */}
        {topics.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2 px-2">
              <BookOpen className="w-5 h-5 text-neon-teal" />
              Course Topics
            </h2>
            
            <div className="space-y-2">
              {topics.map((topic, index) => (
                <div 
                  key={topic.id}
                  className="bg-card rounded-2xl p-4 border border-border hover-scale"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-progress flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground mb-1">{topic.title}</h3>
                      {topic.description && (
                        <p className="text-sm text-muted-foreground mb-2">{topic.description}</p>
                      )}
                      <div className="flex items-center gap-2">
                        <div className="inline-flex items-center gap-1 px-3 py-1 bg-neon-teal/10 text-neon-teal rounded-full text-xs font-medium">
                          <Clock className="w-3 h-3" />
                          {formatTime(topic.estimated_minutes)}
                        </div>
                        <div className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">
                          <Sparkles className="w-3 h-3" />
                          Gemini estimate
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Assignments Section */}
        {assignments.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2 px-2">
              <Target className="w-5 h-5 text-primary" />
              Assignments
            </h2>
            
            <div className="space-y-2">
              {assignments.map((assignment) => (
                <div 
                  key={assignment.id}
                  className="bg-card rounded-2xl p-4 border border-border hover-scale"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">{assignment.title}</h3>
                      {assignment.type && (
                        <p className="text-sm text-muted-foreground capitalize">{assignment.type}</p>
                      )}
                    </div>
                    {assignment.due_date && (
                      <div className="text-xs font-medium text-primary whitespace-nowrap">
                        Due {formatDate(assignment.due_date)}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="inline-flex items-center gap-1 px-3 py-1 bg-neon-teal/10 text-neon-teal rounded-full text-xs font-medium">
                      <Clock className="w-3 h-3" />
                      {formatTime(assignment.estimated_minutes)}
                    </div>
                    <div className="inline-flex items-center gap-1 px-3 py-1 bg-secondary/10 text-secondary rounded-full text-xs font-medium">
                      <Sparkles className="w-3 h-3" />
                      Planned with Gemini
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Study Blocks */}
        {studyBlocks.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2 px-2">
              <Calendar className="w-5 h-5 text-accent" />
              Upcoming Study Sessions
            </h2>
            
            <div className="space-y-2">
              {studyBlocks.map((block) => (
                <div 
                  key={block.id}
                  className="bg-card rounded-2xl p-4 border border-border flex items-center gap-4"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-accent flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-foreground">
                      {formatDate(block.block_date)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {block.start_time || 'Flexible time'} · {formatTime(block.duration_minutes)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {topics.length === 0 && assignments.length === 0 && (
          <div className="bg-card rounded-3xl p-8 text-center border border-border">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-neon flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">No study plan yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Upload a syllabus for this class to let Gemini create your personalized study plan
            </p>
            <Button 
              className="bg-gradient-primary text-white"
              onClick={() => navigate(`/class/${selectedClassId}`)}
            >
              <BookOpen className="w-4 h-4 mr-2" />
              Go to Class Details
            </Button>
          </div>
        )}

        {/* Ask Gemini CTA */}
        <div className="bg-gradient-neon rounded-3xl p-6 text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <MessageCircle className="w-6 h-6 text-white" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Need Study Advice?</h3>
          <p className="text-sm text-white/90 mb-4">
            Ask Gemini to help you prioritize, optimize your schedule, or answer questions about your study plan
          </p>
          <Button 
            className="bg-white text-foreground hover:bg-white/90 font-medium"
            onClick={() => navigate('/chat')}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Ask Gemini: How should I prioritize?
          </Button>
        </div>

      </div>
    </div>
  );
};

export default GeminiStudyPlan;
