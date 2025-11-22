import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Clock } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ClassOption {
  id: string;
  name: string;
}

interface AssignmentOption {
  id: string;
  title: string;
  estimated_minutes: number;
}

const SessionSetup = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [assignments, setAssignments] = useState<AssignmentOption[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedAssignment, setSelectedAssignment] = useState('');
  const [duration, setDuration] = useState(45);
  const [loading, setLoading] = useState(true);
  
  const photo = searchParams.get('photo') || '';
  const durations = [25, 35, 45, 60, 90];

  useEffect(() => {
    if (user) {
      loadClasses();
    }
  }, [user]);

  useEffect(() => {
    if (selectedClass) {
      loadAssignments(selectedClass);
    }
  }, [selectedClass]);

  const loadClasses = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('classes')
        .select('id, name')
        .eq('user_id', user.id);

      if (error) throw error;
      
      setClasses(data || []);
      if (data && data.length > 0) {
        setSelectedClass(data[0].id);
      }
    } catch (error: any) {
      toast({
        title: "Failed to load classes",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAssignments = async (classId: string) => {
    try {
      const { data, error } = await supabase
        .from('assignments')
        .select('id, title, estimated_minutes')
        .eq('class_id', classId)
        .order('due_date', { ascending: true });

      if (error) throw error;
      
      setAssignments(data || []);
      if (data && data.length > 0) {
        setSelectedAssignment(data[0].id);
        setDuration(data[0].estimated_minutes || 45);
      }
    } catch (error: any) {
      console.error('Error loading assignments:', error);
      setAssignments([]);
    }
  };

  const handleStartSession = () => {
    const selectedClassData = classes.find(c => c.id === selectedClass);
    const selectedAssignmentData = assignments.find(a => a.id === selectedAssignment);
    
    const params = new URLSearchParams({
      duration: duration.toString(),
      class: selectedClassData?.name || 'Study',
      assignment: selectedAssignmentData?.title || '',
      photo: photo
    });

    navigate(`/lock-mode?${params.toString()}`);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-white text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black flex flex-col">
      <div className="flex-1 overflow-y-auto px-5 pt-12 pb-32">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-white text-3xl font-bold mb-2">What are you studying?</h1>
          <p className="text-[#888888]">Let's set up your study session</p>
        </div>

        {/* Preview */}
        <div 
          className="w-full max-w-sm mx-auto mb-8 rounded-2xl overflow-hidden"
          style={{ background: '#141414' }}
        >
          <div className="relative h-48 bg-[#0A0A0A]">
            {photo ? (
              <img src={photo} alt="Study moment" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-5xl">📚</div>
              </div>
            )}
            
            {/* Selfie bubble */}
            <div 
              className="absolute top-3 left-3 w-12 h-16 rounded-xl overflow-hidden border-2 border-white"
              style={{ background: '#1C1C1C' }}
            >
              <div className="w-full h-full flex items-center justify-center text-xl">
                😊
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="max-w-md mx-auto space-y-6">
          
          {/* Class Selection */}
          <div className="space-y-2">
            <label className="text-white text-sm font-medium">Class</label>
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="w-full bg-[#141414] border-none text-white h-12">
                <SelectValue placeholder="Select a class" />
              </SelectTrigger>
              <SelectContent className="bg-[#1C1C1C] border-[#2A2A2A]">
                {classes.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id} className="text-white focus:bg-[#2A2A2A] focus:text-white">
                    {cls.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Assignment Selection */}
          {assignments.length > 0 && (
            <div className="space-y-2">
              <label className="text-white text-sm font-medium">Assignment (optional)</label>
              <Select value={selectedAssignment} onValueChange={setSelectedAssignment}>
                <SelectTrigger className="w-full bg-[#141414] border-none text-white h-12">
                  <SelectValue placeholder="Select an assignment" />
                </SelectTrigger>
                <SelectContent className="bg-[#1C1C1C] border-[#2A2A2A]">
                  {assignments.map((assignment) => (
                    <SelectItem key={assignment.id} value={assignment.id} className="text-white focus:bg-[#2A2A2A] focus:text-white">
                      {assignment.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Duration Selection */}
          <div className="space-y-3">
            <label className="text-white text-sm font-medium flex items-center gap-2">
              <Clock className="w-4 h-4" />
              How long do you want to lock in?
            </label>
            <div className="flex gap-2 flex-wrap">
              {durations.map((dur) => (
                <button
                  key={dur}
                  onClick={() => setDuration(dur)}
                  className={`px-5 py-3 rounded-full text-sm font-medium transition-all ${
                    duration === dur
                      ? 'text-white'
                      : 'bg-[#1C1C1C] text-[#888888]'
                  }`}
                  style={duration === dur ? {
                    background: 'linear-gradient(135deg, #FAD961 0%, #F76B1C 100%)'
                  } : {}}
                >
                  {dur} min
                </button>
              ))}
            </div>
          </div>

          {/* Info Message */}
          <div 
            className="rounded-2xl p-4 flex items-start gap-3"
            style={{ background: 'rgba(161, 108, 255, 0.1)', border: '1px solid rgba(161, 108, 255, 0.2)' }}
          >
            <span className="text-xl">💡</span>
            <p className="text-[#BFBFBF] text-sm">
              Leaving early breaks your streak. No pressure—just extra motivation 😌
            </p>
          </div>

        </div>
      </div>

      {/* Bottom Button */}
      <div className="fixed bottom-0 left-0 right-0 p-5 pb-safe" style={{ background: 'rgba(0, 0, 0, 0.95)' }}>
        <button
          onClick={handleStartSession}
          disabled={!selectedClass}
          className="w-full h-14 rounded-[28px] text-white font-semibold text-base hover-scale disabled:opacity-50"
          style={{
            background: 'linear-gradient(135deg, #FAD961 0%, #F76B1C 100%)',
            boxShadow: '0 8px 24px rgba(247, 107, 28, 0.4)'
          }}
        >
          Start Study Session 🔒
        </button>
      </div>
    </div>
  );
};

export default SessionSetup;
