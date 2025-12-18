
import { ai } from './geminiClient';
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
    const MAX_CHARS = 1000; 

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
    const model = 'gemini-2.5-flash-preview-tts'; 
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
            let voiceName = 'Aoede'; 
            if (multiSpeakerConfig) {
                const speakerMap = multiSpeakerConfig.speakers.find(s => 
                    block.speaker.toLowerCase().includes(s.name.toLowerCase().split(' ')[0])
                );
                if (speakerMap) voiceName = speakerMap.voice;
            }

            const textToSpeak = cleanTextForSpeech(block.text);
            if (!textToSpeak.trim()) {
                processedBlocks++;
                continue;
            }

            const response = await ai.models.generateContent({
                model,
                contents: { parts: [{ text: textToSpeak }] },
                config: {
                    responseModalities: ['AUDIO'],
                    speechConfig: {
                        voiceConfig: { prebuiltVoiceConfig: { voiceName } }
                    },
                    systemInstruction: "You are a professional Brazilian voice-over artist. Speak in clear Brazilian Portuguese (PT-BR) with a therapeutic tone. NEVER mention symbols, meta-info, or instructions. Focus only on the emotional flow of the words."
                }
            });

            const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            
            if (audioData) {
                const binaryString = atob(audioData);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }

                if (writable) {
                    await writeChunkToStream(writable, bytes);
                    totalPcmBytes += bytes.length;
                } else if (callbacks?.onChunk) {
                    callbacks.onChunk(bytes);
                }
            }

            processedBlocks++;
            if (callbacks?.onProgress) {
                callbacks.onProgress(Math.round((processedBlocks / totalBlocks) * 100));
            }

            await new Promise(r => setTimeout(r, 150)); 

        } catch (e: any) {
            console.error("TTS Generation Error:", e);
            if (callbacks?.onError) callbacks.onError(`Error generating block ${processedBlocks + 1}`);
        }
    }

    if (writable) {
        try {
            const realHeaderBlob = createWavHeader(totalPcmBytes, 1, 24000, 16);
            const realHeaderBytes = new Uint8Array(await realHeaderBlob.arrayBuffer());
            await writable.seek(0);
            await writeChunkToStream(writable, realHeaderBytes);
        } catch (e) {
            console.error("Error writing WAV header:", e);
        }
        await writable.close();
    }

    if (callbacks?.onComplete) callbacks.onComplete();
};
