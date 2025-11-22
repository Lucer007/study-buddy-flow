import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const AccountSetup = () => {
  const navigate = useNavigate();

  const handleContinue = () => {
    navigate('/weekday-time');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-foreground">Welcome to NUDGE</h1>
          <p className="text-muted-foreground">Choose how you'd like to continue</p>
        </div>

        <div className="space-y-4">
          <Button
            onClick={handleContinue}
            className="w-full h-14 text-lg font-semibold"
            size="lg"
          >
            Continue with Google
          </Button>

          <Button
            onClick={handleContinue}
            className="w-full h-14 text-lg font-semibold"
            variant="outline"
            size="lg"
          >
            Continue with Apple
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or</span>
            </div>
          </div>

          <Button
            onClick={handleContinue}
            className="w-full h-14 text-lg font-semibold"
            variant="secondary"
            size="lg"
          >
            Use email instead
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AccountSetup;
