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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary via-accent to-secondary animate-in fade-in duration-700">
      <div className="text-center animate-in zoom-in duration-500">
        <h1 className="text-7xl font-bold text-primary-foreground mb-4">NUDGE</h1>
        <p className="text-2xl text-primary-foreground/90">Let's lock in ✨</p>
      </div>
    </div>
  );
};

export default Splash;
