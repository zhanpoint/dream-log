"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Loader2, Mic, Square, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface VoiceRecorderProps {
  onTranscription: (text: string) => void;
  className?: string;
}

const SAMPLE_RATE = 16000;
const BUFFER_SIZE = 4096; // 256ms @ 16kHz

/**
 * 实时语音转录组件
 *
 * 使用 Google Cloud Speech-to-Text V2 流式转录
 * 前端直接发送 16-bit PCM 二进制数据到后端 WebSocket
 */
export function VoiceRecorder({ onTranscription, className }: VoiceRecorderProps) {
  const [recording, setRecording] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [duration, setDuration] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);

  const formatTime = (s: number) => {
    const mm = String(Math.floor(s / 60)).padStart(2, "0");
    const ss = String(s % 60).padStart(2, "0");
    return `${mm}:${ss}`;
  };

  /** 清理所有资源 */
  const cleanup = useCallback(() => {
    clearInterval(timerRef.current);

    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current.onaudioprocess = null;
      processorRef.current = null;
    }

    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    setRecording(false);
    setConnecting(false);
    setDuration(0);
  }, []);

  const stopRecording = useCallback(() => {
    // 发送停止信号
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "stop" }));
      setTimeout(() => {
        if (ws.readyState === WebSocket.OPEN) ws.close();
      }, 200);
    }
    wsRef.current = null;
    cleanup();
  }, [cleanup]);

  const cancelRecording = useCallback(() => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) ws.close();
    wsRef.current = null;
    cleanup();
    toast.info("已取消录音");
  }, [cleanup]);

  const startRecording = useCallback(async () => {
    try {
      setConnecting(true);

      // 1. 获取麦克风
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: SAMPLE_RATE },
      });
      streamRef.current = stream;

      // 2. WebSocket 连接
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = process.env.NEXT_PUBLIC_API_HOST ?? `${window.location.hostname}:8000`;
      const ws = new WebSocket(`${protocol}//${host}/api/ws/voice/transcribe`);
      wsRef.current = ws;

      ws.binaryType = "arraybuffer";

      ws.onopen = () => {
        setConnecting(false);
        setRecording(true);
        setDuration(0);

        // 3. AudioContext + ScriptProcessor（16kHz mono）
        const audioCtx = new AudioContext({ sampleRate: SAMPLE_RATE });
        audioCtxRef.current = audioCtx;

        const source = audioCtx.createMediaStreamSource(stream);
        const processor = audioCtx.createScriptProcessor(BUFFER_SIZE, 1, 1);
        processorRef.current = processor;

        processor.onaudioprocess = (e) => {
          if (ws.readyState !== WebSocket.OPEN) return;

          const float32 = e.inputBuffer.getChannelData(0);

          // Float32 → 16-bit PCM（Speech-to-Text 要求 LINEAR16）
          const pcm16 = new Int16Array(float32.length);
          for (let i = 0; i < float32.length; i++) {
            const s = Math.max(-1, Math.min(1, float32[i]));
            pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
          }

          // 直接发送二进制数据（不做 Base64）
          ws.send(pcm16.buffer);
        };

        source.connect(processor);
        processor.connect(audioCtx.destination);

        // 计时器
        timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "transcription" && data.text) {
            onTranscription(data.text);
          } else if (data.type === "error") {
            toast.error(data.message || "转录失败");
          }
        } catch {
          // 忽略非 JSON
        }
      };

      ws.onerror = () => {
        toast.error("连接失败，请检查网络");
        cleanup();
      };

      ws.onclose = () => cleanup();
    } catch {
      setConnecting(false);
      cleanup();
      toast.error("无法访问麦克风，请检查浏览器权限");
    }
  }, [onTranscription, cleanup]);

  useEffect(() => {
    return () => {
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) ws.close();
      cleanup();
    };
  }, [cleanup]);

  // ========== 渲染 ==========
  if (recording) {
    return (
      <div className="flex items-center gap-3">
        {/* 声波动画 - 5个垂直条 */}
        <div className="flex items-center gap-0.5 h-5">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="w-0.5 bg-primary/70 rounded-full"
              style={{
                animation: `wave 1.2s ease-in-out infinite`,
                animationDelay: `${i * 0.15}s`,
                height: '40%',
              }}
            />
          ))}
        </div>

        {/* 停止按钮 */}
        <button
          type="button"
          onClick={stopRecording}
          className="p-1.5 rounded-full bg-primary hover:bg-primary/90 hover:scale-110 hover:shadow-lg hover:shadow-primary/50 transition-all duration-300 ease-out"
          title="停止录音"
        >
          <Square className="w-3.5 h-3.5 fill-white text-white" />
        </button>

        <style jsx>{`
          @keyframes wave {
            0%, 100% { height: 40%; }
            50% { height: 85%; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={startRecording}
      className={cn(
        "p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 dark:hover:bg-primary/20 transition-all duration-200",
        className
      )}
      title="语音输入（实时转录）"
    >
      <Mic className="w-5 h-5" />
    </button>
  );
}
