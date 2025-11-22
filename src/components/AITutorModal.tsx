import { useState, useRef, useEffect } from 'react';
import { X, Send, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AITutorModalProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
  assignmentTitle?: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const AITutorModal = ({ isOpen, onClose, className, assignmentTitle }: AITutorModalProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const quickActions = [
    { label: 'Summarize this section', emoji: '📝' },
    { label: 'Explain key concepts', emoji: '💡' },
    { label: 'Quiz me', emoji: '🎯' },
    { label: 'Make flashcards', emoji: '📇' }
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: text };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('chat-tutor', {
        body: { 
          messages: [...messages, userMessage],
          context: assignmentTitle || 'general study help'
        }
      });

      if (error) throw error;

      if (data?.response) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
      }
    } catch (error: any) {
      console.error('AI Tutor error:', error);
      toast({
        title: "Failed to get response",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end"
      style={{ background: 'rgba(0, 0, 0, 0.8)' }}
      onClick={onClose}
    >
      <div 
        className="w-full max-w-2xl mx-auto rounded-t-3xl flex flex-col max-h-[80vh]"
        style={{ background: '#0A0A0A' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#1C1C1C]">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #A16CFF 0%, #FF6F9C 100%)'
              }}
            >
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg">AI Tutor</h2>
              {assignmentTitle && (
                <p className="text-[#888888] text-xs">{assignmentTitle}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#1C1C1C] flex items-center justify-center hover-scale"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-8 space-y-4">
              <p className="text-white text-lg font-semibold">Need a quick boost?</p>
              <p className="text-[#888888] text-sm">Ask me anything about your study material</p>
              
              <div className="grid grid-cols-2 gap-2 pt-4">
                {quickActions.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => sendMessage(action.label)}
                    className="p-3 rounded-2xl text-left hover-scale"
                    style={{ background: '#141414' }}
                  >
                    <div className="text-2xl mb-1">{action.emoji}</div>
                    <div className="text-white text-sm font-medium">{action.label}</div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    msg.role === 'user'
                      ? 'text-white'
                      : 'bg-[#141414] text-white'
                  }`}
                  style={msg.role === 'user' ? {
                    background: 'linear-gradient(135deg, #A16CFF 0%, #FF6F9C 100%)'
                  } : {}}
                >
                  {msg.content}
                </div>
              </div>
            ))
          )}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-[#141414] rounded-2xl px-4 py-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-[#888888] animate-pulse" />
                  <div className="w-2 h-2 rounded-full bg-[#888888] animate-pulse" style={{ animationDelay: '0.2s' }} />
                  <div className="w-2 h-2 rounded-full bg-[#888888] animate-pulse" style={{ animationDelay: '0.4s' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-5 border-t border-[#1C1C1C]">
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage(input)}
              placeholder="Ask Nudge anything..."
              className="flex-1 bg-[#141414] rounded-full px-5 py-3 text-white placeholder-[#888888] focus:outline-none focus:ring-2 focus:ring-purple-500"
              disabled={isLoading}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isLoading}
              className="w-12 h-12 rounded-full flex items-center justify-center hover-scale disabled:opacity-50"
              style={{
                background: 'linear-gradient(135deg, #A16CFF 0%, #FF6F9C 100%)'
              }}
            >
              <Send className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AITutorModal;
