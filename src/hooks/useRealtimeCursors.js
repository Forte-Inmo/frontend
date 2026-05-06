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
  const colorRef = useRef(generateColor(username || 'Anonymous'));
  const clientIdRef = useRef(crypto.randomUUID());
  const isSubscribedRef = useRef(false);

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
          isSubscribedRef.current = true;
          await channel.track({ username, clientId: clientIdRef.current });
        }
      });

    const handleMouseMove = (e) => {
      const now = Date.now();
      if (now - lastUpdateRef.current >= throttleMs) {
        lastUpdateRef.current = now;
        if (channelRef.current && isSubscribedRef.current) {
          channelRef.current.send({
            type: 'broadcast',
            event: 'cursor-move',
            payload: {
              x: e.clientX,
              y: e.clientY,
              username,
              clientId: clientIdRef.current,
              color: colorRef.current,
            },
          });
        }
      }
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      isSubscribedRef.current = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [roomName, username, throttleMs]);

  const broadcastData = (data) => {
    if (channelRef.current && isSubscribedRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'content-update',
        payload: {
          ...data,
          clientId: clientIdRef.current
        },
      });
    }
  };

  return { cursors, broadcastData };
};
