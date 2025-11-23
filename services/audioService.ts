import { ai } from './geminiClient';
import { writeChunkToStream } from '../utils/opfsUtils';

export interface MultiSpeakerConfig {
    speakers: { name: string; voice: string }[];
}

// Helper to clean stage directions from the start of lines for TTS
const cleanTextForSpeech = (text: string): string => {
    // Removes (Softly), [Pause], etc., only if they appear at the start of a line or sentence
    // Preserves internal emphasis like *stars* or (biblical references) inside the sentence.
    return text.replace(/^\s*[\(\[][^)\]]*[\)\]]\s*/gm, "");
};

// --- SPEECH GENERATION (BLADE RUNNER ARCHITECTURE) ---

const parseDialogueIntoChunks = (text: string): { speaker: string; text: string }[] => {
    const lines = text.split('\n');
    const chunks: { speaker: string; text: string }[] = [];
    let currentSpeaker = 'Narrator'; // Default
    let currentBuffer = '';

    // Regex to detect "Name:" pattern
    const speakerRegex = /^([A-Za-zÀ-ÖØ-öø-ÿ ]+):/i;

    for (const line of lines) {
        const match = line.match(speakerRegex);
        if (match) {
            // If we have a buffer for the previous speaker, push it
            if (currentBuffer.trim()) {
                chunks.push({ speaker: currentSpeaker, text: currentBuffer.trim() });
            }
            // Start new speaker
            currentSpeaker = match[1].trim();
            currentBuffer = line.replace(speakerRegex, '').trim();
        } else {
            // Append to current speaker
            if (line.trim()) {
                currentBuffer += ' ' + line.trim();
            }
        }
    }
    // Push final buffer
    if (currentBuffer.trim()) {
        chunks.push({ speaker: currentSpeaker, text: currentBuffer.trim() });
    }

    // Further split very long chunks to avoid TTS timeouts
    const finalChunks: { speaker: string; text: string }[] = [];
    const MAX_CHARS = 1500; 

    for (const chunk of chunks) {
        if (chunk.text.length > MAX_CHARS) {
            // Split by sentences roughly
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
    const model = 'gemini-2.5-flash-preview-tts'; // Correct TTS model
    const blocks = parseDialogueIntoChunks(text);
    const totalBlocks = blocks.length;
    let processedBlocks = 0;

    // Open writable stream if OPFS is used
    let writable: FileSystemWritableFileStream | null = null;
    if (opfsFileHandle) {
        writable = await opfsFileHandle.createWritable({ keepExistingData: false });
    }

    for (const block of blocks) {
        try {
            // Determine voice
            let voiceName = 'Aoede'; // Default female
            if (multiSpeakerConfig) {
                const speakerMap = multiSpeakerConfig.speakers.find(s => 
                    block.speaker.toLowerCase().includes(s.name.toLowerCase().split(' ')[0]) // Match first name
                );
                if (speakerMap) voiceName = speakerMap.voice;
            }

            // Surgical Clean: Remove stage directions from start of speech only
            const textToSpeak = cleanTextForSpeech(block.text);
            if (!textToSpeak.trim()) continue;

            const response = await ai.models.generateContent({
                model,
                contents: { parts: [{ text: textToSpeak }] },
                config: {
                    responseModalities: ['AUDIO'],
                    speechConfig: {
                        voiceConfig: { prebuiltVoiceConfig: { voiceName } }
                    }
                }
            });

            const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            
            if (audioData) {
                // Decode Base64 to Uint8Array
                const binaryString = atob(audioData);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }

                if (writable) {
                    await writeChunkToStream(writable, bytes);
                } else if (callbacks?.onChunk) {
                    callbacks.onChunk(bytes);
                }
            }

            processedBlocks++;
            if (callbacks?.onProgress) {
                callbacks.onProgress(Math.round((processedBlocks / totalBlocks) * 100));
            }

            // Small delay to be gentle on rate limits
            await new Promise(r => setTimeout(r, 100));

        } catch (e: any) {
            console.error("TTS Generation Error on block:", block, e);
            if (callbacks?.onError) callbacks.onError(`Error generating audio for block ${processedBlocks + 1}`);
            // Continue to next block to salvage what we can
        }
    }

    if (writable) {
        await writable.close();
    }

    if (callbacks?.onComplete) callbacks.onComplete();
};
