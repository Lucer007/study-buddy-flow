import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Sparkles, 
  BookOpen, 
  CheckCircle2, 
  Calendar, 
  Clock, 
  Target,
  Brain,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

interface ClassData {
  id: string;
  name: string;
  estimated_total_minutes: number;
}

interface TopicData {
  id: string;
  title: string;
  estimated_minutes: number;
}

interface AssignmentData {
  id: string;
  title: string;
  type: string;
  estimated_minutes: number;
  due_date: string | null;
}

interface StudyBlockStats {
  total: number;
  classMeetings: number;
  studySessions: number;
}

const ClassesReady = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const classId = searchParams.get('classId');
  
  const [classData, setClassData] = useState<ClassData | null>(null);
  const [topics, setTopics] = useState<TopicData[]>([]);
  const [assignments, setAssignments] = useState<AssignmentData[]>([]);
  const [blockStats, setBlockStats] = useState<StudyBlockStats>({ total: 0, classMeetings: 0, studySessions: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && classId) {
      loadClassSummary();
    }
  }, [user, classId]);

  const loadClassSummary = async () => {
    if (!user || !classId) return;

    try {
      // Load class info
      const { data: classInfo, error: classError } = await supabase
        .from('classes')
        .select('id, name, estimated_total_minutes')
        .eq('id', classId)
        .single();

      if (classError) throw classError;
      setClassData(classInfo);

      // Load topics
      const { data: topicsData } = await supabase
        .from('syllabus_topics')
        .select('id, title, estimated_minutes')
        .eq('class_id', classId)
        .order('order_index');

      setTopics(topicsData || []);

      // Load assignments
      const { data: assignmentsData } = await supabase
        .from('syllabus_assignments')
        .select('id, title, type, estimated_minutes, due_date')
        .eq('class_id', classId)
        .order('due_date');

      setAssignments(assignmentsData || []);

      // Load study blocks stats
      const { data: blocksData } = await supabase
        .from('study_blocks')
        .select('id, start_time, duration_minutes')
        .eq('class_id', classId);

      const blocks = blocksData || [];
      const classMeetings = blocks.filter(b => b.start_time && b.duration_minutes >= 45).length;
      
      setBlockStats({
        total: blocks.length,
        classMeetings: classMeetings,
        studySessions: blocks.length - classMeetings
      });

    } catch (error: any) {
      toast.error('Failed to load class summary');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getTypeEmoji = (type: string) => {
    const types: Record<string, string> = {
      'reading': '📖',
      'hw': '✏️',
      'project': '🎯',
      'exam': '📝',
      'quiz': '❓'
    };
    return types[type] || '📄';
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <Loader2 className="h-12 w-12 animate-spin text-white" />
      </div>
    );
  }

  if (!classData) return null;

  const totalHours = Math.round(classData.estimated_total_minutes / 60);

  return (
    <div className="min-h-screen bg-black pb-24 overflow-hidden">
      {/* Animated background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-[#FAD961]/10 rounded-full blur-3xl animate-pulse-glow" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#F76B1C]/10 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-5 pt-12">
        {/* Success Header */}
        <div className="text-center space-y-4 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="w-20 h-20 rounded-full mx-auto flex items-center justify-center animate-bounce" 
            style={{ background: 'linear-gradient(135deg, #FAD961 0%, #F76B1C 100%)' }}>
            <CheckCircle2 className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-black text-white">
            Your class is ready! 🎉
          </h1>
          <p className="text-[#BFBFBF] text-lg">
            Gemini AI analyzed your syllabus and created your personalized study plan
          </p>
        </div>

        {/* Class Name Card */}
        <div className="rounded-3xl p-6 mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700" 
          style={{ 
            background: 'linear-gradient(135deg, rgba(250, 217, 97, 0.1) 0%, rgba(247, 107, 28, 0.1) 100%)',
            border: '2px solid rgba(250, 217, 97, 0.2)'
          }}>
          <div className="flex items-center gap-3 mb-2">
            <Brain className="w-6 h-6 text-[#FAD961]" />
            <h2 className="text-2xl font-black text-white">{classData.name}</h2>
          </div>
          <p className="text-[#BFBFBF] flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Total course workload: ~{totalHours} hours
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700" style={{ animationDelay: '100ms' }}>
          <div className="rounded-2xl p-5 space-y-2" style={{ background: '#141414' }}>
            <div className="flex items-center gap-2 text-[#888888]">
              <BookOpen className="w-4 h-4" />
              <span className="text-sm font-semibold">Topics</span>
            </div>
            <div className="text-3xl font-black text-white">{topics.length}</div>
          </div>

          <div className="rounded-2xl p-5 space-y-2" style={{ background: '#141414' }}>
            <div className="flex items-center gap-2 text-[#888888]">
              <Target className="w-4 h-4" />
              <span className="text-sm font-semibold">Assignments</span>
            </div>
            <div className="text-3xl font-black text-white">{assignments.length}</div>
          </div>

          <div className="rounded-2xl p-5 space-y-2 col-span-2" style={{ background: '#141414' }}>
            <div className="flex items-center gap-2 text-[#888888]">
              <Calendar className="w-4 h-4" />
              <span className="text-sm font-semibold">Study Blocks Created</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-black text-white">{blockStats.total}</div>
              <div className="text-sm text-[#888888] space-y-1">
                <div>🎓 {blockStats.classMeetings} class meetings</div>
                <div>📚 {blockStats.studySessions} study sessions</div>
              </div>
            </div>
          </div>
        </div>

        {/* Topics Preview */}
        {topics.length > 0 && (
          <div className="space-y-3 mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700" style={{ animationDelay: '200ms' }}>
            <div className="flex items-center justify-between">
              <h3 className="text-white font-bold text-lg flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#FAD961]" />
                Topics Covered
              </h3>
              <span className="text-[#888888] text-sm">First {Math.min(3, topics.length)} shown</span>
            </div>
            <div className="space-y-2">
              {topics.slice(0, 3).map((topic, index) => (
                <div 
                  key={topic.id} 
                  className="rounded-2xl p-4 flex items-center justify-between animate-in fade-in slide-in-from-left-4"
                  style={{ 
                    background: '#141414',
                    animationDelay: `${300 + (index * 100)}ms`
                  }}
                >
                  <div className="flex-1">
                    <div className="text-white font-semibold">{topic.title}</div>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" 
                    style={{ background: 'rgba(250, 217, 97, 0.1)', border: '1px solid rgba(250, 217, 97, 0.3)' }}>
                    <Clock className="w-3 h-3 text-[#FAD961]" />
                    <span className="text-xs font-bold text-[#FAD961]">{topic.estimated_minutes}m</span>
                  </div>
                </div>
              ))}
              {topics.length > 3 && (
                <div className="text-center text-[#888888] text-sm">
                  + {topics.length - 3} more topics
                </div>
              )}
            </div>
          </div>
        )}

        {/* Assignments Preview */}
        {assignments.length > 0 && (
          <div className="space-y-3 mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700" style={{ animationDelay: '300ms' }}>
            <div className="flex items-center justify-between">
              <h3 className="text-white font-bold text-lg flex items-center gap-2">
                <Target className="w-5 h-5 text-[#F76B1C]" />
                Upcoming Assignments
              </h3>
              <span className="text-[#888888] text-sm">Next {Math.min(3, assignments.length)} shown</span>
            </div>
            <div className="space-y-2">
              {assignments.slice(0, 3).map((assignment, index) => (
                <div 
                  key={assignment.id} 
                  className="rounded-2xl p-4 flex items-start gap-3 animate-in fade-in slide-in-from-left-4"
                  style={{ 
                    background: '#141414',
                    animationDelay: `${400 + (index * 100)}ms`
                  }}
                >
                  <span className="text-2xl">{getTypeEmoji(assignment.type)}</span>
                  <div className="flex-1">
                    <div className="text-white font-semibold mb-1">{assignment.title}</div>
                    <div className="flex items-center gap-2 text-sm text-[#888888]">
                      {assignment.due_date && (
                        <span>Due {new Date(assignment.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                      )}
                      <span>•</span>
                      <span>~{assignment.estimated_minutes}m</span>
                    </div>
                  </div>
                </div>
              ))}
              {assignments.length > 3 && (
                <div className="text-center text-[#888888] text-sm">
                  + {assignments.length - 3} more assignments
                </div>
              )}
            </div>
          </div>
        )}

        {/* CTA Buttons */}
        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-700" style={{ animationDelay: '500ms' }}>
          <Button
            onClick={() => navigate(`/class/${classId}`)}
            className="w-full h-16 text-lg font-bold rounded-3xl hover-scale"
            style={{
              background: 'linear-gradient(135deg, #FAD961 0%, #F76B1C 100%)',
              boxShadow: '0 8px 24px rgba(247, 107, 28, 0.4)'
            }}
          >
            View Full Class Details →
          </Button>

          <Button
            onClick={() => navigate('/calendar')}
            variant="outline"
            className="w-full h-14 text-base font-semibold rounded-3xl border-2 hover-scale"
            style={{
              background: '#141414',
              borderColor: 'rgba(250, 217, 97, 0.3)',
              color: 'white'
            }}
          >
            <Calendar className="w-4 h-4 mr-2" />
            View Study Calendar
          </Button>

          <button
            onClick={() => navigate('/dashboard')}
            className="w-full text-[#888888] text-sm py-2 hover:text-white transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClassesReady;
