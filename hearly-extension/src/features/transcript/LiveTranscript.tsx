export interface LiveTranscriptProps {
  text: string;
}

export function LiveTranscript({ text }: LiveTranscriptProps) {
  return (
    <p className="text-sm leading-relaxed text-hearly-text">
      {text || 'Listening…'}
    </p>
  );
}
