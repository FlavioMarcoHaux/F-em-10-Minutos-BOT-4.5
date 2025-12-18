
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
    const model = 'gemini-2.5-flash';
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
    Integrate these specific soul insights and the identified Biblical Archetype into the True Plan structure:
    ${dossier}
    `;
    return generateGuidedPrayer(augmentedPrompt, language, duration);
};

export const generateGuidedPrayer = async (prompt: string, language: string, duration: number = 10): Promise<string> => {
    const model = 'gemini-2.5-flash'; 
    const langMap: {[key: string]: string} = { 'pt': 'Português', 'en': 'Inglês', 'es': 'Espanhol' };
    const targetLang = langMap[language] || 'Inglês';
    const channelName = language === 'pt' ? 'Fé em 10 Minutos' : 'Faith in 10 Minutes';

    const WORDS_PER_MINUTE = 100; 
    const totalTargetWords = duration * WORDS_PER_MINUTE;
    const MAX_WORDS_PER_BLOCK = 500;
    const numIterations = Math.max(1, Math.ceil(totalTargetWords / MAX_WORDS_PER_BLOCK));
    const targetWordsPerBlock = Math.round(totalTargetWords / numIterations);

    let fullPrayer = "";
    let lastContext = "";

    for (let i = 0; i < numIterations; i++) {
        const isFirst = i === 0;
        const isLast = i === numIterations - 1;
        
        const instructionStack: string[] = [];

        // 1. PHASE: OPENING (Fiel ao seu plano)
        if (isFirst) {
            instructionStack.push(`
            - PHASE: INDUCTION & HOOK (Opening)
            - Start with a 'Hypnotic Hook': A provocative question or deep validation of the user's pain to grab attention immediately (First 30s).
            - Establish the Biblical Archetype (Jesus, Solomon, or David) early as the metaphysical guide.
            - IF A PERSONAL DOSSIER IS PROVIDED: Use the name, location energy, and ancestral meaning to create instant rapport.
            `);
        } else {
             instructionStack.push(`
            - PHASE: CONTINUATION
            - Continue the narrative flow seamlessly. Do not repeat greetings. Deepen the hypnotic state.
             `);
        }

        // 2. PHASE: DEEPENING (Body Content - Fiel ao seu plano)
        instructionStack.push(`
        - PHASE: DEEPENING & THERAPY
        - Use NLP loops, sensory descriptions (Visual, Auditory, Kinesthetic), and embedded commands.
        - Biblical metaphors applied to modern psychology: The cave of David as the subconscious, Solomon's Temple as the mental architecture, or Jesus as the healer of the 'inner child'.
        - Expand on the dossier/theme: "${prompt || 'Divine Connection'}". 
        - BE VERBOSE AND DESCRIPTIVE.
        `);

        // 3. PHASE: CLOSING (Fiel ao seu plano)
        if (isLast) {
            instructionStack.push(`
            - PHASE: RESOLUTION & CALL TO ACTION (CTA)
            - Anchor the feelings of peace.
            - CRITICAL: The speaker MUST explicitly and warmly ask the listener to subscribe to "${channelName}" to sustain this frequency.
            - End with a final blessing.
            `);
        }

        const systemInstruction = `
        You are a Master of Guided Prayer and Erickson Hypnosis.
        
        STRICT RULES:
        1. CHARACTERS: Dialogue exclusively between "Roberta Erickson" (Soft, NLP Guide) and "Milton Dilts" (Deep, Hypnotic Voice).
        2. FORMAT: Always start lines with "Roberta Erickson:" or "Milton Dilts:".
        3. MANDATORY BIBLE: Weave in the life and wisdom of Jesus Christ, Solomon, or David. They are not just names, they are the power behind the prayer.
        4. NO META-DATA: NO stage directions, no (Pause), no [Voice lowers]. Just the spoken text.
        5. LANGUAGE: Strictly ${targetLang}.
        `;

        const userPrompt = `
        Write Part ${i + 1}/${numIterations} of the script (~${targetWordsPerBlock} words).
        
        PHASE INSTRUCTIONS:
        ${instructionStack.join("\n")}

        ${!isFirst ? `PREVIOUS FLOW: "...${lastContext.slice(-200)}"` : ""}
        `;

        try {
            const result = await ai.models.generateContent({
                model,
                contents: userPrompt,
                config: { systemInstruction, temperature: 0.82 } 
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

// --- PRIME SEO MARKETING ENGINEERING ---

export const generateSocialMediaPost = async (prayer: string, language: string): Promise<SocialMediaPost> => {
    const model = 'gemini-3-flash-preview';
    const langMap: {[key: string]: string} = { 'pt': 'Português', 'en': 'Inglês', 'es': 'Espanhol' };
    const targetLang = langMap[language] || 'Inglês';

    const prompt = `
    You are a PRIME LEVEL SEO & Neuromarketing Strategist.
    Create a high-conversion Instagram post for this prayer: "${prayer.substring(0, 500)}..."
    
    NEURO-TITLES FORMULAS (Choose one for the 'title' field):
    1. Pattern Interrupt: "Pare de orar do jeito errado."
    2. Curiosity Gap: "O que Jesus disse sobre o seu [Problema] e ninguém te contou."
    3. Authority: "A arquitetura mental de Salomão aplicada ao seu dia."
    
    Output JSON in ${targetLang}:
    {
        "title": "A prime-level, magnetic headline",
        "description": "Caption using AIDA + Biblical Anchoring",
        "hashtags": ["tag1", "tag2", "tag3", "tag4", "tag5"]
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
    const model = 'gemini-3-flash-preview';
    const langMap: {[key: string]: string} = { 'pt': 'Português', 'en': 'Inglês', 'es': 'Espanhol' };
    const targetLang = langMap[language] || 'Inglês';
    const channelName = language === 'pt' ? 'Fé em 10 Minutos' : 'Faith in 10 Minutes'; 

    let linksBlock = language === 'pt' ? 
        `🌌 JORNADA PIC:\n► SÉRIE PORTAIS: [https://www.youtube.com/watch?v=Q6x_C3uaKsQ&list=PLmeEfeSNeLbIyeBMB8HLrHwybI__suhgq]\n► ARQUITETURA DA ALMA: https://www.youtube.com/playlist?list=PLmeEfeSNeLbIIm3MzGHSRFYfIONlBDofI\n🔗 INSCREVA-SE: https://www.youtube.com/@fe10minutos` :
        `🕊️ NEXT STEPS:\n► Soul Architecture: https://www.youtube.com/playlist?list=PLTQIQ5QpCYPo11ap1JUSiItZtoiV_4lEH\n🔗 SUBSCRIBE: https://www.youtube.com/@Faithin10Minutes`;

    const systemInstruction = `
    You are a YouTube GROWTH EXPERT and SEO Master.
    Generate metadata for a ${duration}min video about "${theme}".
    
    PRIME SEO STRATEGY:
    - Title: Use "The Negative Hook" or "The Forbidden Wisdom" archetypes.
    - Description: First 2 lines must be high-impact hooks.
    - Tags: Use semantic clusters (LSI keywords).
    `;

    const prompt = `
    Generate JSON in ${targetLang}:
    {
        "title": "PRIME LEVEL SEO TITLE (Magnetic)",
        "description": "NLP Description + Mandatory Links:\n${linksBlock}",
        "hashtags": ["#string", "#string", "#string"],
        "timestamps": "string (Thematic chapters)",
        "tags": ["string", "string", "string"]
    }
    `;

    const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: { responseMimeType: "application/json", systemInstruction }
    });
    return JSON.parse(response.text || "{}");
};

export const getTrendingTopic = async (language: string, type: 'long' | 'short'): Promise<{theme: string, subthemes: string[]}> => {
    const themes = language === 'pt' ? 
        ['Cura e Arquétipo de Cristo', 'Prosperidade e o Templo de Salomão', 'A Coragem de Davi contra Gigantes Mentais'] :
        ['Healing and Christ Archetype', 'Prosperity and Solomon\'s Temple', 'David\'s Courage vs Mental Giants'];
    const randomTheme = themes[Math.floor(Math.random() * themes.length)];
    return { theme: randomTheme, subthemes: ['Indução', 'O Coração do Arquétipo', 'Resolução'] };
};
