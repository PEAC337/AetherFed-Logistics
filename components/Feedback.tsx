
import React, { useState } from 'react';
import type { FeedbackItem, AnalyzedFeedback } from '../types';
import { analyzeFeedback } from '../services/geminiService';
import { Star, Bot, Zap, Loader2, ThumbsUp, ThumbsDown, Meh } from 'lucide-react';

const mockFeedback: FeedbackItem[] = [
  { id: 'FB-001', customerName: 'Emily Carter', date: '2023-10-26', rating: 5, comment: "Absolutely phenomenal drone delivery service! The package arrived way ahead of schedule, and tracking was pinpoint accurate. A truly futuristic experience. Will definitely use again!" },
  { id: 'FB-002', customerName: 'Benjamin Grant', date: '2023-10-25', rating: 3, comment: "The delivery was on time, which is good. However, the app's user interface for tracking the drone could be more intuitive. It took me a while to figure out where to look for the live feed." },
  { id: 'FB-003', customerName: 'Chloe Martinez', date: '2023-10-24', rating: 2, comment: "My package was delayed by over an hour with no clear communication. When I tried to contact support, the wait time was very long. The drone delivery concept is cool, but the execution needs improvement." },
];

const Rating: React.FC<{ rating: number }> = ({ rating }) => (
  <div className="flex">
    {Array.from({ length: 5 }).map((_, i) => (
      <Star key={i} className={`h-5 w-5 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-600'}`} />
    ))}
  </div>
);

const SentimentIcon: React.FC<{ sentiment: AnalyzedFeedback['sentiment'] }> = ({ sentiment }) => {
    if (sentiment === 'Positive') return <ThumbsUp className="h-6 w-6 text-green-400" />;
    if (sentiment === 'Negative') return <ThumbsDown className="h-6 w-6 text-red-400" />;
    return <Meh className="h-6 w-6 text-yellow-400" />;
};


const FeedbackCard: React.FC<{ item: FeedbackItem }> = ({ item }) => {
  const [analysis, setAnalysis] = useState<AnalyzedFeedback | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAnalyze = async () => {
    setIsLoading(true);
    setError('');
    const result = await analyzeFeedback(item.comment);
    if (result) {
      setAnalysis(result);
    } else {
      setError('Failed to analyze feedback.');
    }
    setIsLoading(false);
  };

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
      <div className="flex justify-between items-start">
        <div>
          <p className="font-bold text-lg">{item.customerName}</p>
          <p className="text-xs text-gray-400">{item.date}</p>
        </div>
        <Rating rating={item.rating} />
      </div>
      <p className="mt-4 text-gray-300">{item.comment}</p>
      
      {!analysis && !isLoading && (
          <button 
            onClick={handleAnalyze} 
            className="mt-4 inline-flex items-center bg-cyan-600 hover:bg-cyan-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
          >
              <Zap className="h-4 w-4 mr-2" />
              Analyze with AI
          </button>
      )}

      {isLoading && (
        <div className="mt-4 flex items-center text-cyan-400">
            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            <span>Analyzing...</span>
        </div>
      )}

      {error && <p className="mt-4 text-red-400">{error}</p>}
      
      {analysis && (
        <div className="mt-6 border-t border-gray-700 pt-4">
            <h4 className="text-sm font-semibold text-cyan-400 flex items-center"><Bot className="h-4 w-4 mr-2" />AI Analysis</h4>
            <div className="mt-2 p-4 bg-gray-700/50 rounded-lg space-y-3">
                <div className="flex items-center">
                    <SentimentIcon sentiment={analysis.sentiment} />
                    <span className="ml-3 font-semibold text-lg">{analysis.sentiment}</span>
                </div>
                <div>
                    <p className="font-semibold text-gray-300">Summary:</p>
                    <p className="text-gray-400 italic">"{analysis.summary}"</p>
                </div>
                 <div>
                    <p className="font-semibold text-gray-300">Keywords:</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                        {analysis.keywords.map(kw => (
                            <span key={kw} className="bg-gray-600 text-gray-200 text-xs font-medium px-2.5 py-1 rounded-full">{kw}</span>
                        ))}
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

const Feedback: React.FC = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-white">Customer Feedback</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockFeedback.map(item => <FeedbackCard key={item.id} item={item} />)}
      </div>
    </div>
  );
};

export default Feedback;
