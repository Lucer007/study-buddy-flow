import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { Calendar } from 'lucide-react';

const StudyPlan = () => {
  const navigate = useNavigate();
  const { classId } = useParams();
  const { state, updateClass } = useOnboarding();

  const classItem = state.classes.find(c => c.id === classId);

  useEffect(() => {
    // Generate mock study plan
    if (classItem && !classItem.studyPlan) {
      const mockPlan = [
        { day: 'Monday', time: '4:00 PM – 4:45 PM' },
        { day: 'Wednesday', time: '7:00 PM – 8:00 PM' },
        { day: 'Thursday', time: '3:00 PM – 3:30 PM' },
      ];

      updateClass(classId!, { studyPlan: mockPlan });
    }
  }, [classId, classItem, updateClass]);

  if (!classItem) {
    navigate('/dashboard');
    return null;
  }

  const handleAddToCalendar = () => {
    navigate('/dashboard');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="text-center space-y-3">
          <div className="mx-auto w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
            <Calendar className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">
            Your {classItem.name} Schedule
          </h1>
          <p className="text-lg text-muted-foreground">
            Based on your availability and workload
          </p>
        </div>

        <div className="space-y-3">
          {classItem.studyPlan?.map((block, index) => (
            <div
              key={index}
              className="bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 rounded-xl p-4"
            >
              <div className="flex justify-between items-center">
                <span className="font-semibold text-foreground">{block.day}</span>
                <span className="text-muted-foreground">{block.time}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <Button
            onClick={handleAddToCalendar}
            className="w-full h-14 text-lg font-semibold"
            size="lg"
          >
            Add to Calendar →
          </Button>
        </div>
      </div>
    </div>
  );
};

export default StudyPlan;
