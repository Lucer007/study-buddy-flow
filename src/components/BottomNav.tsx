import { NavLink } from 'react-router-dom';
import { Home, Users, Camera, MessageCircle, User } from 'lucide-react';

const BottomNav = () => {
  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-50 pb-safe"
      style={{
        background: 'rgba(0, 0, 0, 0.95)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid #1C1C1C'
      }}
    >
      <div className="max-w-2xl mx-auto flex items-center justify-around h-20 px-4">
        
        {/* Home */}
        <NavLink
          to="/dashboard"
          className={({ isActive }) => `flex flex-col items-center justify-center gap-1 min-w-[60px] transition-colors ${
            isActive ? 'text-white' : 'text-[#888888]'
          }`}
        >
          {({ isActive }) => (
            <>
              <Home className={`w-6 h-6 ${isActive ? 'fill-white' : ''}`} />
              <span className="text-xs font-medium">Home</span>
            </>
          )}
        </NavLink>

        {/* Buddies */}
        <NavLink
          to="/buddies"
          className={({ isActive }) => `flex flex-col items-center justify-center gap-1 min-w-[60px] transition-colors ${
            isActive ? 'text-white' : 'text-[#888888]'
          }`}
        >
          {({ isActive }) => (
            <>
              <Users className={`w-6 h-6 ${isActive ? 'fill-white' : ''}`} />
              <span className="text-xs font-medium">Buddies</span>
            </>
          )}
        </NavLink>

        {/* Camera - Special */}
        <NavLink
          to="/nudge-camera"
          className="flex flex-col items-center justify-center -mt-6"
        >
          <div 
            className="w-14 h-14 rounded-full flex items-center justify-center hover-scale"
            style={{
              background: 'linear-gradient(135deg, #FAD961 0%, #F76B1C 100%)',
              boxShadow: '0 8px 24px rgba(247, 107, 28, 0.4)'
            }}
          >
            <Camera className="w-7 h-7 text-white" />
          </div>
        </NavLink>

        {/* Chat */}
        <NavLink
          to="/chat"
          className={({ isActive }) => `flex flex-col items-center justify-center gap-1 min-w-[60px] transition-colors ${
            isActive ? 'text-white' : 'text-[#888888]'
          }`}
        >
          {({ isActive }) => (
            <>
              <MessageCircle className={`w-6 h-6 ${isActive ? 'fill-white' : ''}`} />
              <span className="text-xs font-medium">Chat</span>
            </>
          )}
        </NavLink>

        {/* Profile */}
        <NavLink
          to="/profile"
          className={({ isActive }) => `flex flex-col items-center justify-center gap-1 min-w-[60px] transition-colors ${
            isActive ? 'text-white' : 'text-[#888888]'
          }`}
        >
          {({ isActive }) => (
            <>
              <User className={`w-6 h-6 ${isActive ? 'fill-white' : ''}`} />
              <span className="text-xs font-medium">Profile</span>
            </>
          )}
        </NavLink>

      </div>
    </nav>
  );
};

export default BottomNav;
