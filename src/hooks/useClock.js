import { useState, useEffect, useRef } from 'react';

/**
 * Clock hook that updates every second.
 * Returns current Date for timer calculations and display.
 */
export function useClock(intervalMs = 1000) {
  const [now, setNow] = useState(() => new Date());
  const intervalRef = useRef(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setNow(new Date());
    }, intervalMs);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [intervalMs]);

  return now;
}
