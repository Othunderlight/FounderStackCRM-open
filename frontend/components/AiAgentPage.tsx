import React, { useState, useEffect, useRef } from 'react';
import Ai01 from '../src/components/ai-01';
import { Bot, User } from 'lucide-react';
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
}

const AiAgentPage = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSendMessage = (content: string) => {
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content };
    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const aiMsg: Message = { 
        id: (Date.now() + 1).toString(), 
        role: 'ai', 
        content: "I'm just a UI prototype for now, but I can help you visualize how this AI Agent will work in the future! Coming soon, vote at it: [Tell us why it's important for you](https://roadmap.founderstack.cloud)" 
      };
      setMessages(prev => [...prev, aiMsg]);
      setIsTyping(false);
    }, 1500);
  };

  const hasMessages = messages.length > 0;

  const renderContent = (content: string) => {
    // Simple markdown link parser [text](url)
    const parts = content.split(/(\[.*?\]\(.*?\))/g);
    return parts.map((part, i) => {
      const match = part.match(/\[(.*?)\]\((.*?)\)/);
      if (match) {
        return (
          <a 
            key={i} 
            href={match[2]} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-accent hover:underline font-medium"
            onClick={(e) => e.stopPropagation()}
          >
            {match[1]}
          </a>
        );
      }
      return part;
    });
  };

  return (
    <div className="flex flex-col h-screen bg-[#151515] text-textPrimary relative overflow-hidden">
        {/* Messages Area */}
        {hasMessages && (
            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 max-w-3xl mx-auto w-full pb-32">
                {messages.map((msg) => (
                    <div 
                        key={msg.id} 
                        className={cn(
                            "flex gap-4 w-full",
                            msg.role === 'user' ? "justify-end" : "justify-start"
                        )}
                    >
                        {msg.role === 'ai' && (
                             <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center shrink-0 border border-accent/20">
                                <Bot size={16} className="text-accent" />
                             </div>
                        )}
                        
                        <div dir="auto" className={cn(
                            "max-w-[80%] rounded-2xl p-4 text-sm leading-relaxed",
                            msg.role === 'user' 
                                ? "bg-[#2f2f2f] text-textPrimary" 
                                : "bg-transparent text-textPrimary px-0 py-2" // No background for received msg as requested
                        )}>
                            {renderContent(msg.content)}
                        </div>
                    </div>
                ))}
                
                {isTyping && (
                    <div className="flex gap-4 w-full justify-start">
                         <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center shrink-0 border border-accent/20">
                            <Bot size={16} className="text-accent" />
                         </div>
                         <div className="bg-transparent text-textPrimary px-0 py-2 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-textSecondary rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                            <span className="w-1.5 h-1.5 bg-textSecondary rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                            <span className="w-1.5 h-1.5 bg-textSecondary rounded-full animate-bounce"></span>
                         </div>
                    </div>
                )}
                <div ref={bottomRef} />
            </div>
        )}

        {/* Input Area */}
        <div 
            className={cn(
                "transition-all duration-500 ease-in-out w-full",
                hasMessages 
                    ? "absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#151515] via-[#151515] to-transparent" 
                    : "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4 max-w-3xl"
            )}
        >
            <div className={cn("mx-auto transition-all duration-500", hasMessages ? "max-w-3xl" : "max-w-2xl")}>
                 <Ai01 onMessageSent={handleSendMessage} className={hasMessages ? "mb-0" : ""} hideHeading={hasMessages} />
            </div>
            <div className="text-center mt-2 pb-2">
                <p className="text-[10px] text-textSecondary">
                    AI Agent can make mistakes. Check important info. <span className="underline cursor-pointer">See Cookie Preferences.</span>
                </p>
            </div>
        </div>
    </div>
  );
};

export default AiAgentPage;
