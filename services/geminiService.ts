import { GoogleGenAI, Type, GenerateContentResponse, Modality } from "@google/genai";
import { AnalyzedFeedback, SituationalAwarenessData } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

// Helper function for retrying API calls with exponential backoff
const withRetry = async <T>(apiCall: () => Promise<T>, context: string, maxRetries = 3): Promise<T | null> => {
    let attempt = 0;
    while (attempt < maxRetries) {
        try {
            const result = await apiCall();
            // A successful call might still not return the data we need. Throw to retry.
            if (result === null || result === undefined) {
                 throw new Error("API call returned null or undefined.");
            }
            return result;
        } catch (error) {
            attempt++;
            console.error(`Error ${context} (attempt ${attempt}):`, error);
            if (attempt < maxRetries) {
                await new Promise(res => setTimeout(res, 1000 * attempt)); // e.g., 1s, 2s
            } else {
                console.error(`Failed to ${context} after ${maxRetries} attempts.`);
                return null;
            }
        }
    }
    return null;
};


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
};

const situationalAwarenessSchema = {
    type: Type.OBJECT,
    properties: {
        weatherAdvisories: {
            type: Type.ARRAY,
            description: "List of weather advisories. For the zone, use coordinates from 0 to 100.",
            items: {
                type: Type.OBJECT,
                properties: {
                    type: { type: Type.STRING, description: "Type of weather, e.g., Wind, Rain, Fog." },
                    severity: { type: Type.STRING, description: "Severity level, e.g., Moderate, Severe, Extreme." },
                    zone: {
                        type: Type.OBJECT,
                        properties: {
                            x: { type: Type.NUMBER, description: "Center x-coordinate (0-100)." },
                            y: { type: Type.NUMBER, description: "Center y-coordinate (0-100)." },
                            radius: { type: Type.NUMBER, description: "Radius of the zone (as a percentage of map size, 0-50)." },
                        },
                        required: ["x", "y", "radius"],
                    },
                    details: { type: Type.STRING, description: "Brief details, e.g., 'Gusts up to 40 kph'." },
                },
                 required: ["type", "severity", "zone", "details"],
            },
        },
        flightRestrictions: {
            type: Type.ARRAY,
            description: "List of flight restrictions. For coordinates, use values from 0 to 100.",
            items: {
                type: Type.OBJECT,
                properties: {
                    type: { type: Type.STRING, description: "Type of restriction, e.g., TFR, No-Fly Zone." },
                    shape: { type: Type.STRING, description: "Shape of the zone, 'Circle' or 'Polygon'." },
                    coordinates: {
                        type: Type.ARRAY,
                        description: "For a Polygon, a list of vertices. For a Circle, a single vertex for the center.",
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                x: { type: Type.NUMBER },
                                y: { type: Type.NUMBER },
                            },
                             required: ["x", "y"],
                        },
                    },
                    radius: { type: Type.NUMBER, description: "Radius if shape is a Circle (as a percentage of map size, 0-50)." },
                    details: { type: Type.STRING, description: "Reason for the restriction, e.g., 'VIP Movement until 15:00'." },
                },
                required: ["type", "shape", "coordinates", "details"],
            },
        },
        summaryText: {
            type: Type.STRING,
            description: "A human-readable summary of the overall situation.",
        },
    },
    required: ["summaryText"],
};


export const analyzeFeedback = async (feedbackText: string): Promise<AnalyzedFeedback | null> => {
    return withRetry(async () => {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Analyze the following customer feedback and provide the sentiment, a summary, and keywords. Feedback: "${feedbackText}"`,
            config: {
                responseMimeType: "application/json",
                responseSchema: feedbackResponseSchema,
            },
        });

        const jsonString = response.text.trim();
        return JSON.parse(jsonString) as AnalyzedFeedback;
    }, "analyzing feedback");
};

export const getFaaRegulationSummary = async (): Promise<string | null> => {
    return withRetry(async () => {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Summarize key FAA Part 107 regulations for drone pilots. Focus on: maximum altitude, visual line of sight (VLOS), operating over people, night operations, and airspace rules. Format as bullet points for a dashboard.`,
        });
        return response.text;
    }, "fetching FAA summary");
};

export const generateImage = async (prompt: string, aspectRatio: string): Promise<string | null> => {
    return withRetry(async () => {
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
    }, "generating image");
};

export const editImageWithText = async (base64ImageData: string, mimeType: string, prompt: string): Promise<string | null> => {
    return withRetry(async () => {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [
                    { inlineData: { data: base64ImageData, mimeType: mimeType } },
                    { text: prompt },
                ],
            },
            config: { responseModalities: [Modality.IMAGE] },
        });

        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                const base64ImageBytes: string = part.inlineData.data;
                return `data:${part.inlineData.mimeType};base64,${base64ImageBytes}`;
            }
        }
        return null;
    }, "editing image");
};

export const getSituationalAwarenessInfo = async (query: string): Promise<SituationalAwarenessData | null> => {
    return withRetry(async () => {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: query,
            config: {
                responseMimeType: "application/json",
                responseSchema: situationalAwarenessSchema,
            },
        });
        const jsonString = response.text.trim();
        return JSON.parse(jsonString) as SituationalAwarenessData;
    }, "fetching situational awareness");
};

export const getGroundedNews = async (query: string): Promise<{ text: string; groundingChunks: any[] } | null> => {
    return withRetry(async () => {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: query,
            config: { tools: [{googleSearch: {}}] },
        });
        const text = response.text;
        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        return { text, groundingChunks };
    }, "fetching grounded news");
};

export const optimizeRoute = async (waypoints: {x: number, y: number}[]): Promise<{x: number, y: number}[] | null> => {
    return withRetry(async () => {
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
    }, "optimizing route");
};