let audioContext: AudioContext | null = null;
let analyserNode: AnalyserNode | null = null;
let mediaStream: MediaStream | null = null;
let mediaRecorder: MediaRecorder | null = null;
let audioChunks: Blob[] = [];

export async function startAudioCapture(): Promise<void> {
  mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })

  audioContext = new AudioContext()
  analyserNode = audioContext.createAnalyser()
  analyserNode.fftSize = 256

  const source = audioContext.createMediaStreamSource(mediaStream)
  source.connect(analyserNode)

  audioChunks = []
  mediaRecorder = new MediaRecorder(mediaStream)
  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) audioChunks.push(e.data)
  }
  mediaRecorder.start(1000)

  console.log('Hearly: Audio capture started')
}

export function stopAudioCapture(): void {
  mediaRecorder?.stop();
  mediaStream?.getTracks().forEach((t) => t.stop());
  audioContext?.close();
  mediaRecorder = null;
  mediaStream = null;
  audioContext = null;
  analyserNode = null;
  audioChunks = [];
  console.log('Hearly: Audio capture stopped');
}

export function getAnalyserNode(): AnalyserNode | null {
  return analyserNode;
}

export function getAudioChunks(): Blob[] {
  return [...audioChunks];
}

export function isCapturing(): boolean {
  return mediaRecorder !== null && mediaRecorder.state === 'recording';
}
