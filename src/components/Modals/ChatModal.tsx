import React, { useState } from 'react';
import { X, Send, Paperclip, MessageSquare, Radio, MapPin } from 'lucide-react';
import { useTeam } from '../../context/TeamContext';

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChatModal: React.FC<ChatModalProps> = ({ isOpen, onClose }) => {
  const { messages, sendMessage, currentUser, isOnline } = useTeam();
  const [text, setText] = useState<string>('');
  const [isBroadcast, setIsBroadcast] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      sendMessage(text.trim(), isBroadcast);
      setText('');
      setIsBroadcast(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none animate-in fade-in">
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col h-[600px] max-h-[90vh] text-slate-900"
      >
        {/* Header */}
        <div className="bg-[#14243b] px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="font-extrabold text-base leading-tight">Secure Field Team Channel</h3>
              <p className="text-slate-400 text-xs leading-tight">
                Offline-queued peer communications with local cache
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-xl text-slate-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          {messages.map((msg) => {
            const isMe = msg.senderId === currentUser.id;
            return (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-[80%] ${
                  isMe ? 'ml-auto flex-row-reverse' : 'mr-auto'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 mt-0.5 ${
                    isMe ? 'bg-blue-600' : 'bg-slate-800'
                  }`}
                >
                  {msg.senderName.charAt(msg.senderName.length - 1)}
                </div>

                <div>
                  <div
                    className={`flex items-center gap-2 mb-1 ${
                      isMe ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <span className="font-bold text-slate-800 text-[11px]">{msg.senderName}</span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    {msg.status === 'queued' && (
                      <span className="text-[9px] bg-amber-100 text-amber-800 px-1 py-0.2 rounded font-bold">
                        Queued Offline
                      </span>
                    )}
                  </div>

                  <div
                    className={`p-3.5 rounded-2xl leading-relaxed ${
                      isMe
                        ? 'bg-blue-600 text-white rounded-tr-none'
                        : msg.isBroadcast
                        ? 'bg-red-50 text-red-900 border border-red-200 rounded-tl-none font-medium'
                        : 'bg-slate-100 text-slate-800 rounded-tl-none'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSend} className="p-4 bg-slate-50 border-t border-slate-200 space-y-2">
          <div className="flex items-center gap-2 text-xs">
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-600 font-medium">
              <input
                type="checkbox"
                checked={isBroadcast}
                onChange={(e) => setIsBroadcast(e.target.checked)}
                className="rounded border-slate-300 text-red-600 focus:ring-red-500"
              />
              <Radio className="w-3.5 h-3.5 text-red-600" />
              <span>Priority Command Broadcast</span>
            </label>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type field message or situation report..."
              className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-600 text-xs"
            />
            <button
              type="submit"
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
