import { useNavigate } from 'react-router-dom';
import { Bot } from 'lucide-react';

const LockMode = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-5 text-center">
      <div className="space-y-6">
        <div className="text-6xl mb-4">🔒</div>
        <h1 className="text-white text-3xl font-bold">Lock Mode</h1>
        <p className="text-[#BFBFBF] text-lg max-w-md">
          Lock Mode study timer coming soon! This will keep you locked in your study session.
        </p>
        
        <div className="pt-8 space-y-4">
          <button
            onClick={() => navigate('/feed')}
            className="w-full h-14 rounded-[28px] text-white font-semibold text-base hover-scale"
            style={{
              background: 'linear-gradient(135deg, #FAD961 0%, #F76B1C 100%)',
              boxShadow: '0 8px 24px rgba(247, 107, 28, 0.4)'
            }}
          >
            Go to Feed
          </button>
          
          <button
            onClick={() => navigate('/profile')}
            className="w-full h-14 rounded-[28px] bg-[#1C1C1C] text-white font-semibold text-base hover-scale"
          >
            Back to Profile
          </button>
        </div>

        <div className="pt-8 flex items-center justify-center gap-2 text-[#888888] text-sm">
          <Bot className="w-4 h-4" />
          <span>AI Tutor available during sessions</span>
        </div>
      </div>
    </div>
  );
};

export default LockMode;
