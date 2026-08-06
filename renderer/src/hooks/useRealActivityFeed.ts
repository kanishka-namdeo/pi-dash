import { useState, useEffect, useRef } from 'react';
import { useSessionContext, type SessionInfo } from '../context/SessionContext';
import type { FeedEvent } from '../types/dashboard';

const MAX_EVENTS = 100;

export function useRealActivityFeed() {
  const ctx = useSessionContext();
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [_, forceUpdate] = useState(0);
  const prevSessionsRef = useRef<Map<string, SessionInfo>>(new Map());
  const pendingRef = useRef<FeedEvent[]>([]);
  const isPausedRef = useRef(false);
  const eventsRef = useRef<FeedEvent[]>([]);

  // Keep refs in sync with state for use inside callbacks/effects
  eventsRef.current = events;
  isPausedRef.current = isPaused;

  useEffect(() => {
    const prev = prevSessionsRef.current;
    const current = ctx.sessions;

    function addEvent(event: FeedEvent) {
      if (isPausedRef.current) {
        pendingRef.current.push(event);
        const total = eventsRef.current.length + pendingRef.current.length;
        if (total > MAX_EVENTS) {
          const overflow = total - MAX_EVENTS;
          if (overflow >= eventsRef.current.length) {
            pendingRef.current = pendingRef.current.slice(overflow - eventsRef.current.length);
          } else {
            const newEvents = eventsRef.current.slice(overflow);
            eventsRef.current = newEvents;
            setEvents(newEvents);
          }
        }
      } else {
        const newEvents = [...eventsRef.current, event];
        if (newEvents.length > MAX_EVENTS) {
          newEvents.splice(0, newEvents.length - MAX_EVENTS);
        }
        eventsRef.current = newEvents;
        setEvents(newEvents);
      }
    }

    // Detect new sessions (session:started)
    for (const [agentId, session] of current) {
      if (!prev.has(agentId)) {
        addEvent({
          id: `${session.createdAt}-${agentId}-started`,
          timestamp: session.createdAt,
          type: 'session:started',
          agentId,
        });
      }
    }

    // Detect removed sessions (session:exited)
    for (const [agentId] of prev) {
      if (!current.has(agentId)) {
        addEvent({
          id: `${Date.now()}-${agentId}-exited`,
          timestamp: Date.now(),
          type: 'session:exited',
          agentId,
        });
      }
    }

    // Detect new commands
    for (const [agentId, session] of current) {
      const prevSession = prev.get(agentId);
      if (prevSession && session.commandHistory.length > prevSession.commandHistory.length) {
        const lastCommand = session.commandHistory[session.commandHistory.length - 1];
        addEvent({
          id: `${lastCommand.timestamp}-${agentId}-command`,
          timestamp: lastCommand.timestamp,
          type: 'command',
          agentId,
          command: lastCommand.command,
        });
      }
    }

    prevSessionsRef.current = new Map(current);
  }, [ctx.sessions]);

  const pause = () => setIsPaused(true);
  const resume = () => {
    setIsPaused(false);
    if (pendingRef.current.length > 0) {
      const newEvents = [...eventsRef.current, ...pendingRef.current];
      if (newEvents.length > MAX_EVENTS) {
        newEvents.splice(0, newEvents.length - MAX_EVENTS);
      }
      eventsRef.current = newEvents;
      setEvents(newEvents);
      pendingRef.current = [];
    }
  };
  const clear = () => {
    setEvents([]);
    pendingRef.current = [];
    eventsRef.current = [];
  };

  return { events, isPaused, pause, resume, clear };
}

export default useRealActivityFeed;
