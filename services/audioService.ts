
import { GoogleGenAI, Modality } from '@google/genai';
import { writeChunkToStream } from '../utils/opfsUtils';
import { createWavHeader } from '../utils/audio';

export interface MultiSpeakerConfig {
    speakers: { name: string; voice: string }[];
}

const cleanTextForSpeech = (text: string): string => {
    return text
        .replace(/\([^)]*\)/g, "")
        .replace(/\[[^\]]*\]/g, "")
        .replace(/\*[^*]*\*/g, "")
        .replace(/_[^_]*_/g, "")
        .replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDC00-\uDFFF])/g, '')
        .replace(/[#$@^&\\|<>~*]/g, "")
        .replace(/[""]/g, "")
        .replace(/[-–—]/g, " ")
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
    const MAX_CHARS = 600; 

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

            // INSTRUÇÃO REFINADA: Pedimos fluidez e ritmo humano. 
            // Retiramos palavras que induzem a IA a ficar "arrastada".
            const ttsPrompt = `Fale de forma clara, acolhedora e natural, como em uma conversa profunda e tranquila. Mantenha um ritmo humano orgânico, com pausas breves e naturais para respiração. Evite lentidão excessiva ou distorção. Texto: ${cleanedText}`;

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

            await new Promise(r => setTimeout(r, 150)); 

        } catch (e: any) {
            console.error(`TTS Error:`, e);
            if (callbacks?.onError) callbacks.onError(e.message || "TTS Error");
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
            console.error("Error finalizing WAV:", e);
        }
    }

    if (callbacks?.onComplete) callbacks.onComplete();
};
