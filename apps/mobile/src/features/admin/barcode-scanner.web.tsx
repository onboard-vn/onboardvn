import { useEffect, useRef, useState } from 'react';
import { ErrorText } from './ui';

const SCAN_FORMATS = ['ean_13', 'upc_a', 'ean_8'] as const;
const SCAN_INTERVAL_MS = 300;
const REDETECT_COOLDOWN_MS = 2000;

interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<{ rawValue: string }[]>;
}
type BarcodeDetectorCtor = new (options: { formats: readonly string[] }) => BarcodeDetectorLike;

async function loadBarcodeDetector(): Promise<BarcodeDetectorCtor> {
  const holder = window as unknown as { BarcodeDetector?: BarcodeDetectorCtor };
  if (holder.BarcodeDetector) return holder.BarcodeDetector;
  await import('barcode-detector/polyfill');
  if (!holder.BarcodeDetector) throw new Error('Không khởi tạo được BarcodeDetector');
  return holder.BarcodeDetector;
}

function beep(): void {
  try {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
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
    // WebAudio unsupported or blocked: a silent scan is fine
  }
}

const unsupportedReason = (): string | null =>
  !window.isSecureContext
    ? 'Cần HTTPS (hoặc localhost) để dùng camera.'
    : !navigator.mediaDevices?.getUserMedia
      ? 'Trình duyệt này không hỗ trợ camera.'
      : null;

export function BarcodeScanner({ onDetect }: { onDetect: (code: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastRef = useRef<{ code: string; at: number } | null>(null);
  const onDetectRef = useRef(onDetect);
  const [error, setError] = useState<string | null>(unsupportedReason);
  const [running, setRunning] = useState(false);
  useEffect(() => {
    onDetectRef.current = onDetect;
  });

  useEffect(() => {
    if (unsupportedReason()) return;
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | undefined;
    let stream: MediaStream | null = null;

    async function start() {
      try {
        const Detector = await loadBarcodeDetector();
        const detector = new Detector({ formats: SCAN_FORMATS });
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play();
        }
        setRunning(true);

        timer = setInterval(() => {
          const el = videoRef.current;
          if (!el || el.readyState < el.HAVE_ENOUGH_DATA) return;
          detector
            .detect(el)
            .then((results) => {
              const code = results[0]?.rawValue;
              if (!code) return;
              const last = lastRef.current;
              const now = Date.now();
              if (last && last.code === code && now - last.at < REDETECT_COOLDOWN_MS) return;
              lastRef.current = { code, at: now };
              if (navigator.vibrate) navigator.vibrate(80);
              beep();
              onDetectRef.current(code);
            })
            .catch(() => undefined);
        }, SCAN_INTERVAL_MS);
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof DOMException && err.name === 'NotAllowedError'
            ? 'Bạn đã từ chối quyền truy cập camera. Vui lòng cấp quyền trong cài đặt trình duyệt.'
            : 'Không mở được camera. Bạn có thể nhập mã tay bên dưới.',
        );
      }
    }

    void start();
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <div>
      <div
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '16 / 9',
          overflow: 'hidden',
          borderRadius: 12,
          border: '1px solid #e2e5ea',
          background: '#000',
        }}
      >
        <video
          ref={videoRef}
          muted
          playsInline
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        {running ? (
          <div
            style={{
              position: 'absolute',
              left: 24,
              right: 24,
              top: '50%',
              height: 2,
              background: 'rgba(239,68,68,0.7)',
              pointerEvents: 'none',
            }}
          />
        ) : null}
      </div>
      <ErrorText message={error} />
    </div>
  );
}
