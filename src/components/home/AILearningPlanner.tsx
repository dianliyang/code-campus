'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useState, useMemo } from 'react';
import { Brain, AlertTriangle, Loader2, Send } from 'lucide-react';

const SUGGESTED_PROMPTS = [
  "What courses should I take next to advance in machine learning?",
  "Create a 6-month learning path for full-stack development",
  "Which prerequisites am I missing for advanced courses?",
  "Suggest courses that complement my current studies"
];

export default function AILearningPlanner() {
  const transport = useMemo(() => new DefaultChatTransport({
    api: '/api/ai/learning-path',
  }), []);

  const { messages, sendMessage, status, error } = useChat({
    transport,
  });

  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(messages.length === 0);

  const isLoading = status === 'submitted';

  const handleSuggestedPrompt = async (prompt: string) => {
    setInput(prompt);
    setShowSuggestions(false);
    await sendMessage({ text: prompt });
    setInput('');
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    setShowSuggestions(false);
    await sendMessage({ text: input });
    setInput('');
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
      {/* Chat Messages */}
      <div className="space-y-4 mb-6 min-h-[200px] max-h-[500px] overflow-y-auto">
        {messages.length === 0 && !error && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-violet-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Brain className="w-6 h-6 text-violet-500" />
            </div>
            <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-2">
              AI-Powered Course Advisor
            </h4>
            <p className="text-xs text-gray-500 max-w-md mx-auto">
              Get personalized course recommendations based on your learning history and goals.
            </p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-900">Error</p>
                <p className="text-xs text-red-700 mt-1">
                  {error.message || 'Failed to connect to AI service. Please try again.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {messages.map((message) => {
          const textContent = message.parts
            .filter(part => part.type === 'text')
            .map(part => (part as { text: string }).text)
            .join('');

          return (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-xl px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-violet-500 text-white ml-auto'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <div className="flex items-start gap-2">
                  {message.role === 'assistant' && (
                    <Brain className="w-4 h-4 text-violet-500 mt-0.5 flex-shrink-0" />
                  )}
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {textContent}
                  </p>
                </div>
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-xl px-4 py-3 bg-gray-100">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-violet-500" />
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Suggested Prompts */}
      {showSuggestions && messages.length === 0 && !error && (
        <div className="mb-6">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Suggested Questions
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {SUGGESTED_PROMPTS.map((prompt, index) => (
              <button
                key={index}
                onClick={() => handleSuggestedPrompt(prompt)}
                disabled={isLoading}
                className="text-left text-xs p-3 border border-gray-200 rounded-lg hover:border-violet-300 hover:bg-violet-50/50 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="text-gray-700 group-hover:text-violet-700">
                  {prompt}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="relative">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onFocus={() => setShowSuggestions(false)}
          placeholder="Ask about your learning path..."
          className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none text-sm"
          rows={2}
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="absolute right-2 bottom-2 w-8 h-8 bg-violet-500 text-white rounded-lg hover:bg-violet-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
        >
          {isLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Send className="w-3.5 h-3.5" />
          )}
        </button>
      </form>

      {/* Footer Note */}
      <p className="text-xs text-gray-400 mt-3 text-center">
        AI recommendations are suggestions. Always verify course prerequisites and requirements.
      </p>
    </div>
  );
}
