import { ai } from './geminiClient';
import { AspectRatio } from '../types';

export const generateVideo = async (prompt: string, aspectRatio: AspectRatio): Promise<string> => {
    // Video generation is expensive/slow, ensure we use the correct model
    const model = 'veo-3.1-fast-generate-preview'; 
    let operation = await ai.models.generateVideos({
        model,
        prompt,
        config: {
            numberOfVideos: 1,
            resolution: '720p',
            aspectRatio: aspectRatio
        }
    });
    
    // Poll for completion
    while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        operation = await ai.operations.getVideosOperation({ operation: operation });
    }
    
    return operation.response?.generatedVideos?.[0]?.video?.uri || "";
};
