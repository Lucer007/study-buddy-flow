import { MessageCircle } from 'lucide-react';

const Chat = () => {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-5 pb-24">
      <div className="text-center space-y-6 max-w-md">
        <div className="text-6xl mb-4">💬</div>
        <h1 className="text-white text-3xl font-bold">Chat Coming Soon</h1>
        <p className="text-[#BFBFBF] text-lg">
          Direct messages with your study buddies will be available soon!
        </p>
        <div className="pt-8">
          <MessageCircle className="h-20 w-20 mx-auto text-[#888888] opacity-30" />
        </div>
      </div>
    </div>
  );
};

export default Chat;
