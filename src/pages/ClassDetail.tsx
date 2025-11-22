import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Upload, FileText, Loader2, ArrowLeft, Flame, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import ClassCompletionModal from '@/components/ClassCompletionModal';

interface ClassData {
  id: string;
  name: string;
  progress_percentage: number;
  streak: number;
  last_studied_date: string | null;
  syllabus_url: string | null;
}

interface StudySession {
  id: string;
  minutes_studied: number;
  completed_at: string;
  created_at: string;
}

interface Assignment {
  id: string;
  title: string;
  due_date: string | null;
  estimated_minutes: number | null;
}

const ClassDetail = () => {
  const navigate = useNavigate();
  const { classId } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [classData, setClassData] = useState<ClassData | null>(null);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showCompletion, setShowCompletion] = useState(false);
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
      // Load class data
      const { data: classInfo, error: classError } = await supabase
        .from('classes')
        .select('*')
        .eq('id', classId)
        .eq('user_id', user.id)
        .single();

      if (classError) throw classError;
      setClassData(classInfo);

      // Load study sessions
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('study_sessions')
        .select('*')
        .eq('class_id', classId)
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false })
        .limit(10);

      if (sessionsError) throw sessionsError;
      setSessions(sessionsData || []);

      // Load assignments
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('assignments')
        .select('*')
        .eq('class_id', classId)
        .eq('user_id', user.id)
        .order('due_date', { ascending: true });

      if (assignmentsError) throw assignmentsError;
      setAssignments(assignmentsData || []);

      // Check if class is 100% complete and show celebration
      if (classInfo.progress_percentage === 100 && !hasShownCompletion) {
        setShowCompletion(true);
        setHasShownCompletion(true);
      }

    } catch (error: any) {
      toast({
        title: "Failed to load class",
        description: error.message,
        variant: "destructive",
      });
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !classId) return;

    if (file.type !== 'application/pdf') {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF file",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "PDF must be less than 20MB",
        variant: "destructive",
      });
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

      // Get storage path for edge function
      const { data: { publicUrl } } = supabase.storage
        .from('syllabi')
        .getPublicUrl(fileName);

      // Update class with syllabus URL
      await supabase
        .from('classes')
        .update({ syllabus_url: publicUrl })
        .eq('id', classId);

      setUploadProgress(50);

      toast({
        title: "Parsing syllabus...",
        description: "AI is extracting topics and assignments",
      });

      // Call edge function to parse with AI
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
        toast({
          title: "Parsing failed",
          description: parseError.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success! ✨",
          description: `Found ${parseData.topicsCount} topics and ${parseData.assignmentsCount} assignments`,
        });
      }

      await loadClassData();
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setUploadProgress(0);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin" />
      </div>
    );
  }

  if (!classData) return null;

  // Calculate total minutes studied for this class
  const totalMinutesStudied = sessions.reduce((sum, s) => sum + s.minutes_studied, 0);

  return (
    <>
      {/* Completion Modal */}
      <ClassCompletionModal
        isOpen={showCompletion}
        onClose={() => setShowCompletion(false)}
        className={classData.name}
        totalMinutes={totalMinutesStudied}
      />

      <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-3 p-4">
          <button onClick={() => navigate('/profile')} className="hover-scale">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">{classData.name}</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-5 pt-6 space-y-6">
        {/* Progress Card */}
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-lg">📊 Progress</h2>
            {classData.streak > 0 && (
              <div className="flex items-center gap-1 bg-gradient-to-r from-orange-500/20 to-red-500/20 px-3 py-2 rounded-full">
                <Flame className="w-5 h-5 text-orange-500" />
                <span className="font-bold">{classData.streak}-day streak</span>
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Through study plan</span>
              <span className="font-bold text-lg">{classData.progress_percentage}%</span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-500"
                style={{ width: `${classData.progress_percentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Completed Sessions */}
        {sessions.length > 0 && (
          <div className="space-y-3">
            <h2 className="font-bold text-lg">✅ Completed Sessions</h2>
            <div className="space-y-2">
              {sessions.map((session) => (
                <div key={session.id} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <div className="font-medium">{formatDate(session.completed_at)}</div>
                    <div className="text-sm text-muted-foreground">{session.minutes_studied} minutes</div>
                  </div>
                  <div className="text-2xl">✨</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Assignments */}
        {assignments.length > 0 && (
          <div className="space-y-3">
            <h2 className="font-bold text-lg">📝 Upcoming AI Plan</h2>
            <div className="space-y-2">
              {assignments.slice(0, 5).map((assignment) => (
                <div key={assignment.id} className="bg-card border border-border rounded-xl p-4">
                  <div className="font-medium mb-1">{assignment.title}</div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {assignment.due_date && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>Due {formatDate(assignment.due_date)}</span>
                      </div>
                    )}
                    {assignment.estimated_minutes && (
                      <span>Suggested: {assignment.estimated_minutes} min</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upload Syllabus */}
        {!classData.syllabus_url && (
          <div className="space-y-3">
            <h2 className="font-bold text-lg">📄 Upload Syllabus</h2>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="w-full h-14 bg-gradient-to-r from-primary to-secondary hover:opacity-90"
            >
              {isProcessing ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Processing... {uploadProgress}%</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  <span>Upload PDF or Word Doc</span>
                </div>
              )}
            </Button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button
            onClick={() => navigate('/nudge-camera')}
            className="w-full h-14 bg-gradient-to-r from-orange-500 to-red-500 hover:opacity-90 font-bold"
          >
            Start Nudge 📸
          </Button>
        </div>
      </div>
      </div>
    </>
  );
};

export default ClassDetail;
