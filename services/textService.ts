
import { ai } from './geminiClient';
import { YouTubeLongPost, SocialMediaPost } from '../types';

// --- CORE GENERATION FUNCTIONS ---

export const generateGuidedPrayer = async (prompt: string, language: string, duration: number = 10): Promise<string> => {
    const model = 'gemini-2.5-flash'; // Using Flash for high-volume text generation
    
    // Language Map
    const langMap: {[key: string]: string} = { 'pt': 'Português', 'en': 'Inglês', 'es': 'Espanhol' };
    const targetLang = langMap[language] || 'Inglês';

    // --- NEW DURATION LOGIC (Word Count based) ---
    // Average speaking rate for hypnosis/prayer: ~120 words per minute.
    const WORDS_PER_MINUTE = 120;
    const totalTargetWords = duration * WORDS_PER_MINUTE;
    
    // Gemini Flash output limit is somewhat generous, but to ensure quality and prevent cut-offs,
    // we limit each generation block to ~800 words (approx 6-7 minutes of audio).
    const MAX_WORDS_PER_BLOCK = 800;
    
    const numIterations = Math.ceil(totalTargetWords / MAX_WORDS_PER_BLOCK);
    const targetWordsPerBlock = Math.round(totalTargetWords / numIterations);

    let fullPrayer = "";
    let lastContext = "";

    console.log(`Starting Recursive Generation: ${duration} min = ~${totalTargetWords} words. Split into ${numIterations} blocks of ~${targetWordsPerBlock} words.`);

    for (let i = 0; i < numIterations; i++) {
        const isFirst = i === 0;
        const isLast = i === numIterations - 1;
        
        const systemInstruction = `
        You are a Master of Guided Prayer and Erickson Hypnosis.
        Your goal is to write a DEEPLY THERAPEUTIC dialogue script.
        
        CRITICAL RULES:
        1. CHARACTERS: The dialogue MUST be exclusively between "Roberta Erickson" (Voice: Aoede, Soft, NLP Guide) and "Milton Dilts" (Voice: Enceladus, Deep, Hypnotic Voice).
        2. FORMAT: Always start lines with "Roberta Erickson:" or "Milton Dilts:". Do NOT use other names.
        3. LANGUAGE: Write strictly in ${targetLang}.
        4. NO META-DATA: Do NOT write introductions like "Here is the script", summaries, or stage directions in parentheses at the start of lines. Just the dialogue.
        5. DENSITY: Write extensive, rich, poetic text. Use sensory descriptions (VAK), loops, and embedded commands.
        6. GOLDEN THREAD: The central theme "${prompt || 'Divine Connection'}" must be woven into every paragraph to maintain focus.
        
        STRUCTURAL GOAL FOR THIS BLOCK (Part ${i + 1} of ${numIterations}):
        ${isFirst ? "- Start with a 'Hypnotic Hook': A provocative question or deep validation of the user's pain to grab attention immediately (First 30s). Then move to induction." : ""}
        ${!isFirst && !isLast ? "- Deepening: Biblical metaphors (David/Solomon/Jesus), PNL ressignification, sensory immersion. Expand on the theme." : ""}
        ${isLast ? "- Anchor the feeling, gratitude, and slowly return. End with a blessing." : ""}
        
        ${!isFirst ? `CONTEXT FROM PREVIOUS BLOCK: "...${lastContext.slice(-300)}"` : ""}
        `;

        const userPrompt = `
        Write Part ${i + 1}/${numIterations} of the prayer about "${prompt}".
        
        LENGTH CONSTRAINT: Write approximately ${targetWordsPerBlock} words for this section.
        This is crucial to fill the time slot. Be verbose, detailed, and slow-paced.
        
        Keep the flow continuous. Start directly with a character name.
        `;

        try {
            const result = await ai.models.generateContent({
                model,
                contents: userPrompt,
                config: { systemInstruction, temperature: 0.7 } // Creative but coherent
            });
            
            const text = result.text || "";
            fullPrayer += text + "\n\n";
            lastContext = text;
        } catch (e) {
            console.error(`Error in block ${i}:`, e);
            // If one block fails, we return what we have so far rather than crashing
            break; 
        }
    }

    return fullPrayer;
};

export const generateShortPrayer = async (prompt: string, language: string): Promise<string> => {
    // Short prayer (pills) default to 5 minutes logic (approx 600 words)
    return generateGuidedPrayer(prompt, language, 5); 
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
    // We keep the English name for ES to maintain brand identity, but the content must be Spanish.
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
