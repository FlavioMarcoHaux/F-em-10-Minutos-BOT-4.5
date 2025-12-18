

import { ai } from './geminiClient';
import { YouTubeLongPost, SocialMediaPost } from '../types';

// --- CORE GENERATION FUNCTIONS ---

export interface UserContext {
    name?: string;
    birthDate?: string;
    birthPlace?: string;   // Changed from location
    currentPlace?: string; // New
}

// PIC: Deep Research Function
const getSpiritualDossier = async (userData: UserContext, language: string, onStatusUpdate?: (status: string) => void): Promise<string> => {
    const model = 'gemini-2.5-flash';
    const langMap: {[key: string]: string} = { 'pt': 'Português', 'en': 'Inglês', 'es': 'Espanhol' };
    const targetLang = langMap[language] || 'Inglês';

    if (onStatusUpdate) onStatusUpdate('picLoadingResearch');

    const prompt = `
    Deep Research Task (PIC - Principle of Conscious Information):
    
    Target User Profile:
    - Name: ${userData.name || "Unknown"}
    - Birth Date: ${userData.birthDate || "Not provided"}
    - Origin (Roots): ${userData.birthPlace || "Unknown"}
    - Current Context (Soil): ${userData.currentPlace || "Unknown"}

    INSTRUCTIONS:
    1. SEARCH (using Google Search) for:
       - The spiritual, etymological, and biblical meaning of the Name.
       ${userData.birthDate ? `- The generational context or "Spirit of the Time" for the birth date: ${userData.birthDate}.` : ""}
       - The spiritual atmosphere, history, or "roots" of the Birth Place (${userData.birthPlace}).
       - The spiritual atmosphere, challenges, or "climate" of the Current Place (${userData.currentPlace}).
    
    2. ANALYZE THE JOURNEY (The "Exodus"):
       - Connect the Roots (Birth) to the Soil (Current). How does where they came from empower them for where they are?
       - Find a metaphor for this movement.
       - Identify a biblical archetype fitting this trajectory.

    OUTPUT:
    Return a concise but deep paragraph (in ${targetLang}) summarizing this "Soul Dossier".
    Start with: "CONTEXTO ESPIRITUAL (PIC):"
    `;

    try {
        const result = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }] // Enable Grounding
            }
        });

        // The result will contain the synthesized text based on the search
        let dossier = result.text || "";
        
        // Append grounding links if available (optional, but good for "truth")
        // For the prayer generation, we mainly need the text content.
        
        return dossier;
    } catch (e) {
        console.error("Deep Research Failed", e);
        return `Context: User ${userData.name}. Journey from ${userData.birthPlace || 'unknown'} to ${userData.currentPlace || 'unknown'}.`; // Fallback
    }
};

export const generatePersonalizedPrayer = async (
    userData: UserContext, 
    language: string, 
    duration: number,
    onStatusUpdate?: (status: string) => void
): Promise<string> => {
    // 1. Get the Deep Research Dossier
    const dossier = await getSpiritualDossier(userData, language, onStatusUpdate);
    
    if (onStatusUpdate) onStatusUpdate('picLoadingSynthesizing');

    // 2. Use the Dossier as the "Prompt" for the existing engine
    // We wrap it to ensure the model understands this is a dossier, not just a simple theme.
    const augmentedPrompt = `
    [DEEP PERSONALIZATION REQUEST]
    Use the following Deep Research Dossier to customize the prayer.
    Integrate the specific meanings of the name, the journey from origin to current location, and the date significance (if present) into the Hypnotic Script.
    
    ${dossier}
    `;

    // 3. Call the standard generator with the augmented prompt
    return generateGuidedPrayer(augmentedPrompt, language, duration);
};

export const generateGuidedPrayer = async (prompt: string, language: string, duration: number = 10): Promise<string> => {
    const model = 'gemini-2.5-flash'; // Using Flash for high-volume text generation
    
    // Language Map
    const langMap: {[key: string]: string} = { 'pt': 'Português', 'en': 'Inglês', 'es': 'Espanhol' };
    const targetLang = langMap[language] || 'Inglês';

    // Channel Name Logic for CTA
    const channelName = language === 'pt' ? 'Fé em 10 Minutos' : 'Faith in 10 Minutes';

    // --- DURATION LOGIC (Word Count based) ---
    // Calibrated to 160 WPM to ensure audio duration matches target.
    // 5 min = 800 words. 10 min = 1600 words.
    const WORDS_PER_MINUTE = 160;
    const totalTargetWords = duration * WORDS_PER_MINUTE;
    
    // We split into blocks to ensure the model doesn't lose coherence.
    const MAX_WORDS_PER_BLOCK = 800;
    
    const numIterations = Math.max(1, Math.ceil(totalTargetWords / MAX_WORDS_PER_BLOCK));
    const targetWordsPerBlock = Math.round(totalTargetWords / numIterations);

    let fullPrayer = "";
    let lastContext = "";

    console.log(`Starting Recursive Generation: ${duration} min = ~${totalTargetWords} words. Split into ${numIterations} blocks of ~${targetWordsPerBlock} words.`);

    for (let i = 0; i < numIterations; i++) {
        const isFirst = i === 0;
        const isLast = i === numIterations - 1;
        
        // --- INSTRUCTION STACKING ARCHITECTURE ---
        // Instead of choosing ONE instruction, we stack them based on the phase.
        // This ensures a 1-block prayer gets Start + Body + End instructions.
        
        const instructionStack: string[] = [];

        // 1. PHASE: OPENING (Always for Block 0)
        if (isFirst) {
            instructionStack.push(`
            - PHASE: INDUCTION & HOOK (Opening)
            - Start with a 'Hypnotic Hook': A provocative question or deep validation of the user's pain to grab attention immediately (First 30s).
            - Establish the Biblical Archetype or Metaphor for this session early on.
            - IF A PERSONAL DOSSIER IS PROVIDED: Use the name, location energy, and specific meaning immediately to create rapport.
            `);
        } else {
             instructionStack.push(`
            - PHASE: CONTINUATION
            - Continue the narrative flow seamlessly from the previous block. Do not repeat greetings.
             `);
        }

        // 2. PHASE: DEEPENING (Body Content - Needed for ALL blocks to add density)
        instructionStack.push(`
        - PHASE: DEEPENING & THERAPY
        - Use NLP loops, sensory descriptions (VAK), and embedded commands.
        - Biblical metaphors (David/Solomon/Jesus) applied to modern psychology.
        - Expand on the theme/dossier provided: "${prompt || 'Divine Connection'}". 
        - BE VERBOSE AND DESCRIPTIVE. Do not rush.
        `);

        // 3. PHASE: CLOSING (Always for the Last Block)
        if (isLast) {
            instructionStack.push(`
            - PHASE: RESOLUTION & CALL TO ACTION (CTA)
            - Anchor the feelings of peace and resolution.
            - CRITICAL: Before the final blessing, the speaker MUST explicitly ask the listener to subscribe to the channel "${channelName}" to continue their spiritual journey. This request must be warm and integrated into the dialogue.
            - End with a final blessing.
            `);
        }

        const specificInstructions = instructionStack.join("\n");

        const systemInstruction = `
        You are a Master of Guided Prayer and Erickson Hypnosis.
        Your goal is to write a DEEPLY THERAPEUTIC dialogue script.
        
        CRITICAL RULES:
        1. CHARACTERS: The dialogue MUST be exclusively between "Roberta Erickson" (Voice: Aoede, Soft, NLP Guide) and "Milton Dilts" (Voice: Enceladus, Deep, Hypnotic Voice).
        2. FORMAT: Always start lines with "Roberta Erickson:" or "Milton Dilts:". Do NOT use other names.
        3. LANGUAGE: Write strictly in ${targetLang}.
        4. NO META-DATA: Do NOT write introductions, summaries, or stage directions. Just the dialogue.
        5. TONE: Hypnotic, slow, rhythmic, spiritual but grounded in psychology.
        
        INSTRUCTIONS FOR THIS BLOCK (Part ${i + 1} of ${numIterations}):
        ${specificInstructions}
        
        ${!isFirst ? `CONTEXT FROM PREVIOUS BLOCK: "...${lastContext.slice(-300)}"` : ""}
        `;

        const userPrompt = `
        Write Part ${i + 1}/${numIterations} of the prayer about "${prompt}".
        
        LENGTH CONSTRAINT: Write approximately ${targetWordsPerBlock} words for this section.
        This is crucial to fit the time limit. Do not summarize. Be verbose.
        
        Keep the flow continuous. Start directly with a character name.
        `;

        try {
            const result = await ai.models.generateContent({
                model,
                contents: userPrompt,
                config: { systemInstruction, temperature: 0.7 } 
            });
            
            const text = result.text || "";
            fullPrayer += text + "\n\n";
            lastContext = text;
        } catch (e) {
            console.error(`Error in block ${i}:`, e);
            break; 
        }
    }

    return fullPrayer;
};

export const generateShortPrayer = async (prompt: string, language: string): Promise<string> => {
    // "Pills" are meant to be short. 5 minutes (800 words) might be too long for a "Pill".
    // Setting to 2 minutes (~320 words) for a punchy, short prayer.
    return generateGuidedPrayer(prompt, language, 2); 
};

// --- MARKETING ASSETS GENERATION ---

export const generateSocialMediaPost = async (prayer: string, language: string): Promise<SocialMediaPost> => {
    const model = 'gemini-2.5-flash';
    const langMap: {[key: string]: string} = { 'pt': 'Português', 'en': 'Inglês', 'es': 'Espanhol' };
    const targetLang = langMap[language] || 'Inglês';

    const prompt = `
    You are a Social Media Manager for a spiritual channel.
    Create a viral Instagram/TikTok caption for this prayer: "${prayer.substring(0, 500)}..."
    
    CRITICAL: The output language for the Title, Description and Hashtags MUST BE: ${targetLang}.
    Do NOT output in English unless the target language is English.
    
    Output format JSON:
    {
        "title": "Catchy Hook (Max 50 chars) in ${targetLang}",
        "description": "Engaging caption with emojis (Max 300 chars) in ${targetLang}",
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
    const model = 'gemini-2.5-flash';
    
    const langMap: {[key: string]: string} = { 'pt': 'Português', 'en': 'Inglês', 'es': 'Espanhol' };
    const targetLang = langMap[language] || 'Inglês';
    
    const isPT = language === 'pt';
    const isES = language === 'es';
    
    // Channel Name logic
    const channelName = isPT ? 'Fé em 10 Minutos' : 'Faith in 10 Minutes'; 

    // Define Static Links Blocks based on Language
    let linksBlock = '';

    if (isPT) {
        linksBlock = `
🌌 PARTICIPE DESTA JORNADA:
► SÉRIE: Portais da Consciência (Playlist): [https://www.youtube.com/watch?v=Q6x_C3uaKsQ&list=PLmeEfeSNeLbIyeBMB8HLrHwybI__suhgq]
► SÉRIE: ARQUITETURA DA ALMA (Playlist): https://www.youtube.com/playlist?list=PLmeEfeSNeLbIIm3MzGHSRFYfIONlBDofI
► Oração da Manhã (Playlist): https://www.youtube.com/playlist?list=PLmeEfeSNeLbKppEyZUaBoXw4BVxZTq-I2
► Oração da Noite (Playlist): https://www.youtube.com/playlist?list=PLmeEfeSNeLbLFUayT8Sfb9IQzr0ddkrHC
🔗 INSCREVA-SE NO CANAL: https://www.youtube.com/@fe10minutos
        `;
    } else if (isES) {
        linksBlock = `
🕊️ MIRA A CONTINUACIÓN:
► Arquitectura del Alma (Playlist): https://www.youtube.com/playlist?list=PLTQIQ5QpCYPo11ap1JUSiItZtoiV_4lEH
► Oraciones Matutinas (Playlist): https://www.youtube.com/playlist?list=PLTQIQ5QpCYPqym_6TF19PB71SpLpAGuZr
► Oraciones Vespertinas (Playlist): https://www.youtube.com/playlist?list=PLTQIQ5QpCYPq91fvXaDSideb8wrnG-YtR
🔗 SUSCRÍBETE AL CANAL: https://www.youtube.com/@Faithin10Minutes
        `;
    } else {
        // English Default
        linksBlock = `
🕊️ WATCH NEXT:
► Architecture of the Soul (Playlist) https://www.youtube.com/playlist?list=PLTQIQ5QpCYPo11ap1JUSiItZtoiV_4lEH
► Morning Prayers (Playlist): https://www.youtube.com/playlist?list=PLTQIQ5QpCYPqym_6TF19PB71SpLpAGuZr
► Evening Prayers (Playlist): https://www.youtube.com/playlist?list=PLTQIQ5QpCYPq91fvXaDSideb8wrnG-YtR
🔗 SUBSCRIBE TO THE CHANNEL: https://www.youtube.com/@Faithin10Minutes
        `;
    }

    const systemInstruction = `
    You are the SEO Expert for the channel '${channelName}'.
    Task: Create metadata for a ${duration}-minute guided prayer video about "${theme}".
    
    CRITICAL LANGUAGE RULE: ALL OUTPUT (Title, Description, Tags, Timestamps) MUST BE IN ${targetLang.toUpperCase()}.
    Even if the channel name is in English, translate the rest of the text to ${targetLang}.
    
    OUTPUT RULES:
    1. **Title**: Must be CLICKBAIT/High-Urgency in ${targetLang}. Use CAPS and Emojis. 
       Model: "[URGENT/POWERFUL ADJECTIVE] ${duration} MIN [PRAYER/CONNECTION] [TOPIC] | ${channelName}".
    2. **Description**: 
       - Paragraph 1: AIDA Copywriting hook (3 sentences) in ${targetLang}. Start by repeating the exact Title.
       - Paragraph 2: Describe the prayer using high volume keywords in ${targetLang}.
       - **MANDATORY**: Insert the LINKS BLOCK exactly as provided below.
       - End with 3 strong hashtags: #Prayer #Faith #[TOPIC_No_Space] (Translate these tags to ${targetLang}).
    3. **Tags**: Generate 20 high-volume tags mixed with long-tail keywords in ${targetLang}.
    4. **Timestamps**: Generate a list of chapters based on the subthemes in ${targetLang}. **DO NOT INCLUDE TIME CODES (00:00)**. Just the list of topics.
    
    MANDATORY LINKS BLOCK TO INSERT IN DESCRIPTION:
    ${linksBlock}
    `;

    const prompt = `
    Generate JSON for this video in ${targetLang}:
    Theme: ${theme}
    Subthemes: ${subthemes.join(', ')}
    
    Output Schema:
    {
        "title": "string",
        "description": "string (including the links block)",
        "hashtags": ["#string", "#string", "#string"],
        "timestamps": "string (multiline list of topics, NO TIME CODES)",
        "tags": ["string", "string", ...]
    }
    `;

    const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: { 
            responseMimeType: "application/json",
            systemInstruction
        }
    });

    return JSON.parse(response.text || "{}");
};

export const getTrendingTopic = async (language: string, type: 'long' | 'short'): Promise<{theme: string, subthemes: string[]}> => {
    // Simulated Trending Topics for the Agent
    let themes: string[] = [];
    
    if (language === 'pt') {
        themes = ['Cura da Ansiedade', 'Prosperidade Financeira', 'Dormir em Paz', 'Proteção da Família', 'Gratidão Matinal'];
    } else if (language === 'es') {
        themes = ['Sanación de la Ansiedad', 'Prosperidad Financiera', 'Dormir en Paz', 'Protección Familiar', 'Gratitud Matutina'];
    } else {
        themes = ['Healing Anxiety', 'Financial Prosperity', 'Sleep in Peace', 'Family Protection', 'Morning Gratitude'];
    }
    
    const randomTheme = themes[Math.floor(Math.random() * themes.length)];
    
    return {
        theme: randomTheme,
        subthemes: ['Introduction', 'Deep Dive', 'Closing']
    };
};
