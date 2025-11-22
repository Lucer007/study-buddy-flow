import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { Upload, FileText } from 'lucide-react';

const ClassDetail = () => {
  const navigate = useNavigate();
  const { classId } = useParams();
  const { state, updateClass } = useOnboarding();
  const [isProcessing, setIsProcessing] = useState(false);

  const classItem = state.classes.find(c => c.id === classId);

  if (!classItem) {
    navigate('/dashboard');
    return null;
  }

  const handleUpload = () => {
    setIsProcessing(true);
    // Simulate file upload
    setTimeout(() => {
      navigate(`/ai-processing/${classId}`);
    }, 500);
  };

  const handleSkip = () => {
    updateClass(classId!, { syllabusUploaded: true });
    navigate('/dashboard');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="text-center space-y-3">
          <div className="mx-auto w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
            <FileText className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">
            Upload syllabus for {classItem.name} 📄
          </h1>
          <p className="text-lg text-muted-foreground">
            This helps us create your personalized study plan
          </p>
        </div>

        <div className="space-y-4">
          <Button
            onClick={handleUpload}
            disabled={isProcessing}
            className="w-full h-16 text-lg font-semibold flex items-center justify-center gap-3"
            size="lg"
          >
            <Upload className="h-5 w-5" />
            Upload PDF
          </Button>

          <Button
            onClick={handleSkip}
            variant="outline"
            className="w-full h-14 text-lg font-semibold"
            size="lg"
          >
            Skip for now
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ClassDetail;
