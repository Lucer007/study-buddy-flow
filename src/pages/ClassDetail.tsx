import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Upload, Loader2, ArrowLeft, Flame, Calendar, Sparkles, Brain, Target, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import ClassCompletionModal from '@/components/ClassCompletionModal';
import { ClassAIChat } from '@/components/ClassAIChat';

interface ClassData {
  id: string;
  name: string;
  progress_percentage: number;
  streak: number;
  last_studied_date: string | null;
  syllabus_url: string | null;
  ai_parsed: boolean;
  estimated_total_minutes: number;
  estimated_remaining_minutes: number;
}

interface SyllabusTopic {
  id: string;
  title: string;
  description: string | null;
  estimated_minutes: number;
  order_index: number;
}

interface SyllabusAssignment {
  id: string;
  title: string;
  type: string;
  due_date: string | null;
  estimated_minutes: number;
}

interface StudyBlock {
  id: string;
  block_date: string;
  start_time: string | null;
  duration_minutes: number;
}

const ClassDetail = () => {
  const navigate = useNavigate();
  const { classId } = useParams();
  const { user } = useAuth();
  const [classData, setClassData] = useState<ClassData | null>(null);
  const [topics, setTopics] = useState<SyllabusTopic[]>([]);
  const [assignments, setAssignments] = useState<SyllabusAssignment[]>([]);
  const [studyBlocks, setStudyBlocks] = useState<StudyBlock[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showCompletion, setShowCompletion] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const [hasShownCompletion, setHasShownCompletion] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user && classId) {
      loadClassData();
    }
  }, [user, classId]);

  const loadClassData = async () => {
    if (!user || !classId) return;
    
    try {
      const { data: classInfo, error: classError } = await supabase
        .from('classes')
        .select('*')
        .eq('id', classId)
        .eq('user_id', user.id)
        .single();

      if (classError) throw classError;
      setClassData(classInfo);

      // Load syllabus topics if AI parsed
      if (classInfo.ai_parsed) {
        const { data: topicsData } = await supabase
          .from('syllabus_topics')
          .select('*')
          .eq('class_id', classId)
          .order('order_index');
        setTopics(topicsData || []);

        const { data: assignmentsData } = await supabase
          .from('syllabus_assignments')
          .select('*')
          .eq('class_id', classId)
          .order('due_date');
        setAssignments(assignmentsData || []);

        const { data: blocksData } = await supabase
          .from('study_blocks')
          .select('*')
          .eq('class_id', classId)
          .eq('user_id', user.id)
          .order('block_date')
          .limit(5);
        setStudyBlocks(blocksData || []);
      }

      if (classInfo.progress_percentage === 100 && !hasShownCompletion) {
        setShowCompletion(true);
        setHasShownCompletion(true);
      }

    } catch (error: any) {
      toast.error('Failed to load class');
      navigate('/profile');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !classId) return;

    if (file.type !== 'application/pdf') {
      toast.error('Please upload a PDF file');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      toast.error('PDF must be less than 20MB');
      return;
    }

    setIsProcessing(true);
    setUploadProgress(0);

    try {
      const fileName = `${user.id}/${classId}.pdf`;
      setUploadProgress(20);

      const { error: uploadError } = await supabase.storage
        .from('syllabi')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;
      setUploadProgress(40);

      const { data: { publicUrl } } = supabase.storage
        .from('syllabi')
        .getPublicUrl(fileName);

      await supabase
        .from('classes')
        .update({ syllabus_url: publicUrl })
        .eq('id', classId)
        .eq('user_id', user.id);

      setUploadProgress(50);

      toast.info('AI is parsing your syllabus... ⏳');

      const { data: parseData, error: parseError } = await supabase.functions.invoke('parse-syllabus', {
        body: {
          syllabusUrl: fileName,
          classId,
          userId: user.id,
          weekdayHours: 2,
          weekendHours: 3,
        },
      });

      setUploadProgress(100);

      if (parseError) {
        console.error('Parse error:', parseError);
        toast.error('Syllabus parsing failed');
      } else {
        // Navigate to classes ready page with summary
        navigate(`/classes-ready?classId=${classId}`);
        return;
      }

      await loadClassData();
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error('Upload failed');
    } finally {
      setIsProcessing(false);
      setUploadProgress(0);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!classData) return null;

  return (
    <>
      <ClassCompletionModal
        isOpen={showCompletion}
        onClose={() => setShowCompletion(false)}
        className={classData.name}
        totalMinutes={0}
      />

      {showAIChat && (
        <ClassAIChat
          classId={classId!}
          className={classData.name}
          onClose={() => setShowAIChat(false)}
        />
      )}

      <div className="min-h-screen bg-background pb-24">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border">
          <div className="flex items-center justify-between p-4 max-w-4xl mx-auto">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/profile')} className="hover-scale">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-black">{classData.name}</h1>
                {classData.ai_parsed && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    AI-powered study plan
                  </p>
                )}
              </div>
            </div>
            {classData.ai_parsed && (
              <Button 
                onClick={() => setShowAIChat(true)}
                className="bg-gradient-neon gap-2"
                size="sm"
              >
                <Brain className="w-4 h-4" />
                Ask Gemini
              </Button>
            )}
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 pt-6 space-y-6">
          {/* Progress Card */}
          <div className="bg-card border-2 border-neon-cyan/20 rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-black text-lg flex items-center gap-2">
                <Target className="w-5 h-5 text-neon-cyan" />
                Progress
              </h2>
              {classData.streak > 0 && (
                <div className="flex items-center gap-1.5 bg-gradient-to-r from-orange-500/20 to-red-500/20 px-4 py-2 rounded-full border border-orange-500/30">
                  <Flame className="w-5 h-5 text-orange-500" />
                  <span className="font-bold">{classData.streak} day streak</span>
                </div>
              )}
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Course completion</span>
                <span className="font-black text-2xl text-neon-cyan">{classData.progress_percentage}%</span>
              </div>
              <div className="h-4 bg-muted rounded-full overflow-hidden border border-border">
                <div 
                  className="h-full bg-gradient-progress transition-all duration-500"
                  style={{ width: `${classData.progress_percentage}%` }}
                />
              </div>
              {classData.ai_parsed && classData.estimated_remaining_minutes > 0 && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>~{Math.round(classData.estimated_remaining_minutes / 60)}h remaining • {Math.round(classData.estimated_total_minutes / 60)}h total</span>
                </div>
              )}
            </div>
          </div>

          {/* Syllabus Topics */}
          {classData.ai_parsed && topics.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-black text-lg flex items-center gap-2">
                  <Brain className="w-5 h-5 text-neon-lime" />
                  Topics Covered
                </h2>
                <span className="text-sm text-muted-foreground">{topics.length} topics</span>
              </div>
              <div className="grid gap-3">
                {topics.map((topic) => (
                  <div key={topic.id} className="bg-card border border-border rounded-2xl p-4 hover:border-neon-lime/30 transition-all">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <h3 className="font-bold mb-1">{topic.title}</h3>
                        {topic.description && (
                          <p className="text-sm text-muted-foreground">{topic.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 bg-neon-lime/10 px-3 py-1.5 rounded-full border border-neon-lime/30">
                        <Clock className="w-3 h-3 text-neon-lime" />
                        <span className="text-xs font-bold text-neon-lime">{topic.estimated_minutes}m</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Assignments */}
          {classData.ai_parsed && assignments.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-black text-lg flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-neon-cyan" />
                  Assignments & Deadlines
                </h2>
                <span className="text-sm text-muted-foreground">{assignments.length} items</span>
              </div>
              <div className="grid gap-3">
                {assignments.map((assignment) => (
                  <div key={assignment.id} className="bg-card border border-border rounded-2xl p-4 hover:border-neon-cyan/30 transition-all">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1">
                        <span className="text-2xl">{getTypeEmoji(assignment.type)}</span>
                        <div>
                          <h3 className="font-bold mb-1">{assignment.title}</h3>
                          <div className="flex flex-wrap items-center gap-3 text-sm">
                            {assignment.due_date && (
                              <div className="flex items-center gap-1.5 text-muted-foreground">
                                <Calendar className="w-3 h-3" />
                                <span>Due {formatDate(assignment.due_date)}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1.5 bg-neon-cyan/10 px-2 py-1 rounded-full border border-neon-cyan/30">
                              <Clock className="w-3 h-3 text-neon-cyan" />
                              <span className="text-xs font-bold text-neon-cyan">~{assignment.estimated_minutes}m</span>
                            </div>
                            <span className="text-xs px-2 py-1 bg-secondary/10 text-secondary rounded-full font-bold uppercase">
                              {assignment.type}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upcoming Study Blocks */}
          {classData.ai_parsed && studyBlocks.length > 0 && (
            <div className="space-y-4">
              <h2 className="font-black text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5 text-neon-teal" />
                Upcoming Study Blocks
              </h2>
              <div className="grid gap-3">
                {studyBlocks.map((block) => (
                  <div key={block.id} className="bg-card border border-border rounded-2xl p-4 flex items-center justify-between">
                    <div>
                      <div className="font-bold">{formatDate(block.block_date)}</div>
                      <div className="text-sm text-muted-foreground">
                        {block.start_time || 'Flexible timing'} • {block.duration_minutes} minutes
                      </div>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-gradient-neon flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload Syllabus */}
          {!classData.ai_parsed && (
            <div className="space-y-4 bg-gradient-to-br from-neon-cyan/5 to-neon-lime/5 border-2 border-neon-cyan/20 rounded-3xl p-6">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 rounded-full bg-gradient-neon mx-auto flex items-center justify-center mb-4">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <h2 className="font-black text-xl">🧠 AI-Powered Study Plan</h2>
                <p className="text-muted-foreground">
                  Upload your syllabus and let Gemini AI create a personalized study plan with topics, assignments, and time estimates
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="w-full h-14 bg-gradient-neon font-bold text-lg"
              >
                {isProcessing ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Processing... {uploadProgress}%</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    <span>Upload Syllabus PDF</span>
                  </div>
                )}
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                Powered by Google Gemini Vision AI
              </p>
            </div>
          )}

          {/* Action Button */}
          <Button
            onClick={() => navigate('/nudge-camera')}
            className="w-full h-14 bg-gradient-to-r from-orange-500 to-red-500 hover:opacity-90 font-black text-lg"
          >
            Start Study Session 📸
          </Button>
        </div>
      </div>
    </>
  );
};

export default ClassDetail;