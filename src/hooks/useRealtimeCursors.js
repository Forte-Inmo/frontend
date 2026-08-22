import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';

// Helper for generating consistent colors based on a string
const generateColor = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const color = Math.floor(Math.abs((Math.sin(hash) * 10000) % 1 * 16777216)).toString(16);
  return '#' + '000000'.substring(0, 6 - color.length) + color;
};

export const useRealtimeCursors = ({ roomName, username, throttleMs = 50, onDataUpdate }) => {
  const [cursors, setCursors] = useState({});
  const channelRef = useRef(null);
  const lastUpdateRef = useRef(0);
  const pendingRef = useRef(null);
  const flushTimeoutRef = useRef(null);
  const colorRef = useRef(generateColor(username || 'Anonymous'));
  const clientIdRef = useRef(crypto.randomUUID());

  useEffect(() => {
    if (!roomName || !username) return;

    const channel = supabase.channel(`cursors:${roomName}`, {
      config: {
        broadcast: { ack: false },
        presence: { key: clientIdRef.current },
      },
    });

    channelRef.current = channel;

    channel
      .on('broadcast', { event: 'cursor-move' }, (payload) => {
        if (payload.payload.clientId === clientIdRef.current) return;
        setCursors((prev) => ({
          ...prev,
          [payload.payload.clientId]: {
            clientId: payload.payload.clientId,
            position: { x: payload.payload.x, y: payload.payload.y },
            user: { name: payload.payload.username },
            color: payload.payload.color,
          },
        }));
      })
      .on('broadcast', { event: 'content-update' }, (payload) => {
        if (payload.payload.clientId === clientIdRef.current) return;
        if (onDataUpdate) {
          onDataUpdate(payload.payload);
        }
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        setCursors(prev => {
          const next = { ...prev };
          leftPresences.forEach(p => {
            if (p.clientId) delete next[p.clientId];
          });
          return next;
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ username, clientId: clientIdRef.current });
        }
      });

    const sendCursor = (channel, x, y) => {
      const payload = {
        x,
        y,
        username,
        clientId: clientIdRef.current,
        color: colorRef.current,
      };
      if (channel.state === 'joined') {
        channel.send({ type: 'broadcast', event: 'cursor-move', payload }).catch(() => undefined);
      } else {
        channel.httpSend('cursor-move', payload).catch(() => undefined);
      }
    };

    const handleMouseMove = (e) => {
      pendingRef.current = { x: e.clientX, y: e.clientY };
      const now = Date.now();
      if (now - lastUpdateRef.current >= throttleMs) {
        lastUpdateRef.current = now;
        const channel = channelRef.current;
        if (channel) {
          const { x, y } = pendingRef.current;
          pendingRef.current = null;
          sendCursor(channel, x, y);
        }
      }
      if (flushTimeoutRef.current) clearTimeout(flushTimeoutRef.current);
      flushTimeoutRef.current = setTimeout(() => {
        const channel = channelRef.current;
        if (channel && pendingRef.current) {
          const { x, y } = pendingRef.current;
          pendingRef.current = null;
          sendCursor(channel, x, y);
        }
      }, throttleMs);
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (flushTimeoutRef.current) clearTimeout(flushTimeoutRef.current);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [roomName, username, throttleMs]);

  const broadcastData = (data) => {
    const channel = channelRef.current;
    if (!channel) return;
    const payload = {
      ...data,
      clientId: clientIdRef.current,
    };
    if (channel.state === 'joined') {
      channel.send({
        type: 'broadcast',
        event: 'content-update',
        payload,
      });
    } else {
      channel.httpSend('content-update', payload).catch(() => undefined);
    }
  };

  return { cursors, broadcastData };
};
