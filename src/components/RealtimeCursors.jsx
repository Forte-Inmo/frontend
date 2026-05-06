import { Cursor } from './Cursor';
import { useRealtimeCursors } from '../hooks/useRealtimeCursors';

const THROTTLE_MS = 50;

export const RealtimeCursors = ({ roomName, username }) => {
  const { cursors } = useRealtimeCursors({ roomName, username, throttleMs: THROTTLE_MS });

  return (
    <>
      {Object.keys(cursors).map((id) => (
        <Cursor
          key={id}
          className="fixed transition-transform ease-linear z-[9999]"
          style={{
            transitionDuration: `${THROTTLE_MS}ms`,
            top: 0,
            left: 0,
            transform: `translate(${cursors[id].position.x}px, ${cursors[id].position.y}px)`,
          }}
          color={cursors[id].color}
          name={cursors[id].user.name}
        />
      ))}
    </>
  );
};
