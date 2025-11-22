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
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-bold text-foreground">
            Let's get a sense of your schedule 💛
          </h1>
          <p className="text-lg text-muted-foreground">
            How much study time usually feels doable on weekdays?
          </p>
        </div>

        <div className="space-y-3">
          {timeOptions.map((option) => (
            <Button
              key={option.value}
              onClick={() => handleSelect(option.value)}
              className="w-full h-20 text-xl font-semibold flex items-center justify-center gap-3"
              variant="outline"
              size="lg"
            >
              <span className="text-3xl">{option.emoji}</span>
              <span>{option.label}</span>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WeekdayStudyTime;
