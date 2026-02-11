/**
 * RoomManager — browse saved rooms and their per-room design history.
 * Dark theme, consistent with the rest of the ZenSpace UI.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Plus, Trash2, ArrowLeft, Star, Check, X, Palette } from 'lucide-react';
import { Room, LookbookEntry } from '../types';
import {
  getRooms,
  deleteRoom as deleteRoomFromStorage,
  updateRoom,
} from '../services/houseRoomStorage';

interface RoomManagerProps {
  /** Navigate to the upload flow to add a new room */
  onAddRoom: () => void;
  /** Open a specific design from a room */
  onOpenDesign: (entry: LookbookEntry, room: Room) => void;
  /** Go back / close */
  onBack: () => void;
}

export const RoomManager: React.FC<RoomManagerProps> = ({ onAddRoom, onOpenDesign, onBack }) => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const refresh = useCallback(() => setRooms(getRooms()), []);

  useEffect(() => { refresh(); }, [refresh]);

  const selectedRoom = rooms.find(r => r.id === selectedRoomId) || null;

  const handleDelete = useCallback((id: string) => {
    deleteRoomFromStorage(id);
    setConfirmDeleteId(null);
    if (selectedRoomId === id) setSelectedRoomId(null);
    refresh();
  }, [selectedRoomId, refresh]);

  const handleSelectDesign = useCallback((room: Room, designId: string) => {
    updateRoom(room.id, { selectedDesignId: designId });
    refresh();
  }, [refresh]);

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {selectedRoom ? (
            <button
              onClick={() => setSelectedRoomId(null)}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-500 dark:text-slate-400" />
            </button>
          ) : (
            <button
              onClick={onBack}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-500 dark:text-slate-400" />
            </button>
          )}
          <Home className="w-6 h-6 text-emerald-500" />
          <h2 style={{ fontFamily: "'Playfair Display', serif" }} className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            {selectedRoom ? selectedRoom.name : 'My Rooms'}
          </h2>
        </div>

        {!selectedRoom && (
          <button
            onClick={onAddRoom}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Room
          </button>
        )}
      </div>

      {/* Room List */}
      {!selectedRoom && (
        <>
          {rooms.length === 0 ? (
            <div className="text-center py-20">
              <Home className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <p className="text-lg font-medium text-slate-500 dark:text-slate-400 mb-2">No rooms yet</p>
              <p className="text-sm text-slate-400 dark:text-slate-500 mb-6">
                Upload a photo and save designs to start building your room portfolio
              </p>
              <button
                onClick={onAddRoom}
                className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition-colors"
              >
                Add Your First Room
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence mode="popLayout">
                {rooms.map(room => (
                  <motion.div
                    key={room.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="group relative bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer"
                    onClick={() => setSelectedRoomId(room.id)}
                  >
                    {/* Thumbnail */}
                    <div className="h-36 bg-slate-100 dark:bg-slate-700 overflow-hidden">
                      {room.sourceImageThumb ? (
                        <img src={room.sourceImageThumb} alt={room.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Home className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                        </div>
                      )}
                      {/* Design count badge */}
                      <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                        <Palette className="w-3 h-3" />
                        {room.designs.length}
                      </div>
                    </div>

                    {/* Info */}
                    <div className="p-3">
                      <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-sm truncate">{room.name}</h3>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                        {new Date(room.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                      {room.selectedDesignId && (
                        <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1">
                          <Star className="w-3 h-3 fill-current" />
                          Chosen design
                        </span>
                      )}
                    </div>

                    {/* Delete button */}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {confirmDeleteId === room.id ? (
                        <div className="flex gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(room.id); }}
                            className="p-1.5 bg-red-500 text-white rounded-lg shadow-sm hover:bg-red-600"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }}
                            className="p-1.5 bg-white dark:bg-slate-600 rounded-lg shadow-sm"
                          >
                            <X className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(room.id); }}
                          className="p-1.5 bg-white/90 dark:bg-slate-600/90 rounded-lg shadow-sm hover:bg-red-50"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </>
      )}

      {/* Room Detail — shows designs for a selected room */}
      {selectedRoom && (
        <RoomDesigns
          room={selectedRoom}
          onOpenDesign={(entry) => onOpenDesign(entry, selectedRoom)}
          onSelectDesign={(designId) => handleSelectDesign(selectedRoom, designId)}
        />
      )}
    </div>
  );
};

// ============================================================================
// Room Designs Sub-view
// ============================================================================

const RoomDesigns: React.FC<{
  room: Room;
  onOpenDesign: (entry: LookbookEntry) => void;
  onSelectDesign: (designId: string) => void;
}> = ({ room, onOpenDesign, onSelectDesign }) => {
  if (room.designs.length === 0) {
    return (
      <div className="text-center py-16">
        <Palette className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
        <p className="text-slate-500 dark:text-slate-400">No designs saved to this room yet</p>
        <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
          Generate designs and use "Save to Room" to add them here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Chosen design prominently */}
      {room.selectedDesignId && (() => {
        const chosen = room.designs.find(d => d.id === room.selectedDesignId);
        if (!chosen) return null;
        return (
          <div className="bg-emerald-50/50 dark:bg-emerald-900/10 border-2 border-emerald-300 dark:border-emerald-600 rounded-xl overflow-hidden">
            <div className="p-3 flex items-center gap-2 border-b border-emerald-200 dark:border-emerald-700">
              <Star className="w-4 h-4 text-emerald-600 dark:text-emerald-400 fill-current" />
              <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Chosen Design</span>
            </div>
            <button
              onClick={() => onOpenDesign(chosen)}
              className="w-full flex items-center gap-4 p-4 text-left hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
            >
              <div className="w-20 h-20 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-700 flex-shrink-0">
                {chosen.option.visualizationImage || chosen.option.visualizationThumb ? (
                  <img src={chosen.option.visualizationImage ? `data:image/png;base64,${chosen.option.visualizationImage}` : chosen.option.visualizationThumb!} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"><Palette className="w-6 h-6 text-slate-300" /></div>
                )}
              </div>
              <div>
                <h3 style={{ fontFamily: "'Playfair Display', serif" }} className="text-lg font-bold text-slate-800 dark:text-slate-100">{chosen.option.name}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">{chosen.option.mood}</p>
                <div className="flex gap-1 mt-2">
                  {chosen.option.palette.map((c, i) => (
                    <div key={i} className="w-4 h-4 rounded-full border border-slate-200 dark:border-slate-600" style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
            </button>
          </div>
        );
      })()}

      {/* All designs */}
      <h4 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
        All Designs ({room.designs.length})
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {room.designs.map(entry => {
          const isChosen = room.selectedDesignId === entry.id;
          return (
            <div
              key={entry.id}
              className={`bg-white dark:bg-slate-800 rounded-xl border overflow-hidden transition-all ${
                isChosen
                  ? 'border-emerald-300 dark:border-emerald-600'
                  : 'border-slate-200 dark:border-slate-700 hover:shadow-md'
              }`}
            >
              <button
                onClick={() => onOpenDesign(entry)}
                className="w-full text-left"
              >
                <div className="aspect-[4/3] bg-slate-100 dark:bg-slate-700 overflow-hidden">
                  {entry.option.visualizationImage || entry.option.visualizationThumb ? (
                    <img src={entry.option.visualizationImage ? `data:image/png;base64,${entry.option.visualizationImage}` : entry.option.visualizationThumb!} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Palette className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-100 truncate">{entry.option.name}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">{entry.option.mood}</p>
                </div>
              </button>
              {!isChosen && (
                <div className="px-3 pb-3">
                  <button
                    onClick={() => onSelectDesign(entry.id)}
                    className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                  >
                    <Star className="w-3 h-3" /> Set as chosen
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RoomManager;
