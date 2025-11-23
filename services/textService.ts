import { ai } from './geminiClient';
import { YouTubeLongPost, SocialMediaPost } from '../types';

// --- CORE GENERATION FUNCTIONS ---

export const generateGuidedPrayer = async (prompt: string, language: string, duration: number = 10): Promise<string> => {
    const model = 'gemini-2.5-flash'; // Using Flash for high-volume text generation
    
    // Language Map
    const langMap: {[key: string]: string} = { 'pt': 'Português', 'en': 'Inglês', 'es': 'Espanhol' };
    const targetLang = langMap[language] || 'Inglês';

    // Calculate iterations based on duration to ensure density
    // 10 min = 2 calls (approx 2500 words) -> High Density
    // 60 min = 8 calls (approx 10000 words)
    const numIterations = Math.ceil(duration / 7); 
    let fullPrayer = "";
    let lastContext = "";

    console.log(`Starting Recursive Generation: ${duration} min = ${numIterations} iterations.`);

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
        Duration target for this block: ~8 minutes of spoken text (approx 1200 words).
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
    // Short prayer (pills) doesn't need recursion
    return generateGuidedPrayer(prompt, language, 5); 
};

// --- MARKETING ASSETS GENERATION ---

export const generateSocialMediaPost = async (prayer: string, language: string): Promise<SocialMediaPost> => {
    const model = 'gemini-2.5-flash';
    const prompt = `
    You are a Social Media Manager for a spiritual channel.
    Create a viral Instagram/TikTok caption for this prayer: "${prayer.substring(0, 500)}..."
    Language: ${language}
    
    Output format JSON:
    {
        "title": "Catchy Hook (Max 50 chars)",
        "description": "Engaging caption with emojis (Max 300 chars)",
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
    const isPT = language === 'pt';
    
    // Define Static Blocks based on Language (Strict Identity)
    const linksBlock = isPT ? `
🌌 PARTICIPE DESTA JORNADA:

► SÉRIE: Portais da Consciência (Playlist): [https://www.youtube.com/watch?v=Q6x_C3uaKsQ&list=PLmeEfeSNeLbIyeBMB8HLrHwybI__suhgq]

► SÉRIE: ARQUITETURA DA ALMA (Playlist): https://www.youtube.com/playlist?list=PLmeEfeSNeLbIIm3MzGHSRFYfIONlBDofI

► Oração da Manhã (Playlist): https://www.youtube.com/playlist?list=PLmeEfeSNeLbKppEyZUaBoXw4BVxZTq-I2

► Oração da Noite (Playlist): https://www.youtube.com/playlist?list=PLmeEfeSNeLbLFUayT8Sfb9IQzr0ddkrHC

🔗 INSCREVA-SE NO CANAL: https://www.youtube.com/@fe10minutos
    ` : `
🕊️ WATCH NEXT:

► Architecture of the Soul (Playlist) https://www.youtube.com/playlist?list=PLTQIQ5QpCYPo11ap1JUSiItZtoiV_4lEH

► Morning Prayers (Playlist): https://www.youtube.com/playlist?list=PLTQIQ5QpCYPqym_6TF19PB71SpLpAGuZr

► Evening Prayers (Playlist): https://www.youtube.com/playlist?list=PLTQIQ5QpCYPq91fvXaDSideb8wrnG-YtR

🔗 SUBSCRIBE TO THE CHANNEL: https://www.youtube.com/@Faithin10Minutes
    `;

    const systemInstruction = `
    You are the SEO Expert for the channel '${isPT ? 'Fé em 10 Minutos' : 'Faith in 10 Minutes'}'.
    Task: Create metadata for a ${duration}-minute guided prayer video about "${theme}".
    
    CRITICAL OUTPUT RULES:
    1. **Title**: Must be CLICKBAIT/High-Urgency. Use CAPS and Emojis. Model: "POWERFUL ${duration} MIN PRAYER for [TOPIC] | ${isPT ? 'Fé em 10 Minutos' : 'Faith in 10 Minutes'}".
    2. **Description**: 
       - Paragraph 1: AIDA Copywriting hook (3 sentences). Start by repeating the exact Title.
       - Paragraph 2: Describe the prayer using keywords: "powerful prayer", "guided prayer", "relationship with God".
       - **MANDATORY**: Insert the LINKS BLOCK exactly as provided below (Do not translate URLs or change format).
       - End with 3 strong hashtags: #Prayer #Faith #[TOPIC_No_Space]
    3. **Tags**: Generate 20 high-volume tags mixed with long-tail keywords (e.g., Faith in 10 Minutes, ${duration} Minute Prayer, Powerful Prayer, [TOPIC], Daily Prayer).
    4. **Timestamps**: Generate a list of chapters based on the subthemes. **DO NOT INCLUDE TIME CODES (00:00)**. Just the list of topics (e.g., "Introduction", "Prayer for [Subtheme 1]").
    
    MANDATORY LINKS BLOCK TO INSERT IN DESCRIPTION:
    ${linksBlock}
    `;

    const prompt = `
    Generate JSON for this video:
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
    const themes = language === 'pt' 
        ? ['Cura da Ansiedade', 'Prosperidade Financeira', 'Dormir em Paz', 'Proteção da Família', 'Gratidão Matinal']
        : ['Healing Anxiety', 'Financial Prosperity', 'Sleep in Peace', 'Family Protection', 'Morning Gratitude'];
    
    const randomTheme = themes[Math.floor(Math.random() * themes.length)];
    
    return {
        theme: randomTheme,
        subthemes: ['Introduction', 'Deep Dive', 'Closing']
    };
};
