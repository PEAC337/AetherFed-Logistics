import React, { useState } from 'react';
import { editImageWithText } from '../services/geminiService';
import { Wand2, Sparkles, Loader2, UploadCloud, Image as ImageIcon, AlertTriangle } from 'lucide-react';

// Helper to convert file to base64
const toBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = error => reject(error);
});

const ImageEditor: React.FC = () => {
    const [prompt, setPrompt] = useState('Add a retro, 1980s cinematic filter');
    const [isLoading, setIsLoading] = useState(false);
    const [originalImage, setOriginalImage] = useState<string>('/drone-stock-photo.jpeg'); // Default image
    const [originalImageFile, setOriginalImageFile] = useState<File | null>(null);
    const [editedImage, setEditedImage] = useState<string | null>(null);
    const [error, setError] = useState('');

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setOriginalImageFile(file);
            setOriginalImage(URL.createObjectURL(file));
            setEditedImage(null); // Clear previous edit
        }
    };

    const handleGenerate = async () => {
        if (!prompt) {
            setError('Please enter a prompt.');
            return;
        }
        if (!originalImage) {
            setError('Please upload an image.');
            return;
        }

        setIsLoading(true);
        setError('');
        setEditedImage(null);

        let base64Data: string;
        let mimeType: string;

        if (originalImageFile) {
            base64Data = await toBase64(originalImageFile);
            mimeType = originalImageFile.type;
        } else {
            // Fetch and convert the default image
            const response = await fetch(originalImage);
            const blob = await response.blob();
            const tempFile = new File([blob], "default.jpeg", { type: blob.type });
            base64Data = await toBase64(tempFile);
            mimeType = tempFile.type;
        }

        const result = await editImageWithText(base64Data, mimeType, prompt);
        
        if (result) {
            setEditedImage(result);
        } else {
            setError('Failed to edit image. The model may not support this type of edit. Please try a different prompt or image.');
        }
        setIsLoading(false);
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-white flex items-center">
                <Wand2 className="h-8 w-8 mr-3 text-cyan-400" />
                AI Image Editor
            </h1>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Controls */}
                <div className="lg:col-span-1 bg-gray-800 rounded-lg shadow-lg p-6 space-y-6 h-fit">
                     <div>
                        <label htmlFor="image-upload" className="block text-sm font-medium text-gray-300 mb-2">Source Image</label>
                        <div className="mt-2 flex justify-center rounded-lg border border-dashed border-gray-600 px-6 py-10">
                            <div className="text-center">
                                <UploadCloud className="mx-auto h-12 w-12 text-gray-500" aria-hidden="true" />
                                <div className="mt-4 flex text-sm leading-6 text-gray-400">
                                    <label htmlFor="file-upload" className="relative cursor-pointer rounded-md font-semibold text-cyan-400 focus-within:outline-none focus-within:ring-2 focus-within:ring-cyan-500 focus-within:ring-offset-2 focus-within:ring-offset-gray-800 hover:text-cyan-300">
                                        <span>Upload a file</span>
                                        <input id="file-upload" name="file-upload" type="file" className="sr-only" accept="image/png, image/jpeg, image/webp" onChange={handleImageUpload} />
                                    </label>
                                    <p className="pl-1">or drag and drop</p>
                                </div>
                                <p className="text-xs leading-5 text-gray-500">PNG, JPG, WEBP up to 10MB</p>
                            </div>
                        </div>
                    </div>
                    <div>
                        <label htmlFor="prompt" className="block text-sm font-medium text-gray-300 mb-2">Editing Prompt</label>
                        <textarea
                            id="prompt"
                            rows={4}
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="e.g., Add a futuristic blue glow"
                        />
                    </div>
                    <button
                        onClick={handleGenerate}
                        disabled={isLoading}
                        className="w-full flex items-center justify-center bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 px-4 rounded-lg shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? ( <><Loader2 className="h-5 w-5 mr-2 animate-spin" />Editing...</> ) : ( <><Sparkles className="h-5 w-5 mr-2" />Apply AI Edit</>)}
                    </button>
                    {error && (
                        <div className="flex items-start text-red-400 bg-red-900/30 p-3 rounded-lg">
                            <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0" />
                            <p className="text-sm">{error}</p>
                        </div>
                    )}
                </div>
                {/* Display */}
                <div className="lg:col-span-2 bg-gray-800 rounded-lg shadow-lg p-6 grid grid-cols-1 md:grid-cols-2 gap-6 items-center min-h-[400px] lg:min-h-[600px]">
                    <div className="flex flex-col items-center justify-center h-full">
                        <h3 className="text-lg font-semibold mb-2 text-gray-400">Original</h3>
                        <div className="w-full h-full bg-gray-900/50 rounded-lg flex items-center justify-center p-2">
                             {originalImage ? (
                                <img src={originalImage} alt="Original" className="max-w-full max-h-[500px] object-contain rounded-md" />
                            ) : (
                                <div className="text-center text-gray-600"><ImageIcon className="h-16 w-16 mx-auto" /><p className="mt-2">Upload an image to begin</p></div>
                            )}
                        </div>
                    </div>
                     <div className="flex flex-col items-center justify-center h-full">
                        <h3 className="text-lg font-semibold mb-2 text-cyan-400">Edited</h3>
                        <div className="w-full h-full bg-gray-900/50 rounded-lg flex items-center justify-center p-2">
                            {isLoading && (
                                <div className="text-center text-gray-400">
                                    <Loader2 className="h-12 w-12 mx-auto animate-spin text-cyan-500" />
                                    <p className="mt-4 text-lg">Applying AI edit...</p>
                                </div>
                            )}
                            {editedImage && !isLoading && (
                                <img src={editedImage} alt="Edited" className="max-w-full max-h-[500px] object-contain rounded-md shadow-xl" />
                            )}
                            {!editedImage && !isLoading && (
                                <div className="text-center text-gray-600"><Wand2 className="h-16 w-16 mx-auto" /><p className="mt-2">Your edited image will appear here</p></div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ImageEditor;