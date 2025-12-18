
import { GoogleGenAI, Modality } from '@google/genai';
import { writeChunkToStream } from '../utils/opfsUtils';
import { createWavHeader } from '../utils/audio';

export interface MultiSpeakerConfig {
    speakers: { name: string; voice: string }[];
}

// --- SURGICAL TEXT CLEANING (FIX FOR DISTORTION, ACCENT & META-INFO) ---
const cleanTextForSpeech = (text: string): string => {
    return text
        // 1. Remove Stage Directions & Meta-info
        .replace(/\([^)]*\)/g, "")
        .replace(/\[[^\]]*\]/g, "")
        .replace(/\*[^*]*\*/g, "")
        .replace(/_[^_]*_/g, "")
        
        // 2. Remove Emojis and non-standard symbols
        .replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDC00-\uDFFF])/g, '')
        
        // 3. Remove Special Symbols
        .replace(/[#$@^&\\|<>~*]/g, "")
        
        // 4. Normalize quotes and dashes
        .replace(/[""]/g, "")
        .replace(/[-–—]/g, " ")
        
        // 5. Clean up extra whitespace
        .replace(/\s+/g, " ")
        .trim();
};

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
    const MAX_CHARS = 700; 

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
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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
            // MANTENDO COERÊNCIA PIC: Roberta=Aoede, Milton=Enceladus
            let voiceName = 'Aoede'; 
            const speakerLower = block.speaker.toLowerCase();
            
            if (multiSpeakerConfig) {
                const speakerMap = multiSpeakerConfig.speakers.find(s => 
                    speakerLower.includes(s.name.toLowerCase().split(' ')[0])
                );
                if (speakerMap) {
                    voiceName = speakerMap.voice;
                }
            } else if (speakerLower.includes("milton") || speakerLower.includes("dilts")) {
                voiceName = "Enceladus";
            } else if (speakerLower.includes("roberta") || speakerLower.includes("erickson")) {
                voiceName = "Aoede";
            }

            const cleanedText = cleanTextForSpeech(block.text);
            if (!cleanedText.trim()) {
                processedBlocks++;
                continue;
            }

            // PROMPT OTIMIZADO: Focado em fluidez orgânica e expressividade humana real.
            // Removidos termos que forçavam a IA a falar de forma "arrastada".
            const ttsPrompt = `Read this with the natural cadence of a human storyteller. Use meaningful pauses between sentences for a therapeutic and reflective feel, but keep the speech clear, rhythmic, and fluid. Do not speak unnaturally slowly or distort the voice. Text: ${cleanedText}`;

            const response = await ai.models.generateContent({
                model,
                contents: [{ parts: [{ text: ttsPrompt }] }],
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
            }

            processedBlocks++;
            if (callbacks?.onProgress) {
                callbacks.onProgress(Math.round((processedBlocks / totalBlocks) * 100));
            }

            // Delay de segurança contra rate limit
            await new Promise(r => setTimeout(r, 200)); 

        } catch (e: any) {
            console.error(`TTS Generation Error (Block ${processedBlocks + 1}):`, e);
            if (callbacks?.onError) {
                const errorInfo = e.message || "Internal Service Error";
                callbacks.onError(`Error generating block ${processedBlocks + 1}: ${errorInfo}`);
            }
            break; 
        }
    }

    if (writable) {
        try {
            const realHeaderBlob = createWavHeader(totalPcmBytes, 1, 24000, 16);
            const realHeaderBytes = new Uint8Array(await realHeaderBlob.arrayBuffer());
            await writable.seek(0);
            await writeChunkToStream(writable, realHeaderBytes);
            await writable.close();
        } catch (e) {
            console.error("Error finalizing WAV file in OPFS:", e);
        }
    }

    if (callbacks?.onComplete) callbacks.onComplete();
};
