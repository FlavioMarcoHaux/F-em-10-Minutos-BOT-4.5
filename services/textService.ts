
import { ai } from './geminiClient';
import { YouTubeLongPost, SocialMediaPost } from '../types';

// --- CORE GENERATION FUNCTIONS ---

export interface UserContext {
    name?: string;
    birthDate?: string;
    birthPlace?: string;   
    currentPlace?: string; 
}

const getSpiritualDossier = async (userData: UserContext, language: string, onStatusUpdate?: (status: string) => void): Promise<string> => {
    const model = 'gemini-3-flash-preview';
    const langMap: {[key: string]: string} = { 'pt': 'Português', 'en': 'Inglês', 'es': 'Espanhol' };
    const targetLang = langMap[language] || 'Inglês';

    if (onStatusUpdate) onStatusUpdate('picLoadingResearch');

    const prompt = `
    Deep Research Task (PIC - Principle of Conscious Information):
    Target User: ${userData.name || "Unknown"} | Origin: ${userData.birthPlace} | Context: ${userData.currentPlace}.
    
    INSTRUCTIONS:
    Search for spiritual, etymological, and ancestral roots. Connect their birth location to their current "soil". 
    Identify a powerful Biblical Archetype (e.g., Jesus Christ's sacrifice, David's courage in the caves, Solomon's architectural wisdom) that mirrors this trajectory.
    
    OUTPUT:
    Return a deep soul dossier in ${targetLang}. Start with: "CONTEXTO ESPIRITUAL (PIC):"
    `;

    try {
        const result = await ai.models.generateContent({
            model,
            contents: prompt,
            config: { tools: [{ googleSearch: {} }] }
        });
        return result.text || "";
    } catch (e) {
        console.error("Deep Research Failed", e);
        return `User context: ${userData.name}. Journey from roots to current soil.`; 
    }
};

export const generatePersonalizedPrayer = async (
    userData: UserContext, 
    language: string, 
    duration: number,
    onStatusUpdate?: (status: string) => void
): Promise<string> => {
    const dossier = await getSpiritualDossier(userData, language, onStatusUpdate);
    if (onStatusUpdate) onStatusUpdate('picLoadingSynthesizing');

    const augmentedPrompt = `
    [DEEP PERSONALIZATION & THEOLOGICAL MANDATE]
    Integrate these specific soul insights and the identified Biblical Archetype into the "True Plan" structure.
    Dossier: ${dossier}
    `;
    return generateGuidedPrayer(augmentedPrompt, language, duration);
};

export const generateGuidedPrayer = async (prompt: string, language: string, duration: number = 10): Promise<string> => {
    const model = 'gemini-3-pro-preview'; 
    const langMap: {[key: string]: string} = { 'pt': 'Português', 'en': 'Inglês', 'es': 'Espanhol' };
    const targetLang = langMap[language] || 'Inglês';
    const channelName = language === 'pt' ? 'Fé em 10 Minutos' : 'Faith in 10 Minutes';

    // AJUSTE CRÍTICO: 100 WPM é a média ideal para narrações profundas sem lentidão artificial.
    const WORDS_PER_MINUTE = 100; 
    const totalTargetWords = duration * WORDS_PER_MINUTE;
    const MAX_WORDS_PER_BLOCK = 700; 
    const numIterations = Math.max(1, Math.ceil(totalTargetWords / MAX_WORDS_PER_BLOCK));
    const targetWordsPerBlock = Math.round(totalTargetWords / numIterations);

    let fullPrayer = "";
    let lastContext = "";

    for (let i = 0; i < numIterations; i++) {
        const isFirst = i === 0;
        const isLast = i === numIterations - 1;
        
        const instructionStack: string[] = [];

        if (isFirst) {
            instructionStack.push(`
            - PHASE: OPENING
            - Start with a natural welcoming tone.
            - Introduce the Biblical Archetype or Metaphor.
            `);
        }

        instructionStack.push(`
        - PHASE: CONTENT
        - Use clean, fluid sentences. 
        - Avoid repetitive punctuation.
        - Tone: Compassionate and steady.
        - Expand on: "${prompt || 'Divine Connection'}". 
        `);

        if (isLast) {
            instructionStack.push(`
            - PHASE: CLOSING
            - Invite to subscribe to "${channelName}".
            - End with a final blessing.
            `);
        }

        const systemInstruction = `
        You are an expert scriptwriter for guided spiritual sessions.
        Write a natural dialogue script for ${targetLang}.
        
        CHARACTERS: 
        1. "Roberta Erickson" (Voice: Aoede, warm, comforting)
        2. "Milton Dilts" (Voice: Enceladus, calm, grounded)
        
        RULES:
        - Start lines with "Roberta Erickson:" or "Milton Dilts:".
        - Use natural punctuation for flow.
        - No meta-talk, just the dialogue.
        `;

        const userPrompt = `
        Write Part ${i + 1}/${numIterations} of the script (~${targetWordsPerBlock} words).
        ${!isFirst ? `CONTINUE FROM: "...${lastContext.slice(-200)}"` : ""}
        `;

        try {
            const result = await ai.models.generateContent({
                model,
                contents: userPrompt,
                config: { 
                    systemInstruction, 
                    temperature: 0.75,
                } 
            });
            const text = result.text || "";
            fullPrayer += text + "\n\n";
            lastContext = text;
        } catch (e) {
            console.error(`Block ${i} failed`, e);
            break; 
        }
    }
    return fullPrayer;
};

export const generateShortPrayer = async (prompt: string, language: string): Promise<string> => {
    return generateGuidedPrayer(prompt, language, 2); 
};

export const generateSocialMediaPost = async (prayer: string, language: string): Promise<SocialMediaPost> => {
    const model = 'gemini-3-pro-preview';
    const langMap: {[key: string]: string} = { 'pt': 'Português', 'en': 'Inglês', 'es': 'Espanhol' };
    const targetLang = langMap[language] || 'Inglês';

    const prompt = `
    Create high-conversion Instagram post for: "${prayer.substring(0, 1000)}..."
    Output JSON in ${targetLang}:
    {
        "title": "SEO TITLE",
        "description": "Magnetic caption",
        "hashtags": ["tag1", "tag2", "tag3"]
    }
    `;
    
    const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: { responseMimeType: "application/json" }
    });
    return JSON.parse(response.text || "{}");
};

export const generateYouTubeLongPost = async (theme: string, subthemes: string[], language: string, duration: number): Promise<YouTubeLongPost> => {
    const model = 'gemini-3-pro-preview';
    const langMap: {[key: string]: string} = { 'pt': 'Português', 'en': 'Inglês', 'es': 'Espanhol' };
    const targetLang = langMap[language] || 'Inglês';

    let linksBlock = language === 'pt' ? 
        `🌌 JORNADA PIC:\n🔗 INSCREVA-SE: https://www.youtube.com/@fe10minutos` :
        `🕊️ SUBSCRIBE: https://www.youtube.com/@Faithin10Minutes`;

    const prompt = `
    Generate YouTube JSON in ${targetLang} for a ${duration}min video:
    {
        "title": "PRIME SEO TITLE",
        "description": "NLP Hook + Links:\n${linksBlock}",
        "hashtags": ["#tag1", "#tag2", "#tag3"],
        "timestamps": "Timestamps here",
        "tags": ["tag1", "tag2"]
    }
    `;

    const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: { responseMimeType: "application/json" }
    });
    return JSON.parse(response.text || "{}");
};

export const getTrendingTopic = async (language: string, type: 'long' | 'short'): Promise<{theme: string, subthemes: string[]}> => {
    const themes = language === 'pt' ? 
        ['Cura e Renovação', 'Prosperidade com Sabedoria', 'Coragem e Paz'] :
        ['Healing and Renewal', 'Prosperity and Wisdom', 'Courage and Peace'];
    const randomTheme = themes[Math.floor(Math.random() * themes.length)];
    return { theme: randomTheme, subthemes: ['Introdução', 'Reflexão Central', 'Conclusão'] };
};
