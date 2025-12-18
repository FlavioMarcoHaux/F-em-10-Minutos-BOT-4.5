
import { GoogleGenAI, Modality } from '@google/genai';
import { writeChunkToStream } from '../utils/opfsUtils';
import { createWavHeader } from '../utils/audio';

export interface MultiSpeakerConfig {
    speakers: { name: string; voice: string }[];
}

// --- SURGICAL TEXT CLEANING (FIX FOR DISTORTION, ACCENT & META-INFO) ---

const cleanTextForSpeech = (text: string): string => {
    return text
        // 1. Remove Stage Directions & Meta-info: (Softly), [Pause], *whispers*, (Voz calma)
        .replace(/\([^)]*\)/g, "")
        .replace(/\[[^\]]*\]/g, "")
        .replace(/\*[^*]*\*/g, "")
        .replace(/_[^_]*_/g, "")
        
        // 2. Remove Emojis (The primary cause of "robotic/pipe" distortion)
        .replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDC00-\uDFFF])/g, '')
        
        // 3. Remove Special Symbols that trip up TTS engines
        .replace(/[#$@^&\\|<>~*]/g, "")
        
        // 4. Normalize quotes and dashes
        .replace(/[""]/g, "")
        .replace(/[-–—]/g, " ")
        
        // 5. Clean up extra whitespace resulting from removals
        .replace(/\s+/g, " ")
        .trim();
};

// --- DIALOGUE PARSING ---

const parseDialogueIntoChunks = (text: string): { speaker: string; text: string }[] => {
    const lines = text.split('\n');
    const chunks: { speaker: string; text: string }[] = [];
    let currentSpeaker = 'Narrator';
    let currentBuffer = '';

    const speakerRegex = /^([A-Za-zÀ-ÖØ-öø-ÿ ]+):/i;

    for (const line of lines) {
        const match = line.match(speakerRegex);
        if (match) {
            if (currentBuffer.trim()) {
                chunks.push({ speaker: currentSpeaker, text: currentBuffer.trim() });
            }
            currentSpeaker = match[1].trim();
            currentBuffer = line.replace(speakerRegex, '').trim();
        } else {
            if (line.trim()) {
                currentBuffer += ' ' + line.trim();
            }
        }
    }
    if (currentBuffer.trim()) {
        chunks.push({ speaker: currentSpeaker, text: currentBuffer.trim() });
    }

    const finalChunks: { speaker: string; text: string }[] = [];
    const MAX_CHARS = 800; // Reduced chunk size for better stability

    for (const chunk of chunks) {
        if (chunk.text.length > MAX_CHARS) {
            const sentences = chunk.text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [chunk.text];
            let temp = '';
            for (const sentence of sentences) {
                if ((temp + sentence).length > MAX_CHARS) {
                    finalChunks.push({ speaker: chunk.speaker, text: temp });
                    temp = sentence;
                } else {
                    temp += temp ? ' ' + sentence : sentence;
                }
            }
            if (temp) finalChunks.push({ speaker: chunk.speaker, text: temp });
        } else {
            finalChunks.push(chunk);
        }
    }

    return finalChunks;
};

export const generateSpeech = async (
    text: string, 
    multiSpeakerConfig?: MultiSpeakerConfig,
    callbacks?: {
        onChunk?: (data: Uint8Array) => void,
        onProgress?: (progress: number) => void,
        onComplete?: () => void,
        onError?: (msg: string) => void
    },
    opfsFileHandle?: FileSystemFileHandle
): Promise<void> => {
    // Re-initialize AI client to ensure fresh API key context
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Model changed to 'gemini-2.5-flash-native-audio-preview-09-2025' to support Aoede and Enceladus voices correctly
    const model = 'gemini-2.5-flash-native-audio-preview-09-2025'; 
    
    const blocks = parseDialogueIntoChunks(text);
    const totalBlocks = blocks.length;
    let processedBlocks = 0;
    let totalPcmBytes = 0;

    let writable: FileSystemWritableFileStream | null = null;
    if (opfsFileHandle) {
        writable = await opfsFileHandle.createWritable({ keepExistingData: false });
        const placeholderHeaderBlob = createWavHeader(0, 1, 24000, 16);
        const headerBytes = new Uint8Array(await placeholderHeaderBlob.arrayBuffer());
        await writeChunkToStream(writable, headerBytes);
    }

    for (const block of blocks) {
        try {
            // Defaulting to requested voices
            let voiceName = 'Aoede'; 
            if (multiSpeakerConfig) {
                const speakerMap = multiSpeakerConfig.speakers.find(s => 
                    block.speaker.toLowerCase().includes(s.name.toLowerCase().split(' ')[0])
                );
                if (speakerMap) {
                    voiceName = speakerMap.voice; // Should be Aoede or Enceladus
                }
            } else if (block.speaker.toLowerCase().includes("milton")) {
                voiceName = "Enceladus";
            } else if (block.speaker.toLowerCase().includes("roberta")) {
                voiceName = "Aoede";
            }

            const cleanedText = cleanTextForSpeech(block.text);
            if (!cleanedText.trim()) {
                processedBlocks++;
                continue;
            }

            // Using generateContent with specific audio config for the Native Audio model
            const response = await ai.models.generateContent({
                model,
                contents: [{ parts: [{ text: cleanedText }] }],
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: { 
                            prebuiltVoiceConfig: { voiceName } 
                        }
                    },
                }
            });

            const audioPart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
            const audioData = audioPart?.inlineData?.data;
            
            if (audioData) {
                // Manual base64 decode as per guidelines
                const binaryString = atob(audioData);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }

                if (writable) {
                    await writeChunkToStream(writable, bytes);
                    totalPcmBytes += bytes.length;
                }
                
                if (callbacks?.onChunk) {
                    callbacks.onChunk(bytes);
                }
            } else {
                console.warn(`No audio data returned for block ${processedBlocks + 1}`);
            }

            processedBlocks++;
            if (callbacks?.onProgress) {
                callbacks.onProgress(Math.round((processedBlocks / totalBlocks) * 100));
            }

            // Brief delay to prevent rate limit (429) errors
            await new Promise(r => setTimeout(r, 250)); 

        } catch (e: any) {
            console.error(`Audio Generation Error (Block ${processedBlocks + 1}):`, e);
            if (callbacks?.onError) {
                const errorMsg = e.message || "Internal error";
                callbacks.onError(`Error generating block ${processedBlocks + 1}: ${errorMsg}`);
            }
            break; // Stop on first fatal error
        }
    }

    if (writable) {
        try {
            // Finalize header with correct data size
            const realHeaderBlob = createWavHeader(totalPcmBytes, 1, 24000, 16);
            const realHeaderBytes = new Uint8Array(await realHeaderBlob.arrayBuffer());
            await writable.seek(0);
            await writeChunkToStream(writable, realHeaderBytes);
            await writable.close();
        } catch (e) {
            console.error("Error finalizing WAV file:", e);
        }
    }

    if (callbacks?.onComplete) callbacks.onComplete();
};
