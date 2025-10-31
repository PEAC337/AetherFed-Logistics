import React, { useState } from 'react';
import { generateImage } from '../services/geminiService';
import { Image as ImageIcon, Sparkles, Loader2 } from 'lucide-react';

const aspectRatios = ["1:1", "16:9", "9:16", "4:3", "3:4"];

const ImageGenerator: React.FC = () => {
    const [prompt, setPrompt] = useState('A futuristic delivery drone flying over a neon city at dusk, cinematic lighting');
    const [aspectRatio, setAspectRatio] = useState('16:9');
    const [isLoading, setIsLoading] = useState(false);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [error, setError] = useState('');

    const handleGenerate = async () => {
        if (!prompt) {
            setError('Please enter a prompt.');
            return;
        }
        setIsLoading(true);
        setError('');
        setGeneratedImage(null);
        
        const result = await generateImage(prompt, aspectRatio);
        if (result) {
            setGeneratedImage(result);
        } else {
            setError('Failed to generate image. Please try again.');
        }
        setIsLoading(false);
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-white flex items-center">
                <ImageIcon className="h-8 w-8 mr-3 text-cyan-400" />
                AI Image Studio
            </h1>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Controls */}
                <div className="lg:col-span-1 bg-gray-800 rounded-lg shadow-lg p-6 space-y-6 h-fit">
                    <div>
                        <label htmlFor="prompt" className="block text-sm font-medium text-gray-300 mb-2">Prompt</label>
                        <textarea
                            id="prompt"
                            rows={5}
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="e.g., A photorealistic image of..."
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Aspect Ratio</label>
                        <div className="grid grid-cols-3 gap-2">
                            {aspectRatios.map(ar => (
                                <button
                                    key={ar}
                                    onClick={() => setAspectRatio(ar)}
                                    className={`py-2 px-3 rounded-md text-sm font-semibold transition-colors ${aspectRatio === ar ? 'bg-cyan-500 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}
                                >
                                    {ar}
                                </button>
                            ))}
                        </div>
                    </div>
                    <button
                        onClick={handleGenerate}
                        disabled={isLoading}
                        className="w-full flex items-center justify-center bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 px-4 rounded-lg shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <Sparkles className="h-5 w-5 mr-2" />
                                Generate Image
                            </>
                        )}
                    </button>
                </div>
                {/* Display */}
                <div className="lg:col-span-2 bg-gray-800 rounded-lg shadow-lg p-6 flex items-center justify-center min-h-[400px] lg:min-h-[600px]">
                    {isLoading && (
                        <div className="text-center text-gray-400">
                            <Loader2 className="h-12 w-12 mx-auto animate-spin text-cyan-500" />
                            <p className="mt-4 text-lg">Generating your image...</p>
                            <p className="text-sm">This can take a moment.</p>
                        </div>
                    )}
                    {error && !isLoading && (
                        <div className="text-center text-red-400">
                            <p className="font-bold">Error</p>
                            <p>{error}</p>
                        </div>
                    )}
                    {generatedImage && !isLoading && (
                        <img src={generatedImage} alt={prompt} className="max-w-full max-h-full object-contain rounded-lg shadow-xl" />
                    )}
                    {!generatedImage && !isLoading && !error && (
                        <div className="text-center text-gray-500">
                            <ImageIcon className="h-16 w-16 mx-auto" />
                            <p className="mt-4 text-lg">Your generated image will appear here</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ImageGenerator;
