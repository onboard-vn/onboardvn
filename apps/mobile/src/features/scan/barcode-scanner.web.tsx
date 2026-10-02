import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, space } from '../../ui/theme';

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

type DetectorWindow = { BarcodeDetector?: BarcodeDetectorConstructorLike };

async function loadBarcodeDetector(): Promise<BarcodeDetectorConstructorLike> {
  const existing = (window as unknown as DetectorWindow).BarcodeDetector;
  if (existing) return existing;

  await import('barcode-detector/polyfill');
  const polyfilled = (window as unknown as DetectorWindow).BarcodeDetector;
  if (!polyfilled) throw new Error('Không khởi tạo được BarcodeDetector');
  return polyfilled;
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
    // silent beep is not a hard requirement
  }
}

const unsupportedReason = (): string | null =>
  !window.isSecureContext
    ? 'Cần HTTPS (hoặc localhost) để dùng camera.'
    : !navigator.mediaDevices?.getUserMedia
      ? 'Trình duyệt này không hỗ trợ camera.'
      : null;

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
  const [initialError] = useState(unsupportedReason);
  const [error, setError] = useState<string | null>(initialError);
  const [running, setRunning] = useState(false);
  const onDetectRef = useRef(onDetect);
  useEffect(() => {
    onDetectRef.current = onDetect;
  });

  useEffect(() => {
    if (initialError) return;

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
              // transient decode errors between frames
            });
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
      if (intervalId) clearInterval(intervalId);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [initialError, formats]);

  return (
    <View style={styles.wrap}>
      <View style={styles.frame}>
        <video
          ref={videoRef}
          muted
          playsInline
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        {running ? <View pointerEvents="none" style={styles.line} /> : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.sm },
  frame: {
    width: '100%',
    aspectRatio: 16 / 9,
    overflow: 'hidden',
    borderRadius: radius,
    backgroundColor: '#000',
  },
  line: {
    position: 'absolute',
    left: 24,
    right: 24,
    top: '50%',
    height: 2,
    backgroundColor: 'rgba(239,68,68,0.7)',
  },
  error: { color: colors.danger, fontSize: 14 },
});
