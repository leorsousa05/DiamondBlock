import { useEffect, useRef, useState } from 'react';
import type { SseProgressEvent } from '../api/client';

interface ProgressBarProps {
  operationId: string;
  onComplete?: (result: unknown) => void;
  onError?: (message: string) => void;
}

interface ProgressState {
  phase: string;
  current: number;
  total: number;
  message: string;
  status: 'running' | 'complete' | 'error';
  errorMessage?: string;
  result?: unknown;
}

export function ProgressBar({ operationId, onComplete, onError }: ProgressBarProps) {
  const [state, setState] = useState<ProgressState>({
    phase: 'Initializing…',
    current: 0,
    total: 100,
    message: '',
    status: 'running',
  });
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const es = new EventSource(`/api/events/${operationId}`);
    esRef.current = es;

    es.addEventListener('progress', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data) as SseProgressEvent;
        setState((prev) => ({
          ...prev,
          phase: data.phase ?? prev.phase,
          current: data.current ?? prev.current,
          total: data.total ?? prev.total,
          message: data.message ?? prev.message,
          status: 'running',
        }));
      } catch {
        // ignore parse errors
      }
    });

    es.addEventListener('complete', (e: MessageEvent) => {
      let result: unknown;
      try {
        result = JSON.parse(e.data);
      } catch {
        result = {};
      }
      setState((prev) => ({
        ...prev,
        phase: 'Complete',
        current: prev.total,
        status: 'complete',
        result,
      }));
      es.close();
      onComplete?.(result);
    });

    es.addEventListener('error', (e: MessageEvent) => {
      let msg = 'An error occurred';
      try {
        const data = JSON.parse(e.data) as { error?: string; message?: string };
        msg = data.error ?? data.message ?? msg;
      } catch {
        // ignore
      }
      setState((prev) => ({
        ...prev,
        phase: 'Error',
        status: 'error',
        errorMessage: msg,
      }));
      es.close();
      onError?.(msg);
    });

    // Native onerror for connection failures
    es.onerror = () => {
      if (es.readyState === EventSource.CLOSED) {
        setState((prev) => {
          if (prev.status === 'running') {
            const msg = 'Connection lost';
            onError?.(msg);
            return { ...prev, status: 'error', errorMessage: msg };
          }
          return prev;
        });
      }
    };

    return () => {
      es.close();
    };
  }, [operationId, onComplete, onError]);

  const percent =
    state.total > 0 ? Math.min(100, Math.round((state.current / state.total) * 100)) : 0;

  const fillClass = [
    'progress-fill',
    state.status === 'complete' ? 'complete' : '',
    state.status === 'error' ? 'error' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="progress-container">
      <div className="progress-track">
        <div
          className={fillClass}
          style={{ width: state.status === 'running' && state.total === 0 ? '30%' : `${percent}%` }}
        />
      </div>
      <div className="progress-meta">
        <span className="progress-phase">
          {state.status === 'error' ? `Error: ${state.errorMessage}` : state.phase}
          {state.message && state.status === 'running' && ` — ${state.message}`}
        </span>
        {state.status === 'running' && state.total > 0 && (
          <span className="progress-count">
            {state.current} / {state.total}
          </span>
        )}
        {state.status === 'complete' && (
          <span className="badge badge-success">Done</span>
        )}
        {state.status === 'error' && (
          <span className="badge" style={{ background: 'var(--color-danger-light)', color: 'var(--color-danger)' }}>
            Failed
          </span>
        )}
      </div>
    </div>
  );
}
