import { GoogleGenAI, Type, GenerateContentResponse, Modality } from "@google/genai";
import { AnalyzedFeedback } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

const feedbackResponseSchema = {
    type: Type.OBJECT,
    properties: {
        sentiment: {
            type: Type.STRING,
            description: "The overall sentiment of the feedback. Can be 'Positive', 'Negative', or 'Neutral'.",
        },
        summary: {
            type: Type.STRING,
            description: "A concise one-sentence summary of the feedback.",
        },
        keywords: {
            type: Type.ARRAY,
            items: {
                type: Type.STRING,
            },
            description: "A list of 3-5 main keywords from the feedback.",
        },
    },
    required: ["sentiment", "summary", "keywords"],
};

const routeOptimizationSchema = {
    type: Type.OBJECT,
    properties: {
        optimizedPath: {
            type: Type.ARRAY,
            description: "The optimized list of waypoints.",
            items: {
                type: Type.OBJECT,
                properties: {
                    x: { type: Type.NUMBER, description: "The x-coordinate." },
                    y: { type: Type.NUMBER, description: "The y-coordinate." }
                },
                required: ["x", "y"]
            }
        }
    },
    required: ["optimizedPath"]
}

export const analyzeFeedback = async (feedbackText: string): Promise<AnalyzedFeedback | null> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Analyze the following customer feedback and provide the sentiment, a summary, and keywords. Feedback: "${feedbackText}"`,
            config: {
                responseMimeType: "application/json",
                responseSchema: feedbackResponseSchema,
            },
        });

        const jsonString = response.text.trim();
        const parsedData: AnalyzedFeedback = JSON.parse(jsonString);
        return parsedData;

    } catch (error) {
        console.error("Error analyzing feedback with Gemini API:", error);
        return null;
    }
};

export const getFaaRegulationSummary = async (): Promise<string | null> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Summarize key FAA Part 107 regulations for drone pilots. Focus on: maximum altitude, visual line of sight (VLOS), operating over people, night operations, and airspace rules. Format as bullet points for a dashboard.`,
        });

        return response.text;

    } catch (error) {
        console.error("Error fetching FAA summary from Gemini API:", error);
        return null;
    }
};

export const generateImage = async (prompt: string, aspectRatio: string): Promise<string | null> => {
    try {
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: prompt,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/jpeg',
                aspectRatio: aspectRatio as "1:1" | "3:4" | "4:3" | "9:16" | "16:9",
            },
        });
        
        if (response.generatedImages && response.generatedImages.length > 0) {
            const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
            return `data:image/jpeg;base64,${base64ImageBytes}`;
        }
        return null;

    } catch (error) {
        console.error("Error generating image with Imagen API:", error);
        return null;
    }
};

export const editImageWithText = async (base64ImageData: string, mimeType: string, prompt: string): Promise<string | null> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [
                    {
                        inlineData: {
                            data: base64ImageData,
                            mimeType: mimeType,
                        },
                    },
                    {
                        text: prompt,
                    },
                ],
            },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });

        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                const base64ImageBytes: string = part.inlineData.data;
                return `data:${part.inlineData.mimeType};base64,${base64ImageBytes}`;
            }
        }
        return null;

    } catch (error) {
        console.error("Error editing image with Gemini API:", error);
        return null;
    }
};


export const getSituationalAwarenessInfo = async (query: string, location: { latitude: number; longitude: number; }): Promise<{ text: string; groundingChunks: any[] } | null> => {
    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: query,
            config: {
                tools: [{googleMaps: {}}],
                toolConfig: {
                    retrievalConfig: {
                        latLng: location
                    }
                }
            },
        });
        const text = response.text;
        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        return { text, groundingChunks };
    } catch (error) {
        console.error("Error fetching Maps Grounding info from Gemini API:", error);
        return null;
    }
};

export const getGroundedNews = async (query: string): Promise<{ text: string; groundingChunks: any[] } | null> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: query,
            config: {
                tools: [{googleSearch: {}}],
            },
        });
        const text = response.text;
        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        return { text, groundingChunks };
    } catch (error) {
        console.error("Error fetching grounded news from Gemini API:", error);
        return null;
    }
};

export const optimizeRoute = async (waypoints: {x: number, y: number}[]): Promise<{x: number, y: number}[] | null> => {
    try {
        const prompt = `Given the following list of patrol waypoints, reorder them to create the most efficient route, returning to the first point at the end. The route should be a continuous loop. Waypoints: ${JSON.stringify(waypoints)}`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: routeOptimizationSchema,
            }
        });

        const jsonString = response.text.trim();
        const parsedData = JSON.parse(jsonString);
        return parsedData.optimizedPath;

    } catch (error) {
        console.error("Error optimizing route with Gemini API:", error);
        return null;
    }
};