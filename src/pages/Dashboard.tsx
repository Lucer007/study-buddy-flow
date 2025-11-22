import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { Check, Upload } from 'lucide-react';

const Dashboard = () => {
  const navigate = useNavigate();
  const { state } = useOnboarding();

  const handleClassClick = (classId: string) => {
    navigate(`/class/${classId}`);
  };

  const allClassesCompleted = state.classes.every(c => c.syllabusUploaded);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-bold text-foreground">Your Classes</h1>
          <p className="text-lg text-muted-foreground">
            Tap a class to upload its syllabus
          </p>
        </div>

        <div className="grid gap-4">
          {state.classes.map((classItem) => (
            <button
              key={classItem.id}
              onClick={() => handleClassClick(classItem.id)}
              className="w-full bg-card border border-border rounded-xl p-6 hover:border-primary transition-all duration-200 hover:shadow-lg text-left group"
            >
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="text-2xl font-bold text-foreground group-hover:text-primary transition-colors">
                    {classItem.name}
                  </h3>
                  <p className="text-muted-foreground flex items-center gap-2">
                    {classItem.syllabusUploaded ? (
                      <>
                        <Check className="h-4 w-4 text-primary" />
                        Syllabus uploaded
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        Upload syllabus
                      </>
                    )}
                  </p>
                </div>
                {classItem.syllabusUploaded && (
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Check className="h-6 w-6 text-primary" />
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>

        {allClassesCompleted && (
          <Button
            onClick={() => navigate('/home')}
            className="w-full h-14 text-lg font-semibold"
            size="lg"
          >
            Continue to Home →
          </Button>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
