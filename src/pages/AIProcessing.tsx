import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { Loader2 } from 'lucide-react';

const messages = [
  'Reading your syllabus…',
  'Finding assignments…',
  'Estimating study time…',
];

const AIProcessing = () => {
  const navigate = useNavigate();
  const { classId } = useParams();
  const { state, updateClass } = useOnboarding();
  const [currentMessage, setCurrentMessage] = useState(0);

  const classItem = state.classes.find(c => c.id === classId);

  useEffect(() => {
    const messageInterval = setInterval(() => {
      setCurrentMessage(prev => (prev + 1) % messages.length);
    }, 1000);

    const timer = setTimeout(() => {
      // Mock AI processing results
      const mockAssignments = [
        { id: '1', name: 'Reading 1', estimatedTime: 45 },
        { id: '2', name: 'Quiz 1', estimatedTime: 60 },
        { id: '3', name: 'Lab prep', estimatedTime: 90 },
      ];

      updateClass(classId!, {
        syllabusUploaded: true,
        assignments: mockAssignments,
      });

      navigate(`/assignment-summary/${classId}`);
    }, 3000);

    return () => {
      clearInterval(messageInterval);
      clearTimeout(timer);
    };
  }, [classId, navigate, updateClass]);

  if (!classItem) return null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="text-center space-y-8 animate-in fade-in duration-500">
        <div className="relative">
          <div className="mx-auto h-24 w-24 animate-spin">
            <Loader2 className="h-24 w-24 text-primary" />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-foreground">
            Processing {classItem.name}
          </h2>
          <p className="text-xl text-muted-foreground animate-pulse">
            {messages[currentMessage]}
          </p>
        </div>
      </div>
    </div>
  );
};

export default AIProcessing;
