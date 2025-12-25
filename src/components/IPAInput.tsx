import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Volume2, VolumeX, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';

interface IPAInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

export function IPAInput({ 
  value, 
  onChange, 
  placeholder = "IPA symbols", 
  className = "",
  onKeyDown 
}: IPAInputProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  const playIPA = async () => {
    if (!value.trim()) {
      toast.error('Please enter IPA text first');
      return;
    }

    setIsPlaying(true);
    try {
      console.log('Synthesizing IPA:', value.trim());
      
      // Call the API to get audio from Amazon Polly
      const audioBlob = await api.synthesizeIPA(value.trim());
      
      console.log('Received audio blob, size:', audioBlob.size, 'type:', audioBlob.type);
      
      if (audioBlob.size === 0) {
        throw new Error('Received empty audio data');
      }
      
      // Create audio element and play
      const audioUrl = URL.createObjectURL(audioBlob);
      console.log('Created audio URL:', audioUrl);
      
      const audio = new Audio(audioUrl);
      
      audio.onended = () => {
        console.log('Audio playback ended');
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl); // Clean up the URL
      };
      
      audio.onerror = (e) => {
        console.error('Audio playback error:', e);
        console.error('Audio error details:', audio.error);
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl); // Clean up the URL
        
        // More specific error messages based on audio error
        if (audio.error) {
          switch (audio.error.code) {
            case MediaError.MEDIA_ERR_ABORTED:
              toast.error('Audio playback was aborted');
              break;
            case MediaError.MEDIA_ERR_NETWORK:
              toast.error('Network error during audio playback');
              break;
            case MediaError.MEDIA_ERR_DECODE:
              toast.error('Audio format not supported or corrupted');
              break;
            case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
              toast.error('Audio format not supported by browser');
              break;
            default:
              toast.error('Unknown audio playback error');
          }
        } else {
          toast.error('Failed to play audio - invalid audio format');
        }
      };
      
      audio.onloadstart = () => {
        console.log('Audio loading started');
      };
      
      audio.oncanplay = () => {
        console.log('Audio can start playing');
      };
      
      console.log('Starting audio playback');
      await audio.play();
      
    } catch (error) {
      console.error('Error playing IPA:', error);
      setIsPlaying(false);
      
      // Show more specific error messages
      if (error instanceof Error) {
        if (error.message.includes('Invalid IPA format')) {
          toast.error('Invalid IPA notation. Please check your symbols.');
        } else if (error.message.includes('too long')) {
          toast.error('IPA text is too long. Please use shorter text.');
        } else if (error.message.includes('temporarily unavailable')) {
          toast.error('Speech service temporarily unavailable. Please try again.');
        } else if (error.message.includes('HTTP 404')) {
          toast.error('Speech service not available. Please contact support.');
        } else if (error.message.includes('empty audio data')) {
          toast.error('No audio data received. Please try again.');
        } else {
          toast.error(`Failed to synthesize speech: ${error.message}`);
        }
      } else {
        toast.error('Failed to synthesize speech');
      }
    }
  };

  return (
    <div className="flex gap-2">
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        className={className}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={playIPA}
        disabled={isPlaying || !value.trim()}
        className="px-3 border-2 border-[#F269BF]/40 text-[#F269BF] hover:bg-[#F269BF]/10 hover:border-[#F269BF] rounded-xl"
        title="Play IPA pronunciation"
      >
        {isPlaying ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Volume2 className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}