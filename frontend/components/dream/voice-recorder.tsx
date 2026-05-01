"use client";

import { getBrowserApiOrigin, getWebSocketOrigin } from "@/lib/api-origin";
import { cn } from "@/lib/utils";
import { Mic, Square } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface VoiceRecorderProps {
  onTranscription: (text: string, isFinal?: boolean) => void;
  className?: string;
  compact?: boolean;
}

const SAMPLE_RATE = 16000;
const BUFFER_SIZE = 512; // 32ms @ 16kHz，缩短首帧采集延迟
const WS_CLOSE_GRACE_MS = 3000;

/**
 * 实时语音转录组件
 *
 * 使用 Google Cloud Speech-to-Text V2 流式转录
 * 前端直接发送 16-bit PCM 二进制数据到后端 WebSocket
 */
export function VoiceRecorder({ onTranscription, className }: VoiceRecorderProps) {
  const { t } = useTranslation();
  const [recording, setRecording] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [duration, setDuration] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const sentAudioRef = useRef(false);
  const intentionalCloseRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);

  const formatTime = (s: number) => {
    const mm = String(Math.floor(s / 60)).padStart(2, "0");
    const ss = String(s % 60).padStart(2, "0");
    return `${mm}:${ss}`;
  };

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  /** 停止本地录音资源，但保留 WebSocket 等待最终结果 */
  const stopLocalRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

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
    sentAudioRef.current = false;
  }, []);

  /** 清理所有资源 */
  const cleanup = useCallback(() => {
    clearCloseTimer();
    stopLocalRecording();

    const ws = wsRef.current;
    wsRef.current = null;
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
      intentionalCloseRef.current = true;
      ws.close();
    }
  }, [clearCloseTimer, stopLocalRecording]);

  const stopRecording = useCallback(() => {
    const ws = wsRef.current;
    const hadSentAudio = sentAudioRef.current;
    stopLocalRecording();

    if (!ws || ws.readyState !== WebSocket.OPEN) {
      cleanup();
      return;
    }

    if (!hadSentAudio) {
      cleanup();
      return;
    }

    intentionalCloseRef.current = true;
    ws.send(JSON.stringify({ type: "stop" }));
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => {
      if (wsRef.current === ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    }, WS_CLOSE_GRACE_MS);
  }, [cleanup, clearCloseTimer, stopLocalRecording]);

  const cancelRecording = useCallback(() => {
    cleanup();
    toast.info(t("dreams.new.voiceRecording.canceled"));
  }, [cleanup, t]);

  const startRecording = useCallback(async () => {
    if (wsRef.current) return;

    try {
      setConnecting(true);

      // 1. 获取麦克风
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: SAMPLE_RATE },
      });
      streamRef.current = stream;

      // 2. WebSocket 连接
      const ws = new WebSocket(
        `${getWebSocketOrigin(getBrowserApiOrigin())}/api/ws/voice/transcribe`
      );
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
          sentAudioRef.current = true;
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
            onTranscription(data.text, data.is_final !== false);
          } else if (data.type === "error") {
            toast.error(data.message || t("dreams.new.voiceRecording.error"));
          }
        } catch {
          // 忽略非 JSON
        }
      };

      ws.onerror = () => {
        if (!intentionalCloseRef.current) {
          toast.error(t("dreams.new.voiceRecording.connectionFailed"));
        }
        cleanup();
      };

      ws.onclose = () => {
        clearCloseTimer();
        if (wsRef.current === ws) {
          wsRef.current = null;
        }
        intentionalCloseRef.current = false;
        stopLocalRecording();
      };
    } catch {
      setConnecting(false);
      cleanup();
      toast.error(t("dreams.new.voiceRecording.permissionDenied"));
    }
  }, [onTranscription, cleanup, clearCloseTimer, stopLocalRecording]);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  // ========== 渲染 ==========
  if (recording) {
    return (
      <div className="inline-flex items-center gap-3">
        {/* 声波动画 - 增强 3D 质感 */}
        <div className="voice-wave-bars flex items-center gap-1 h-5">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="voice-wave-bar w-0.5 bg-gradient-to-t from-primary/40 via-primary to-primary/90 rounded-full shadow-[0_0_12px_rgba(59,130,246,0.75)]"
            />
          ))}
        </div>

        {/* 停止按钮 */}
        <button
          type="button"
          onClick={stopRecording}
          className="inline-flex items-center justify-center h-10 w-10 rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-[0_14px_30px_rgba(37,99,235,0.55)] hover:shadow-[0_18px_40px_rgba(37,99,235,0.8)] hover:-translate-y-0.5 hover:scale-105 active:translate-y-0 active:scale-95 transition-all duration-200 ease-out border border-white/10"
          title={t("dreams.new.voiceRecording.stop")}
        >
          <Square className="w-4 h-4 fill-current" />
        </button>

        <style jsx>{`
          @keyframes wave {
            0%,
            100% {
              height: 35%;
              transform: translateZ(0) scaleY(0.9);
            }
            50% {
              height: 95%;
              transform: translateZ(0) scaleY(1.25);
            }
          }

          .voice-wave-bar {
            height: 40%;
            animation: wave 1.1s ease-in-out infinite;
            transform-origin: center bottom;
          }

          .voice-wave-bars .voice-wave-bar:nth-child(1) {
            animation-delay: 0s;
          }
          .voice-wave-bars .voice-wave-bar:nth-child(2) {
            animation-delay: 0.12s;
          }
          .voice-wave-bars .voice-wave-bar:nth-child(3) {
            animation-delay: 0.24s;
          }
          .voice-wave-bars .voice-wave-bar:nth-child(4) {
            animation-delay: 0.36s;
          }
          .voice-wave-bars .voice-wave-bar:nth-child(5) {
            animation-delay: 0.48s;
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
        "voice-recorder-trigger relative inline-flex items-center justify-center h-11 w-11 rounded-2xl text-primary-foreground bg-gradient-to-br from-sky-500/80 via-indigo-500/80 to-purple-500/80 shadow-[0_10px_24px_rgba(15,23,42,0.55)] border border-white/25 overflow-hidden transition-all duration-200 ease-out hover:-translate-y-0.5 hover:scale-[1.03] hover:shadow-[0_16px_36px_rgba(15,23,42,0.75)] active:translate-y-0 active:scale-95",
        className
      )}
      title={t("dreams.new.voiceRecording.tooltip")}
    >
      <span
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-80 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.35),transparent_55%),radial-gradient(circle_at_70%_80%,rgba(56,189,248,0.35),transparent_55%)]"
      />
      <Mic className="relative w-5 h-5" />
    </button>
  );
}
