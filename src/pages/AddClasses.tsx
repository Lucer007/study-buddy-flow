import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { X } from 'lucide-react';

const AddClasses = () => {
  const navigate = useNavigate();
  const { state, addClass, removeClass } = useOnboarding();
  const [inputValue, setInputValue] = useState('');

  const handleAddClass = () => {
    if (inputValue.trim()) {
      addClass(inputValue.trim());
      setInputValue('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddClass();
    }
  };

  const handleContinue = () => {
    if (state.classes.length > 0) {
      navigate('/dashboard');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-bold text-foreground">
            Add your classes for this semester 🎓
          </h1>
          <p className="text-lg text-muted-foreground">
            This helps Nudge stay organized for you.
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Class name (ex: BIO101)"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              className="h-12 text-lg"
            />
            <Button onClick={handleAddClass} className="h-12 px-6" size="lg">
              Add Class
            </Button>
          </div>

          {state.classes.length > 0 && (
            <div className="space-y-2">
              {state.classes.map((classItem) => (
                <div
                  key={classItem.id}
                  className="flex items-center justify-between bg-card border border-border rounded-lg px-4 py-3"
                >
                  <span className="font-medium text-foreground">{classItem.name}</span>
                  <Button
                    onClick={() => removeClass(classItem.id)}
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <Button
          onClick={handleContinue}
          disabled={state.classes.length === 0}
          className="w-full h-14 text-lg font-semibold"
          size="lg"
        >
          Continue →
        </Button>
      </div>
    </div>
  );
};

export default AddClasses;
