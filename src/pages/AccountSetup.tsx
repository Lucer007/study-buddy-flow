import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const AccountSetup = () => {
  const navigate = useNavigate();

  const handleContinue = () => {
    navigate('/weekday-time');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6 relative overflow-hidden">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-hero opacity-30" />
      
      <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 relative z-10">
        <div className="text-center space-y-3">
          <div className="inline-block">
            <h1 className="text-5xl font-black text-gradient-primary mb-2">
              Welcome to NUDGE
            </h1>
          </div>
          <p className="text-lg text-muted-foreground font-medium">Choose how you'd like to continue</p>
        </div>

        <div className="space-y-4">
          <Button
            onClick={handleContinue}
            className="w-full h-16 text-lg font-bold bg-gradient-primary hover:opacity-90 transition-all hover-scale glow-primary rounded-3xl"
            size="lg"
          >
            <span className="flex items-center gap-3">
              ✨ Continue with Google
            </span>
          </Button>

          <Button
            onClick={handleContinue}
            className="w-full h-16 text-lg font-bold bg-card border-2 border-border hover:border-primary transition-all hover-scale rounded-3xl"
            variant="outline"
            size="lg"
          >
            <span className="flex items-center gap-3">
               Continue with Apple
            </span>
          </Button>

          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-4 text-muted-foreground font-semibold">Or</span>
            </div>
          </div>

          <Button
            onClick={handleContinue}
            className="w-full h-16 text-lg font-bold bg-secondary hover:bg-secondary/90 transition-all hover-scale glow-secondary rounded-3xl"
            size="lg"
          >
            <span className="flex items-center gap-3">
              📧 Continue with email
            </span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AccountSetup;
