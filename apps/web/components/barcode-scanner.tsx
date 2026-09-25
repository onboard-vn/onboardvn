'use client';

import { useEffect, useRef, useState } from 'react';

const DEFAULT_SCAN_FORMATS = ['ean_13', 'upc_a', 'ean_8'] as const;
const SCAN_INTERVAL_MS = 300;
const REDETECT_COOLDOWN_MS = 2000;

interface DetectedBarcode {
  rawValue: string;
}

interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<DetectedBarcode[]>;
}

interface BarcodeDetectorConstructorLike {
  new (options: { formats: readonly string[] }): BarcodeDetectorLike;
}

async function loadBarcodeDetector(): Promise<BarcodeDetectorConstructorLike> {
  const existing = (window as unknown as { BarcodeDetector?: BarcodeDetectorConstructorLike })
    .BarcodeDetector;
  if (existing) return existing;

  await import('barcode-detector/polyfill');
  const polyfilled = (window as unknown as { BarcodeDetector?: BarcodeDetectorConstructorLike })
    .BarcodeDetector;
  if (!polyfilled) throw new Error('Không khởi tạo được BarcodeDetector');
  return polyfilled;
}

function beep(): void {
  try {
    const AudioContextCtor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return;
    const ctx = new AudioContextCtor();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    gain.gain.value = 0.15;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
    osc.onended = () => void ctx.close();
  } catch {
    // ignore: WebAudio unsupported or blocked, silent beep is not a hard requirement
  }
}

export function BarcodeScanner({
  onDetect,
  formats = DEFAULT_SCAN_FORMATS,
}: {
  onDetect: (code: string) => void;
  formats?: readonly string[];
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastDetectionRef = useRef<{ code: string; at: number } | null>(null);
  const unsupportedReason =
    typeof window === 'undefined'
      ? null
      : !window.isSecureContext
        ? 'Cần HTTPS (hoặc localhost) để dùng camera.'
        : !navigator.mediaDevices?.getUserMedia
          ? 'Trình duyệt này không hỗ trợ camera.'
          : null;
  const [error, setError] = useState<string | null>(unsupportedReason);
  const [running, setRunning] = useState(false);
  const onDetectRef = useRef(onDetect);
  useEffect(() => {
    onDetectRef.current = onDetect;
  });

  useEffect(() => {
    if (unsupportedReason) return;

    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | undefined;

    async function start() {
      try {
        const DetectorCtor = await loadBarcodeDetector();
        const detector = new DetectorCtor({ formats });

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setRunning(true);

        intervalId = setInterval(() => {
          const video = videoRef.current;
          if (!video || video.readyState < video.HAVE_ENOUGH_DATA) return;
          detector
            .detect(video)
            .then((results) => {
              const code = results[0]?.rawValue;
              if (!code) return;
              const last = lastDetectionRef.current;
              const now = Date.now();
              if (last && last.code === code && now - last.at < REDETECT_COOLDOWN_MS) return;
              lastDetectionRef.current = { code, at: now };
              if (navigator.vibrate) navigator.vibrate(80);
              beep();
              onDetectRef.current(code);
            })
            .catch(() => {
              // transient decode errors are expected between frames, ignore
            });
        }, SCAN_INTERVAL_MS);
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof DOMException && err.name === 'NotAllowedError'
            ? 'Bạn đã từ chối quyền truy cập camera. Vui lòng cấp quyền trong cài đặt trình duyệt.'
            : 'Không mở được camera. Bạn có thể nhập mã tay bên dưới.';
        setError(message);
      }
    }

    void start();

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [unsupportedReason, formats]);

  return (
    <div className="flex flex-col gap-2">
      <div className="relative aspect-video w-full overflow-hidden rounded-lg border bg-black">
        <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
        {running ? (
          <div className="pointer-events-none absolute inset-x-6 top-1/2 h-0.5 -translate-y-1/2 bg-red-500/70" />
        ) : null}
      </div>
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
    </div>
  );
}
