import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { PollyClient, SynthesizeSpeechCommand, VoiceId, Engine, TextType, OutputFormat } from '@aws-sdk/client-polly';

const polly = new PollyClient({ region: process.env.AWS_REGION || 'us-east-1' });

interface SynthesizeIPARequest {
  ipaText: string;
}

// Clean IPA text for better Polly compatibility
function cleanIPAForPolly(ipaText: string): string {
  // Remove or normalize problematic characters that Polly might not handle well
  return ipaText
    // Normalize tie bars - some systems use different Unicode characters
    .replace(/\u0361/g, '\u035C') // Replace combining double inverted breve with combining double breve below
    // Keep most IPA symbols as-is since we want native IPA pronunciation
    .trim();
}

// Enhanced function to handle vowel length explicitly
function enhanceVowelLength(ipaText: string): string {
  // Pattern to match vowel + length marker
  const vowelLengthPattern = /([aeiouæɑɔəɛɪʊʌɝɚ])ː/g;
  
  return ipaText.replace(vowelLengthPattern, (_, vowel) => {
    // Triple the vowel for length and add pauses
    return `${vowel}${vowel}${vowel}`;
  });
}

// Create SSML with explicit vowel lengthening
function createLongVowelSSML(ipaText: string): string {
  // Pattern to match vowel + length marker
  const vowelLengthPattern = /([aeiouæɑɔəɛɪʊʌɝɚ])ː/g;
  
  return ipaText.replace(vowelLengthPattern, (_, vowel) => {
    // Use prosody with slower rate and repeat the vowel naturally
    return `<prosody rate="x-slow">${vowel}${vowel}${vowel}</prosody>`;
  });
}

// Convert IPA to X-SAMPA as fallback (basic conversion)
function convertIPAToXSampa(ipaText: string): string {
  const ipaToXSampa: Record<string, string> = {
    'θ': 'T',
    'ð': 'D', 
    'ʃ': 'S',
    'ʒ': 'Z',
    'ŋ': 'N',
    'ɑ': 'A',
    'ɔ': 'O',
    'ɛ': 'E',
    'ɪ': 'I',
    'ʊ': 'U',
    'ʌ': 'V',
    'ə': '@',
    'ɚ': '@`',
    'ɝ': '3`',
    'ɾ': '4',
    'ɹ': 'r\\',
    'ʔ': '?',
    'ː': ':',
    'ˈ': '"',
    'ˌ': '%',
    't͡ʃ': 'tS',
    'd͡ʒ': 'dZ',
    't͡s': 'ts',
    'd͡z': 'dz'
  };
  
  let result = ipaText;
  for (const [ipa, xsampa] of Object.entries(ipaToXSampa)) {
    result = result.replace(new RegExp(ipa, 'g'), xsampa);
  }
  return result;
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log('Synthesize IPA request:', JSON.stringify(event, null, 2));

  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const body: SynthesizeIPARequest = JSON.parse(event.body || '{}');
    
    if (!body.ipaText || typeof body.ipaText !== 'string') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'ipaText is required and must be a string' }),
      };
    }

    const ipaText = body.ipaText.trim();
    if (ipaText.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'ipaText cannot be empty' }),
      };
    }

    console.log('Processing IPA text:', ipaText);

    // Clean up IPA text for better Polly compatibility
    const cleanedIpaText = cleanIPAForPolly(ipaText);
    console.log('Cleaned IPA text:', cleanedIpaText);

    // Create different versions for vowel length handling
    const enhancedIpaText = enhanceVowelLength(cleanedIpaText);
    const longVowelSSML = createLongVowelSSML(cleanedIpaText);
    console.log('Enhanced IPA text:', enhancedIpaText);
    console.log('Long vowel SSML:', longVowelSSML);

    // Escape XML special characters for IPA phoneme attribute
    const escapedIpaText = cleanedIpaText
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

    // Escape enhanced IPA for phoneme attribute (remove length markers)
    const escapedEnhancedIpa = enhancedIpaText
      .replace(/ː/g, '') // Remove length markers since we've enhanced the vowels
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

    // Try multiple approaches prioritizing native IPA with enhanced vowels
    const synthesisAttempts = [
      // Attempt 1: Enhanced IPA with tripled vowels in phoneme tag (PRIORITY)
      {
        text: `<speak><phoneme alphabet="ipa" ph="${escapedEnhancedIpa}">${enhancedIpaText.replace(/ː/g, '')}</phoneme></speak>`,
        textType: TextType.SSML,
        voiceId: VoiceId.Joanna,
        engine: Engine.NEURAL,
        description: 'Neural Joanna with enhanced vowel length IPA'
      },
      // Attempt 2: Direct IPA with phoneme tags (native IPA support)
      {
        text: `<speak><phoneme alphabet="ipa" ph="${escapedIpaText}">${escapedIpaText}</phoneme></speak>`,
        textType: TextType.SSML,
        voiceId: VoiceId.Joanna,
        engine: Engine.NEURAL,
        description: 'Neural Joanna with native IPA phonemes'
      },
      // Attempt 3: Pure SSML with long vowel handling (fallback for length)
      {
        text: `<speak>${longVowelSSML}</speak>`,
        textType: TextType.SSML,
        voiceId: VoiceId.Joanna,
        engine: Engine.NEURAL,
        description: 'Neural Joanna with SSML vowel lengthening'
      },
      // Attempt 4: Enhanced IPA with different voice
      {
        text: `<speak><phoneme alphabet="ipa" ph="${escapedEnhancedIpa}">${enhancedIpaText.replace(/ː/g, '')}</phoneme></speak>`,
        textType: TextType.SSML,
        voiceId: VoiceId.Matthew,
        engine: Engine.NEURAL,
        description: 'Neural Matthew with enhanced vowel length IPA'
      },
      // Attempt 5: Standard engine fallback
      {
        text: `<speak><phoneme alphabet="ipa" ph="${escapedIpaText}">${escapedIpaText}</phoneme></speak>`,
        textType: TextType.SSML,
        voiceId: VoiceId.Joanna,
        engine: Engine.STANDARD,
        description: 'Standard Joanna with native IPA phonemes'
      }
    ];

    let lastError: Error | null = null;

    for (const attempt of synthesisAttempts) {
      try {
        console.log(`Attempting synthesis with: ${attempt.description}`);
        console.log('SSML/Text:', attempt.text);

        const command = new SynthesizeSpeechCommand({
          Text: attempt.text,
          TextType: attempt.textType,
          OutputFormat: OutputFormat.MP3,
          VoiceId: attempt.voiceId,
          Engine: attempt.engine,
        });

        const response = await polly.send(command);

        if (!response.AudioStream) {
          throw new Error('No audio stream received from Polly');
        }

        // Convert the audio stream to base64
        const audioBuffer = await streamToBuffer(response.AudioStream);
        
        console.log(`Success with: ${attempt.description}, audio size: ${audioBuffer.length} bytes`);

        // Return as data URL to avoid API Gateway binary issues
        const audioBase64 = audioBuffer.toString('base64');
        const dataUrl = `data:audio/mpeg;base64,${audioBase64}`;

        return {
          statusCode: 200,
          headers: {
            ...headers,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            success: true,
            audioUrl: dataUrl,
            size: audioBuffer.length
          }),
          isBase64Encoded: false,
        };

      } catch (error) {
        console.error(`Failed with ${attempt.description}:`, error);
        lastError = error instanceof Error ? error : new Error(String(error));
        continue; // Try next approach
      }
    }

    // If all attempts failed, return the last error
    throw lastError || new Error('All synthesis attempts failed');

  } catch (error) {
    console.error('Error synthesizing IPA:', error);
    
    let errorMessage = 'Internal server error';
    let statusCode = 500;
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Check for specific AWS errors
      if (error.message.includes('InvalidSsml')) {
        errorMessage = 'Invalid IPA format. Please check your IPA notation.';
        statusCode = 400;
      } else if (error.message.includes('AccessDenied')) {
        errorMessage = 'Service temporarily unavailable. Please try again later.';
        statusCode = 503;
      } else if (error.message.includes('TextLengthExceeded')) {
        errorMessage = 'IPA text is too long. Please use shorter text.';
        statusCode = 400;
      }
    }

    return {
      statusCode,
      headers,
      body: JSON.stringify({ 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.stack : String(error) : undefined
      }),
    };
  }
};

// Helper function to convert stream to buffer
async function streamToBuffer(stream: any): Promise<Buffer> {
  const chunks: Uint8Array[] = [];
  
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  
  return Buffer.concat(chunks);
}