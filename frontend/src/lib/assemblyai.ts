export interface TranscriptEvent {
  text: string;
  speaker: string;
  timestamp: number;
  isFinal: boolean;
}

export type TranscriptCallback = (event: TranscriptEvent) => void;

let socket: WebSocket | null = null;
let mediaRecorder: MediaRecorder | null = null;

export async function getToken(): Promise<string> {
  const res = await fetch("/api/assemblyai/token", { method: "POST" });
  const data = await res.json();
  return data.token;
}

export async function startTranscription(
  onTranscript: TranscriptCallback,
): Promise<void> {
  const token = await getToken();

  socket = new WebSocket(
    `wss://api.assemblyai.com/v2/realtime/ws?sample_rate=16000&token=${token}&speaker_labels=true`,
  );

  socket.onmessage = (msg) => {
    const data = JSON.parse(msg.data);
    if (
      data.message_type === "FinalTranscript" ||
      data.message_type === "PartialTranscript"
    ) {
      onTranscript({
        text: data.text,
        speaker: data.speaker || "Speaker",
        timestamp: Date.now(),
        isFinal: data.message_type === "FinalTranscript",
      });
    }
  };

  socket.onerror = (err) => {
    console.error("AssemblyAI WebSocket error:", err);
  };

  await new Promise<void>((resolve) => {
    socket!.onopen = () => resolve();
  });

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });

  mediaRecorder.ondataavailable = (e) => {
    if (socket?.readyState === WebSocket.OPEN && e.data.size > 0) {
      e.data.arrayBuffer().then((buf) => {
        socket!.send(buf);
      });
    }
  };

  mediaRecorder.start(250);
}

export function stopTranscription(): void {
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
    mediaRecorder.stream.getTracks().forEach((t) => t.stop());
    mediaRecorder = null;
  }
  if (socket) {
    socket.close();
    socket = null;
  }
}

export function isTranscribing(): boolean {
  return socket !== null && socket.readyState === WebSocket.OPEN;
}
