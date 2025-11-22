import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useOnboarding } from '@/contexts/OnboardingContext';

const timeOptions = [
  { emoji: '😌', label: '1–2 hours', value: '1-2' },
  { emoji: '😊', label: '2–3 hours', value: '2-3' },
  { emoji: '💪', label: '3–4 hours', value: '3-4' },
];

const WeekdayStudyTime = () => {
  const navigate = useNavigate();
  const { setWeekdayHours } = useOnboarding();

  const handleSelect = (value: string) => {
    setWeekdayHours(value);
    navigate('/weekend-time');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6 relative overflow-hidden">
      {/* Decorative gradient */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />
      
      <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 relative z-10">
        <div className="text-center space-y-4">
          <div className="text-6xl animate-float">💛</div>
          <h1 className="text-4xl font-black text-foreground leading-tight">
            Let's get a sense of your schedule
          </h1>
          <p className="text-lg text-muted-foreground font-medium">
            How much study time usually feels doable on weekdays?
          </p>
        </div>

        <div className="space-y-4">
          {timeOptions.map((option, index) => (
            <Button
              key={option.value}
              onClick={() => handleSelect(option.value)}
              className={`
                w-full h-24 text-xl font-bold
                bg-gradient-to-br hover:scale-[1.02] active:scale-[0.98]
                transition-all duration-200 rounded-3xl
                ${index === 0 ? 'from-accent/90 to-accent hover:from-accent hover:to-accent/90' : ''}
                ${index === 1 ? 'from-primary/90 to-primary hover:from-primary hover:to-primary/90' : ''}
                ${index === 2 ? 'from-secondary/90 to-secondary hover:from-secondary hover:to-secondary/90' : ''}
                shadow-lg
              `}
              variant="outline"
              size="lg"
            >
              <div className="flex items-center justify-center gap-4">
                <span className="text-4xl">{option.emoji}</span>
                <span className="text-left">
                  <div className="font-black">{option.label}</div>
                </span>
              </div>
            </Button>
          ))}
        </div>
        
        <p className="text-center text-sm text-muted-foreground font-medium pt-4">
          No pressure — this just helps us plan 💫
        </p>
      </div>
    </div>
  );
};

export default WeekdayStudyTime;
