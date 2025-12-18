
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

    // WORDS_PER_MINUTE ajustado para 140 (padrão de narração humana fluida e orgânica)
    const WORDS_PER_MINUTE = 140; 
    const totalTargetWords = duration * WORDS_PER_MINUTE;
    const MAX_WORDS_PER_BLOCK = 800; 
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
            - PHASE: INDUCTION & HOOK (Opening)
            - Start with a 'Hypnotic Hook': A provocative question or deep validation of the user's pain.
            - Establish the Biblical Archetype or Metaphor early on.
            `);
        } else {
             instructionStack.push(`
            - PHASE: CONTINUATION
            - Continue the narrative flow seamlessly.
             `);
        }

        instructionStack.push(`
        - PHASE: DEEPENING & THERAPY
        - Use NLP loops, sensory descriptions (VAK).
        - Use rhythmic punctuation (commas, periods) to guide the TTS engine in creating natural pauses.
        - Expand on: "${prompt || 'Divine Connection'}". 
        `);

        if (isLast) {
            instructionStack.push(`
            - PHASE: RESOLUTION & CALL TO ACTION (CTA)
            - Anchor the feelings of peace.
            - Invite the listener to subscribe to "${channelName}".
            - End with a final blessing.
            `);
        }

        const systemInstruction = `
        You are a Master of Guided Prayer and Erickson Hypnosis.
        Your goal is to write a DEEPLY THERAPEUTIC dialogue script.
        
        CRITICAL RULES:
        1. CHARACTERS: "Roberta Erickson" (Voice: Aoede, Soft, NLP Guide) and "Milton Dilts" (Voice: Enceladus, Deep, Hypnotic Voice).
        2. FORMAT: Always start lines with "Roberta Erickson:" or "Milton Dilts:".
        3. LANGUAGE: Strictly in ${targetLang}.
        4. TONE: Natural, soulful, rhythmic. Use periods and commas to create 'breathable' moments.
        5. NO META-DATA: Just the dialogue.
        6. THEOLOGY: Weave in the presence of Jesus Christ, Solomon, or David.
        `;

        const userPrompt = `
        Write Part ${i + 1}/${numIterations} of the script (~${targetWordsPerBlock} words).
        
        ${!isFirst ? `FLOW CONTINUITY: "...${lastContext.slice(-300)}"` : ""}
        `;

        try {
            const result = await ai.models.generateContent({
                model,
                contents: userPrompt,
                config: { 
                    systemInstruction, 
                    temperature: 0.8,
                    thinkingConfig: { thinkingBudget: 4000 }
                } 
            });
            const text = result.text || "";
            fullPrayer += text + "\n\n";
            lastContext = text;
        } catch (e) {
            console.error(`Block ${i} generation failed`, e);
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
    You are a PRIME LEVEL SEO & Neuromarketing Strategist.
    Create a high-conversion Instagram post for this prayer: "${prayer.substring(0, 1000)}..."
    
    Output JSON in ${targetLang}:
    {
        "title": "PRIME LEVEL SEO TITLE",
        "description": "Magnetic caption using AIDA",
        "hashtags": ["tag1", "tag2", "tag3", "tag4", "tag5"]
    }
    `;
    
    const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: { 
            responseMimeType: "application/json",
            thinkingConfig: { thinkingBudget: 2000 }
        }
    });
    return JSON.parse(response.text || "{}");
};

export const generateYouTubeLongPost = async (theme: string, subthemes: string[], language: string, duration: number): Promise<YouTubeLongPost> => {
    const model = 'gemini-3-pro-preview';
    const langMap: {[key: string]: string} = { 'pt': 'Português', 'en': 'Inglês', 'es': 'Espanhol' };
    const targetLang = langMap[language] || 'Inglês';

    let linksBlock = language === 'pt' ? 
        `🌌 JORNADA PIC:\n► SÉRIE PORTAIS: [https://www.youtube.com/watch?v=Q6x_C3uaKsQ&list=PLmeEfeSNeLbIyeBMB8HLrHwybI__suhgq]\n► ARQUITETURA DA ALMA: https://www.youtube.com/playlist?list=PLmeEfeSNeLbIIm3MzGHSRFYfIONlBDofI\n🔗 INSCREVA-SE: https://www.youtube.com/@fe10minutos` :
        `🕊️ NEXT STEPS:\n► Soul Architecture: https://www.youtube.com/playlist?list=PLTQIQ5QpCYPo11ap1JUSiItZtoiV_4lEH\n🔗 SUBSCRIBE: https://www.youtube.com/@Faithin10Minutes`;

    const systemInstruction = `You are a YouTube GROWTH EXPERT. Generate metadata for a ${duration}min video.`;

    const prompt = `
    Generate JSON in ${targetLang}:
    {
        "title": "PRIME SEO TITLE",
        "description": "NLP Hook + Links:\n${linksBlock}",
        "hashtags": ["#string", "#string", "#string"],
        "timestamps": "string",
        "tags": ["keyword1", "keyword2", "keyword3"]
    }
    `;

    const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: { 
            responseMimeType: "application/json", 
            systemInstruction,
            thinkingConfig: { thinkingBudget: 2000 }
        }
    });
    return JSON.parse(response.text || "{}");
};

export const getTrendingTopic = async (language: string, type: 'long' | 'short'): Promise<{theme: string, subthemes: string[]}> => {
    const themes = language === 'pt' ? 
        ['Cura e Arquétipo de Cristo', 'Prosperidade e o Templo de Salomão', 'A Coragem de Davi contra Gigantes Mentais', 'O Segredo de José no Egito: Resiliência'] :
        ['Healing and Christ Archetype', 'Prosperity and Solomon\'s Temple', 'David\'s Courage vs Mental Giants', 'Joseph\'s Secret in Egypt: Resilience'];
    const randomTheme = themes[Math.floor(Math.random() * themes.length)];
    return { theme: randomTheme, subthemes: ['Indução Hipnótica', 'O Coração do Arquétipo', 'Resolução e Benção'] };
};
