import { NextResponse } from 'next/server';

const FPS = 30;

function normalizeSignal(signal: number[]): number[] {
  const min = Math.min(...signal);
  const max = Math.max(...signal);
  if (max === min) return signal;
  return signal.map((v) => (v - min) / (max - min));
}

function isLocalMinimum(
  signal: number[],
  index: number,
  windowSize: number,
): boolean {
  const left = signal.slice(Math.max(0, index - windowSize), index);
  const right = signal.slice(
    index + 1,
    Math.min(signal.length, index + windowSize + 1),
  );
  return (
    (left.length === 0 || Math.min(...left) >= signal[index]) &&
    (right.length === 0 || Math.min(...right) > signal[index])
  );
}

function detectValleys(
  signal: number[],
  fps: number,
): { index: number; value: number }[] {
  const minDist = Math.floor(fps * 0.4);
  const windowSize = Math.floor(fps * 0.5);
  const norm = normalizeSignal(signal);
  const valleys: { index: number; value: number }[] = [];
  for (let i = windowSize; i < norm.length - windowSize; i++) {
    if (isLocalMinimum(norm, i, windowSize)) {
      if (
        valleys.length === 0 ||
        i - valleys[valleys.length - 1].index >= minDist
      ) {
        valleys.push({ index: i, value: signal[i] });
      }
    }
  }
  return valleys;
}

function heartRateFromValleys(
  valleys: { index: number; value: number }[],
  fps: number,
): { bpm: number; confidence: number } {
  if (valleys.length < 2) return { bpm: 0, confidence: 0 };
  const intervals = valleys
    .slice(1)
    .map((_, i) => (valleys[i + 1].index - valleys[i].index) / fps);
  const valid = intervals.filter((s) => s >= 0.4 && s <= 2.0);
  if (valid.length === 0) return { bpm: 0, confidence: 0 };
  const sorted = [...valid].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const mean = valid.reduce((a, b) => a + b, 0) / valid.length;
  const variance =
    valid.reduce((s, v) => s + (v - mean) ** 2, 0) / valid.length;
  const cv = (Math.sqrt(variance) / mean) * 100;
  const confidence = Math.max(0, Math.min(100, 100 - cv));
  return { bpm: Math.round(60 / median), confidence };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.samples || !Array.isArray(body.samples)) {
      return NextResponse.json(
        { error: 'Missing samples array' },
        { status: 400 },
      );
    }
    const samples = body.samples as number[];
    const sum = samples.reduce((a, b) => a + b, 0);
    const average = samples.length ? sum / samples.length : 0;
    const valleys = detectValleys(samples, FPS);
    const heartRate = heartRateFromValleys(valleys, FPS);
    return NextResponse.json({ average, heartRate, valleys });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
