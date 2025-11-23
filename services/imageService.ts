import { ai } from './geminiClient';
import { AspectRatio } from '../types';

// --- VISUAL GENERATION ---

export const createThumbnailPromptFromPost = async (title: string, description: string, prayer: string, language: string): Promise<string> => {
    const model = 'gemini-2.5-flash';
    const langMap: {[key: string]: string} = { 'pt': 'Português', 'en': 'Inglês', 'es': 'Espanhol' };
    const targetLangName = langMap[language] || 'Inglês';

    const systemInstruction = `
    You are a world-class YouTube Strategist and Semiotics Expert, specialized in 'SEXY CANVAS' psychology to create High-CTR Thumbnails.
    
    YOUR GOAL: Generate a prompt for 'Imagen 4 Ultra' to create a VIRAL, CLICKBAIT-STYLE thumbnail based **STRICTLY** on the Marketing TITLE.
    
    CRITICAL RULES:
    1. SOURCE OF TRUTH: Analyze **ONLY the TITLE** to determine the hook. Do NOT look at the description or prayer text for the text overlay content.
    2. LANGUAGE MATCHING: Text inside the image MUST be in ${targetLangName}.
    3. OUTPUT FORMAT: Return ONLY the raw prompt string in English.
    4. TEXT STRUCTURE: The text overlay MUST consist of TWO SHORT PHRASES (Headline + Subheadline). The Subheadline MUST have at least 3 words. Use synonyms from the title to avoid exact repetition.
    
    SEXY CANVAS METHODOLOGY (Analyze the TITLE to choose the trigger):
    - **Sloth (Laziness)**: If title promises fast results ("1 Minute"). Text Ex: "DURMA AGORA / PAZ INSTANTÂNEA AQUI".
    - **Greed (Gain)**: If title promises blessings/money. Text Ex: "RECEBA TUDO / MILAGRE FINANCEIRO HOJE".
    - **Wrath (Justice)**: If title mentions enemies. Text Ex: "ELES CAIRÃO / FOGO CONTRA O MAL".
    - **Pride (Chosen)**: If title says "God chose you". Text Ex: "VOCÊ FOI / ESCOLHIDO POR DEUS".
    - **Lust (Intimacy)**: If title talks about Love. Text Ex: "AMOR REAL / ELE TE OUVE AGORA".
    
    VISUAL FORMULA:
    - **Subject**: Highly expressive human face (close up) showing emotion relevant to the hook OR Divine/Mystical silhouette with glowing aura.
    - **Text Overlay**: Massive 3D font, High Contrast (Yellow/White on Dark).
    - **Style**: Hyper-realistic, 8k, cinematic lighting, YouTube Clickbait style (MrBeast style high contrast).
    `;

    const userPrompt = `
    MARKETING TITLE: "${title}"
    (Analyze ONLY this Title for the visual hook and text).
    
    CONTEXT (Mood only - DO NOT use for text):
    Prayer Theme: "${prayer.substring(0, 100)}..."
    
    TASK:
    1. Extract the 'Sexy Canvas' trigger from the TITLE.
    2. Define the text overlay: TWO PHRASES in ${targetLangName}. Subtitle must be 3+ words. Use synonyms.
    3. Generate the full image prompt describing the visual and the specific text to render.
    `;

    const response = await ai.models.generateContent({
        model,
        contents: userPrompt,
        config: { systemInstruction }
    });
    return response.text || "Spiritual cinematic background with text overlay";
};

export const createMediaPromptFromPrayer = async (prayer: string, language: string): Promise<string> => {
    // This is for the 'Video Background' or 'Art', not the Thumbnail. 
    // It should be more artistic and less 'clickbaity'.
    const model = 'gemini-2.5-flash';
    const prompt = `
    Create a prompt for an AI image generator to create a cinematic, spiritual background image 
    that matches the themes of this prayer: "${prayer.substring(0, 500)}...".
    Style: Ethereal, hyper-realistic, 8k, cinematic lighting, peaceful, divine atmosphere.
    No text in the image.
    Return ONLY the prompt in English.
    `;
    const response = await ai.models.generateContent({ model, contents: prompt });
    return response.text || "Ethereal spiritual background, cinematic lighting, 8k";
};

export const generateImageFromPrayer = async (prompt: string, aspectRatio: AspectRatio, model: string = 'imagen-3.0-generate-001'): Promise<string> => {
    const response = await ai.models.generateImages({
        model,
        prompt,
        config: {
            numberOfImages: 1,
            aspectRatio: aspectRatio,
            outputMimeType: 'image/png',
        },
    });
    return response.generatedImages[0].image.imageBytes;
};

// --- ANALYSIS FUNCTIONS ---

export const analyzeImage = async (imageFile: File, prompt: string, language: string): Promise<string> => {
    const model = "gemini-2.5-flash"; 
    
    const base64Image = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(imageFile);
    });
    const data = base64Image.split(',')[1];

    const userPrompt = prompt || (language === 'pt' ? "Analise esta imagem espiritualmente." : "Analyze this image spiritually.");

    const response = await ai.models.generateContent({
        model,
        contents: {
            parts: [
                { inlineData: { mimeType: imageFile.type, data } },
                { text: userPrompt }
            ]
        }
    });

    return response.text || "";
};
