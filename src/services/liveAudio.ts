/**
 * GBAIGBANCE — Client Audio pour l'API Gemini Live
 * 
 * Se connecte au pont WebSocket du serveur (/live) pour le streaming
 * audio bidirectionnel temps réel à très faible latence :
 * - Entrée microphone : PCM 16 kHz
 * - Sortie synthèse vocale : PCM 24 kHz
 */

function floatTo16BitPCM(input: Float32Array): Int16Array {
  const output = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return output;
}

function base64EncodeAudio(int16Array: Int16Array): string {
  const bytes = new Uint8Array(int16Array.buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64DecodeAudio(base64: string): Int16Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Int16Array(bytes.buffer);
}

export interface LiveSessionCallbacks {
  onConnected?: () => void;
  onTalking?: (isTalking: boolean) => void;
  onError?: (error: string) => void;
  onClosed?: () => void;
}

class GeminiLiveClient {
  private ws: WebSocket | null = null;
  private inputAudioCtx: AudioContext | null = null;
  private outputAudioCtx: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private isConnected = false;
  private scheduledTime = 0;
  private activeAudioNodes: AudioBufferSourceNode[] = [];

  public async start(callbacks: LiveSessionCallbacks = {}): Promise<void> {
    if (this.isConnected) return;

    try {
      // 1. WebSocket vers le serveur
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/live`;
      this.ws = new WebSocket(wsUrl);

      // 2. AudioContexts
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.inputAudioCtx = new AudioContextClass({ sampleRate: 16000 });
      this.outputAudioCtx = new AudioContextClass({ sampleRate: 24000 });
      this.scheduledTime = this.outputAudioCtx.currentTime;

      // 3. Capture microphone
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      this.ws.onopen = () => {
        this.isConnected = true;
        callbacks.onConnected?.();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.error) {
            callbacks.onError?.(data.error);
            return;
          }
          if (data.interrupted) {
            this.stopCurrentPlayback();
            callbacks.onTalking?.(false);
            return;
          }
          if (data.audio) {
            callbacks.onTalking?.(true);
            this.playAudioChunk(data.audio, () => {
              callbacks.onTalking?.(false);
            });
          }
        } catch (e) {
          console.error('[LiveClient] Message error:', e);
        }
      };

      this.ws.onerror = () => {
        callbacks.onError?.('Erreur de connexion WebSocket Live');
      };

      this.ws.onclose = () => {
        this.stop();
        callbacks.onClosed?.();
      };

      // 4. Traitement continu du flux micro
      this.source = this.inputAudioCtx.createMediaStreamSource(this.mediaStream);
      this.processor = this.inputAudioCtx.createScriptProcessor(4096, 1, 1);

      this.processor.onaudioprocess = (e) => {
        if (!this.isConnected || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;
        const channelData = e.inputBuffer.getChannelData(0);
        const pcm16 = floatTo16BitPCM(channelData);
        const base64Audio = base64EncodeAudio(pcm16);
        this.ws.send(JSON.stringify({ audio: base64Audio }));
      };

      this.source.connect(this.processor);
      this.processor.connect(this.inputAudioCtx.destination);
    } catch (err: unknown) {
      this.stop();
      const msg = err instanceof Error ? err.message : 'Accès micro refusé ou indisponible';
      callbacks.onError?.(msg);
      throw err;
    }
  }

  private playAudioChunk(base64: string, onEnd?: () => void) {
    if (!this.outputAudioCtx) return;

    try {
      const pcm16 = base64DecodeAudio(base64);
      const float32 = new Float32Array(pcm16.length);
      for (let i = 0; i < pcm16.length; i++) {
        float32[i] = pcm16[i] / 32768;
      }

      const audioBuffer = this.outputAudioCtx.createBuffer(1, float32.length, 24000);
      audioBuffer.getChannelData(0).set(float32);

      const sourceNode = this.outputAudioCtx.createBufferSource();
      sourceNode.buffer = audioBuffer;
      sourceNode.connect(this.outputAudioCtx.destination);

      const now = this.outputAudioCtx.currentTime;
      const startTime = Math.max(now, this.scheduledTime);
      sourceNode.start(startTime);
      this.scheduledTime = startTime + audioBuffer.duration;

      this.activeAudioNodes.push(sourceNode);
      sourceNode.onended = () => {
        const idx = this.activeAudioNodes.indexOf(sourceNode);
        if (idx !== -1) this.activeAudioNodes.splice(idx, 1);
        if (this.activeAudioNodes.length === 0) {
          onEnd?.();
        }
      };
    } catch (e) {
      console.error('[LiveClient] Playback error:', e);
    }
  }

  private stopCurrentPlayback() {
    for (const node of this.activeAudioNodes) {
      try {
        node.stop();
      } catch {
        // Ignorer
      }
    }
    this.activeAudioNodes = [];
    if (this.outputAudioCtx) {
      this.scheduledTime = this.outputAudioCtx.currentTime;
    }
  }

  public stop(): void {
    this.stopCurrentPlayback();
    this.isConnected = false;

    if (this.processor) {
      try {
        this.processor.disconnect();
      } catch {
        // Disconnect silently
      }
      this.processor = null;
    }

    if (this.source) {
      try {
        this.source.disconnect();
      } catch {
        // Disconnect silently
      }
      this.source = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }

    if (this.inputAudioCtx) {
      try {
        this.inputAudioCtx.close();
      } catch {
        // Close silently
      }
      this.inputAudioCtx = null;
    }

    if (this.outputAudioCtx) {
      try {
        this.outputAudioCtx.close();
      } catch {
        // Close silently
      }
      this.outputAudioCtx = null;
    }

    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // Close silently
      }
      this.ws = null;
    }
  }

  public get active(): boolean {
    return this.isConnected;
  }
}

export const liveAudioClient = new GeminiLiveClient();
