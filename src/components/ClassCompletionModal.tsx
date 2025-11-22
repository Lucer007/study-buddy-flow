import { useEffect, useState } from 'react';
import Confetti from 'react-confetti';
import { Trophy, Star, PartyPopper } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWindowSize } from '@/hooks/use-window-size';

interface ClassCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  className: string;
  totalMinutes?: number;
}

const ClassCompletionModal = ({ isOpen, onClose, className, totalMinutes }: ClassCompletionModalProps) => {
  const { width, height } = useWindowSize();
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShowConfetti(true);
      // Stop confetti after 5 seconds
      const timer = setTimeout(() => {
        setShowConfetti(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Confetti */}
      {showConfetti && (
        <Confetti
          width={width}
          height={height}
          recycle={false}
          numberOfPieces={500}
          gravity={0.3}
          colors={['#FAD961', '#F76B1C', '#FFD700', '#FF6F9C', '#A16CFF']}
        />
      )}

      {/* Modal Overlay */}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
        <div className="w-full max-w-md mx-5 animate-scale-in">
          {/* Completion Badge */}
          <div className="relative">
            {/* Glow Effect */}
            <div 
              className="absolute inset-0 blur-3xl opacity-60 animate-pulse"
              style={{
                background: 'radial-gradient(circle, #FAD961 0%, #F76B1C 50%, transparent 100%)'
              }}
            />

            {/* Main Card */}
            <div 
              className="relative bg-gradient-to-br from-[#1A1A1A] to-[#0A0A0A] border-2 rounded-3xl p-8 text-center space-y-6"
              style={{
                borderImage: 'linear-gradient(135deg, #FAD961, #F76B1C) 1',
                boxShadow: '0 20px 60px rgba(247, 107, 28, 0.4)'
              }}
            >
              {/* Trophy Icon with Glow */}
              <div className="relative mx-auto w-32 h-32 flex items-center justify-center">
                <div 
                  className="absolute inset-0 rounded-full animate-pulse"
                  style={{
                    background: 'radial-gradient(circle, rgba(250, 217, 97, 0.3) 0%, transparent 70%)',
                    filter: 'blur(20px)'
                  }}
                />
                <div 
                  className="relative w-28 h-28 rounded-full flex items-center justify-center animate-float"
                  style={{
                    background: 'linear-gradient(135deg, #FAD961 0%, #F76B1C 100%)',
                    boxShadow: '0 10px 40px rgba(247, 107, 28, 0.6)'
                  }}
                >
                  <Trophy className="w-14 h-14 text-white" />
                </div>
                
                {/* Sparkle Stars */}
                <Star 
                  className="absolute top-2 right-4 w-6 h-6 text-yellow-300 animate-pulse" 
                  fill="currentColor"
                />
                <Star 
                  className="absolute bottom-4 left-2 w-5 h-5 text-yellow-300 animate-pulse" 
                  fill="currentColor"
                  style={{ animationDelay: '0.3s' }}
                />
                <PartyPopper 
                  className="absolute top-4 left-0 w-6 h-6 text-[#FF6F9C] animate-pulse"
                  style={{ animationDelay: '0.6s' }}
                />
              </div>

              {/* Text Content */}
              <div className="space-y-3">
                <h2 className="text-3xl font-black text-white leading-tight">
                  🎉 Class Complete!
                </h2>
                <p className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#FAD961] to-[#F76B1C]">
                  {className}
                </p>
                <p className="text-[#BFBFBF] text-base">
                  You crushed 100% of your study plan!
                </p>
                {totalMinutes && (
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-[#FAD961]/20 to-[#F76B1C]/20 border border-[#FAD961]/30">
                    <span className="text-2xl">⏱️</span>
                    <span className="text-white font-bold">
                      {Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m total
                    </span>
                  </div>
                )}
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-3 py-4">
                <div className="text-center">
                  <div className="text-2xl mb-1">💯</div>
                  <div className="text-xs text-[#888888]">Progress</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl mb-1">🎯</div>
                  <div className="text-xs text-[#888888]">Goal Met</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl mb-1">🏆</div>
                  <div className="text-xs text-[#888888]">Achievement</div>
                </div>
              </div>

              {/* Action Button */}
              <Button
                onClick={onClose}
                className="w-full h-14 rounded-[28px] font-bold text-lg hover-scale"
                style={{
                  background: 'linear-gradient(135deg, #FAD961 0%, #F76B1C 100%)',
                  boxShadow: '0 8px 24px rgba(247, 107, 28, 0.4)'
                }}
              >
                Keep Going! 🚀
              </Button>

              <p className="text-[#666666] text-xs">
                Ready to tackle your next class?
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ClassCompletionModal;
