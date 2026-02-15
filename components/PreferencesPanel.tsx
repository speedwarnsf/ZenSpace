import { useState } from 'react';
import { Shuffle } from 'lucide-react';

export const DESIGN_STYLES = [
  { id: 'minimalist-scandinavian', label: 'Minimalist / Scandinavian' },
  { id: 'bold-maximalist', label: 'Bold / Maximalist' },
  { id: 'traditional-classic', label: 'Traditional / Classic' },
  { id: 'mid-century-modern', label: 'Mid-Century Modern' },
  { id: 'industrial', label: 'Industrial' },
  { id: 'french-provincial', label: 'French Provincial' },
  { id: 'coastal-beach', label: 'Coastal / Beach' },
  { id: 'bohemian', label: 'Bohemian' },
  { id: 'contemporary', label: 'Contemporary' },
  { id: 'rustic-farmhouse', label: 'Rustic / Farmhouse' },
] as const;

export const ROOM_FUNCTIONS = [
  { id: 'living-room', label: 'Living Room' },
  { id: 'dining-room', label: 'Dining Room' },
  { id: 'bedroom', label: 'Bedroom' },
  { id: 'study-office', label: 'Study / Office' },
  { id: 'kitchen', label: 'Kitchen' },
  { id: 'bathroom', label: 'Bathroom' },
  { id: 'nursery', label: 'Nursery' },
  { id: 'guest-room', label: 'Guest Room' },
  { id: 'entryway', label: 'Entryway' },
  { id: 'outdoor-patio', label: 'Outdoor / Patio' },
] as const;

export type DesignStyleId = typeof DESIGN_STYLES[number]['id'] | null;
export type RoomFunctionId = typeof ROOM_FUNCTIONS[number]['id'] | null;

interface PreferencesPanelProps {
  selectedStyle: DesignStyleId;
  selectedRoom: RoomFunctionId;
  onStyleChange: (style: DesignStyleId) => void;
  onRoomChange: (room: RoomFunctionId) => void;
}

export function PreferencesPanel({
  selectedStyle,
  selectedRoom,
  onStyleChange,
  onRoomChange,
}: PreferencesPanelProps) {
  const [styleExpanded, setStyleExpanded] = useState(false);
  const [roomExpanded, setRoomExpanded] = useState(false);

  return (
    <div className="w-full max-w-2xl space-y-6 animate-in fade-in duration-500">
      {/* Style Picker */}
      <div>
        <button
          onClick={() => setStyleExpanded(!styleExpanded)}
          className="w-full flex items-center justify-between text-left px-4 py-3 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-stone-900"
          aria-expanded={styleExpanded}
          aria-controls="style-picker-grid"
        >
          <div>
            <h3 className="text-sm font-bold text-stone-800 dark:text-stone-200 uppercase tracking-widest">
              Design Style
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              {selectedStyle
                ? DESIGN_STYLES.find(s => s.id === selectedStyle)?.label
                : 'Any style — surprise me'}
            </p>
          </div>
          <span className="text-stone-400 text-xs">{styleExpanded ? 'Hide' : 'Choose'}</span>
        </button>

        {styleExpanded && (
          <div
            id="style-picker-grid"
            className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2"
            role="radiogroup"
            aria-label="Design style"
          >
            <button
              onClick={() => onStyleChange(null)}
              className={`px-3 py-2.5 text-xs font-medium text-left border transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 flex items-center gap-2 ${
                selectedStyle === null
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                  : 'border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:border-stone-300 dark:hover:border-stone-600'
              }`}
              role="radio"
              aria-checked={selectedStyle === null}
            >
              <Shuffle className="w-3.5 h-3.5 flex-shrink-0" />
              Surprise Me
            </button>
            {DESIGN_STYLES.map(style => (
              <button
                key={style.id}
                onClick={() => onStyleChange(style.id)}
                className={`px-3 py-2.5 text-xs font-medium text-left border transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                  selectedStyle === style.id
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                    : 'border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:border-stone-300 dark:hover:border-stone-600'
                }`}
                role="radio"
                aria-checked={selectedStyle === style.id}
              >
                {style.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Room Function Selector */}
      <div>
        <button
          onClick={() => setRoomExpanded(!roomExpanded)}
          className="w-full flex items-center justify-between text-left px-4 py-3 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-stone-900"
          aria-expanded={roomExpanded}
          aria-controls="room-picker-grid"
        >
          <div>
            <h3 className="text-sm font-bold text-stone-800 dark:text-stone-200 uppercase tracking-widest">
              Room Type
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              {selectedRoom
                ? ROOM_FUNCTIONS.find(r => r.id === selectedRoom)?.label
                : 'Auto-detect from photo'}
            </p>
          </div>
          <span className="text-stone-400 text-xs">{roomExpanded ? 'Hide' : 'Choose'}</span>
        </button>

        {roomExpanded && (
          <div
            id="room-picker-grid"
            className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2"
            role="radiogroup"
            aria-label="Room type"
          >
            <button
              onClick={() => onRoomChange(null)}
              className={`px-3 py-2.5 text-xs font-medium text-left border transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 flex items-center gap-2 ${
                selectedRoom === null
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                  : 'border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:border-stone-300 dark:hover:border-stone-600'
              }`}
              role="radio"
              aria-checked={selectedRoom === null}
            >
              <Shuffle className="w-3.5 h-3.5 flex-shrink-0" />
              Auto-Detect
            </button>
            {ROOM_FUNCTIONS.map(room => (
              <button
                key={room.id}
                onClick={() => onRoomChange(room.id)}
                className={`px-3 py-2.5 text-xs font-medium text-left border transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                  selectedRoom === room.id
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                    : 'border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:border-stone-300 dark:hover:border-stone-600'
                }`}
                role="radio"
                aria-checked={selectedRoom === room.id}
              >
                {room.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
