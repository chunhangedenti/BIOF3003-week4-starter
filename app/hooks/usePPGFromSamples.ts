'use client';

import { useState, useEffect } from 'react';
import {
  detectValleys,
  heartRateFromValleys,
  hrvFromValleys,
  FPS,
} from '../lib/ppg';
import type { Valley, HeartRateResult, HRVResult } from '../types';

export default function usePPGFromSamples(samples: number[]) {
  const [valleys, setValleys] = useState<Valley[]>([]);
  const [heartRate, setHeartRate] = useState<HeartRateResult>({
    bpm: 0,
    confidence: 0,
  });
  const [hrv, setHrv] = useState<HRVResult>({ sdnn: 0, confidence: 0 });

  useEffect(() => {
    if (samples.length < 60) return;
    const toUse = samples.slice(-150);
    const v = detectValleys(toUse, FPS);
    setValleys(v);
    setHeartRate(heartRateFromValleys(v, FPS));
    setHrv(hrvFromValleys(v, FPS));
  }, [samples]);

  return { valleys, heartRate, hrv };
}
