import { useState } from 'react';
import { Camera, CameraResultType, CameraSource, CameraDirection } from '@capacitor/camera';
import { X, RefreshCw, Zap, ZapOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

const NudgeCamera = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [frontPhoto, setFrontPhoto] = useState<string | null>(null);
  const [backPhoto, setBackPhoto] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [currentCamera, setCurrentCamera] = useState<'front' | 'back'>('back');

  const takeDualPhoto = async () => {
    setIsCapturing(true);
    try {
      // Take back camera photo first
      const backImage = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
        direction: CameraDirection.Rear
      });
      setBackPhoto(backImage.webPath || null);

      // Short delay for better UX
      await new Promise(resolve => setTimeout(resolve, 300));

      // Take front camera photo
      const frontImage = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
        direction: CameraDirection.Front
      });
      setFrontPhoto(frontImage.webPath || null);

      toast({
        title: "📸 Nudge captured!",
        description: "Both photos taken successfully",
      });
    } catch (error) {
      console.error('Camera error:', error);
      toast({
        title: "Camera error",
        description: "Failed to capture photos. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCapturing(false);
    }
  };

  const handleRetake = () => {
    setFrontPhoto(null);
    setBackPhoto(null);
  };

  const handleSend = () => {
    // TODO: Save to feed and start lock mode
      toast({
        title: "🎯 Starting Lock Mode",
        description: "Time to lock in and study!",
      });
      navigate('/dashboard');
  };

  // Preview mode - both photos captured
  if (frontPhoto && backPhoto) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-10 pt-12 px-5 flex justify-between items-center">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center hover-scale"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Photos Layout - BeReal Style */}
        <div className="flex-1 relative">
          {/* Back photo - full screen */}
          <img 
            src={backPhoto} 
            alt="Back camera" 
            className="w-full h-full object-cover"
          />
          
          {/* Front photo - bubble overlay */}
          <div 
            className="absolute top-20 left-5 w-32 h-40 rounded-2xl overflow-hidden border-4 border-white shadow-2xl"
            style={{
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
            }}
          >
            <img 
              src={frontPhoto} 
              alt="Front camera" 
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="pb-10 px-5 space-y-3">
          <button
            onClick={handleRetake}
            className="w-full h-14 rounded-[28px] bg-[#1C1C1C] text-white font-semibold text-base hover-scale"
          >
            Retake
          </button>
          <button
            onClick={handleSend}
            className="w-full h-14 rounded-[28px] text-white font-semibold text-base hover-scale"
            style={{
              background: 'linear-gradient(135deg, #FAD961 0%, #F76B1C 100%)',
              boxShadow: '0 8px 24px rgba(247, 107, 28, 0.4)'
            }}
          >
            SEND & LOCK IN →
          </button>
        </div>
      </div>
    );
  }

  // Camera capture mode
  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 pt-12 px-5 flex justify-between items-center">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center hover-scale"
        >
          <X className="w-5 h-5 text-white" />
        </button>
        
        <div className="flex gap-3">
          <button
            onClick={() => setFlashEnabled(!flashEnabled)}
            className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center hover-scale"
          >
            {flashEnabled ? (
              <Zap className="w-5 h-5 text-yellow-400" />
            ) : (
              <ZapOff className="w-5 h-5 text-white" />
            )}
          </button>
          
          <button
            onClick={() => setCurrentCamera(currentCamera === 'front' ? 'back' : 'front')}
            className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center hover-scale"
          >
            <RefreshCw className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* Center instruction */}
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-3 px-5">
          <div className="text-5xl mb-4">📸</div>
          <h2 className="text-white text-2xl font-bold">Ready to Nudge?</h2>
          <p className="text-[#BFBFBF] text-base max-w-xs mx-auto">
            We'll capture both cameras BeReal-style to prove you're locked in
          </p>
        </div>
      </div>

      {/* Shutter Button */}
      <div className="pb-16 flex justify-center">
        <button
          onClick={takeDualPhoto}
          disabled={isCapturing}
          className="relative w-20 h-20 rounded-full hover-scale disabled:opacity-50"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.1) 100%)',
            border: '4px solid white',
            boxShadow: '0 8px 32px rgba(255, 255, 255, 0.3)',
            backdropFilter: 'blur(10px)'
          }}
        >
          <div 
            className="absolute inset-2 rounded-full"
            style={{
              background: 'white'
            }}
          />
          {isCapturing && (
            <div className="absolute inset-0 rounded-full animate-pulse bg-white/50" />
          )}
        </button>
      </div>

      {/* Info text */}
      <div className="pb-8 text-center">
        <p className="text-[#888888] text-sm">
          Tap to capture both cameras
        </p>
      </div>
    </div>
  );
};

export default NudgeCamera;
