'use client';

import { useEffect, useRef, useState } from 'react';

interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
}

function computeRemaining(plannedCompletionUtc: string): CountdownParts {
  const target = new Date(plannedCompletionUtc).getTime();
  const now = Date.now();
  const diff = target - now;

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return { days, hours, minutes, seconds, expired: false };
}

export function Countdown({ plannedCompletion }: { plannedCompletion: string }) {
  const [, setTick] = useState(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    const interval = setInterval(() => {
      if (!mountedRef.current) return;
      setTick((t) => t + 1);
    }, 1000);

    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [plannedCompletion]);

  const parts = computeRemaining(plannedCompletion);

  if (parts.expired) {
    return (
      <span className="text-warning font-semibold tabular-nums">Ready for release</span>
    );
  }

  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <span className="tabular-nums">
      {parts.days > 0 && <span>{parts.days}d </span>}
      <span>{pad(parts.hours)}:{pad(parts.minutes)}:{pad(parts.seconds)}</span>
    </span>
  );
}
