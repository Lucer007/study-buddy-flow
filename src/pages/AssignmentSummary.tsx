import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { Clock } from 'lucide-react';

const AssignmentSummary = () => {
  const navigate = useNavigate();
  const { classId } = useParams();
  const { state } = useOnboarding();

  const classItem = state.classes.find(c => c.id === classId);

  if (!classItem || !classItem.assignments) {
    navigate('/dashboard');
    return null;
  }

  const handleContinue = () => {
    navigate(`/study-plan/${classId}`);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-bold text-foreground">
            {classItem.name} Assignments
          </h1>
          <p className="text-lg text-muted-foreground">
            We found these in your syllabus
          </p>
        </div>

        <div className="space-y-3">
          {classItem.assignments.map((assignment) => (
            <div
              key={assignment.id}
              className="bg-card border border-border rounded-xl p-4 flex items-center justify-between"
            >
              <span className="font-medium text-foreground">{assignment.name}</span>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{assignment.estimatedTime} min</span>
              </div>
            </div>
          ))}
        </div>

        <Button
          onClick={handleContinue}
          className="w-full h-14 text-lg font-semibold"
          size="lg"
        >
          Build My {classItem.name} Plan →
        </Button>
      </div>
    </div>
  );
};

export default AssignmentSummary;
