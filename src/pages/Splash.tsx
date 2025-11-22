import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Splash = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/account-setup');
    }, 2000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-hero opacity-50" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent" />
      
      <div className="relative z-10 text-center space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="relative inline-block">
          <h1 className="text-7xl font-black text-gradient-primary animate-float">
            NUDGE
          </h1>
          <div className="absolute -inset-4 bg-primary/20 blur-3xl -z-10 animate-pulse-glow" />
        </div>
        <p className="text-2xl font-semibold text-foreground/90 animate-in fade-in duration-1000 delay-300">
          Let's lock in ✨
        </p>
      </div>
    </div>
  );
};

export default Splash;
