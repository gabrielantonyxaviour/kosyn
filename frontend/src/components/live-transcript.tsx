"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Mic, MicOff, Plus, Radio } from "lucide-react";
import {
  startTranscription,
  stopTranscription,
  isTranscribing,
  type TranscriptEvent,
} from "@/lib/assemblyai";

interface LiveTranscriptProps {
  onTranscriptComplete?: (entries: TranscriptEvent[]) => void;
}

export function LiveTranscript({ onTranscriptComplete }: LiveTranscriptProps) {
  const [entries, setEntries] = useState<TranscriptEvent[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [manualText, setManualText] = useState("");
  const [manualSpeaker, setManualSpeaker] = useState<string>("Doctor");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries]);

  const handleToggle = async () => {
    if (isRecording) {
      stopTranscription();
      setIsRecording(false);
      onTranscriptComplete?.(entries.filter((e) => e.isFinal));
    } else {
      setIsRecording(true);
      await startTranscription((event) => {
        if (event.isFinal) {
          setEntries((prev) => [...prev, event]);
        }
      });
    }
  };

  const addManualEntry = () => {
    const trimmed = manualText.trim();
    if (!trimmed) return;
    setEntries((prev) => [
      ...prev,
      {
        text: trimmed,
        speaker: manualSpeaker,
        timestamp: Date.now(),
        isFinal: true,
      },
    ]);
    setManualText("");
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Radio
              className={`h-5 w-5 ${isRecording ? "text-red-400 animate-pulse" : "text-muted-foreground"}`}
            />
            Live Transcript
          </CardTitle>
          <Button
            size="sm"
            variant={isRecording ? "destructive" : "default"}
            onClick={handleToggle}
          >
            {isRecording ? (
              <MicOff className="h-4 w-4 mr-1" />
            ) : (
              <Mic className="h-4 w-4 mr-1" />
            )}
            {isRecording ? "Stop" : "Start"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-64" ref={scrollRef}>
          <div className="space-y-3 pr-4">
            {entries.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                No transcript yet. Start recording or type below.
              </p>
            )}
            {entries.map((entry, i) => (
              <div key={i} className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-primary">
                    {entry.speaker}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(entry.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-sm">{entry.text}</p>
              </div>
            ))}
          </div>
        </ScrollArea>
        <form
          className="flex gap-2 mt-3"
          onSubmit={(e) => {
            e.preventDefault();
            addManualEntry();
          }}
        >
          <Select value={manualSpeaker} onValueChange={setManualSpeaker}>
            <SelectTrigger size="sm" className="w-[100px] shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Doctor">Doctor</SelectItem>
              <SelectItem value="Patient">Patient</SelectItem>
            </SelectContent>
          </Select>
          <Input
            value={manualText}
            onChange={(e) => setManualText(e.target.value)}
            placeholder="Type transcript line..."
            className="h-8 text-sm"
          />
          <Button
            type="submit"
            size="sm"
            variant="outline"
            disabled={!manualText.trim()}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
