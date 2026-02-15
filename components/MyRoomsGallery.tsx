/**
 * My Rooms Gallery — portfolio-style grid of saved design projects
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  X, Trash2, Check, Edit2, Clock, Palette, Star,
  ChevronRight, ShoppingCart, ArrowLeft, CheckCircle2,
  Home, Plus, Search
} from 'lucide-react';
import {
  RoomMetadata, SavedRoom, SavedDesign,
  getRoomMetadata, getRoom, deleteRoom, renameRoom,
  updatePurchaseProgress, setChosenDesign
} from '../services/roomStorage';
import { LazyImage } from './LazyImage';

// ============================================================================
// TYPES
// ============================================================================

interface MyRoomsGalleryProps {
  isOpen: boolean;
  onClose: () => void;
  /** Load a room's chosen design back into the app */
  onLoadRoom: (room: SavedRoom, designIndex: number) => void;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const MyRoomsGallery: React.FC<MyRoomsGalleryProps> = ({ isOpen, onClose, onLoadRoom }) => {
  const [rooms, setRooms] = useState<RoomMetadata[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<SavedRoom | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Refresh room list when gallery opens
  useEffect(() => {
    if (isOpen) {
      setRooms(getRoomMetadata());
      setSelectedRoomId(null);
      setSelectedRoom(null);
    }
  }, [isOpen]);

  const refreshRooms = useCallback(() => setRooms(getRoomMetadata()), []);

  const filteredRooms = useMemo(() => {
    if (!searchQuery) return rooms;
    const q = searchQuery.toLowerCase();
    return rooms.filter(r =>
      r.name.toLowerCase().includes(q) ||
      r.tags.some(t => t.toLowerCase().includes(q)) ||
      (r.chosenDesignName && r.chosenDesignName.toLowerCase().includes(q))
    );
  }, [rooms, searchQuery]);

  const handleSelectRoom = useCallback((id: string) => {
    const room = getRoom(id);
    if (room) {
      setSelectedRoomId(id);
      setSelectedRoom(room);
    }
  }, []);

  const handleBack = useCallback(() => {
    setSelectedRoomId(null);
    setSelectedRoom(null);
    refreshRooms();
  }, [refreshRooms]);

  const handleDelete = useCallback((id: string) => {
    deleteRoom(id);
    setConfirmDeleteId(null);
    if (selectedRoomId === id) handleBack();
    refreshRooms();
  }, [selectedRoomId, handleBack, refreshRooms]);

  const handleRename = useCallback((id: string) => {
    if (editName.trim()) {
      renameRoom(id, editName.trim());
      setEditingId(null);
      refreshRooms();
    }
  }, [editName, refreshRooms]);

  const handleChooseDesign = useCallback((roomId: string, designIndex: number) => {
    setChosenDesign(roomId, designIndex);
    const room = getRoom(roomId);
    if (room) setSelectedRoom(room);
    refreshRooms();
  }, [refreshRooms]);

  const handleLoadDesign = useCallback((room: SavedRoom, designIndex: number) => {
    onLoadRoom(room, designIndex);
    onClose();
  }, [onLoadRoom, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white dark:bg-stone-800 shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-200 dark:border-stone-700 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            {selectedRoom && (
              <button onClick={handleBack} className="p-1.5 hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors">
                <ArrowLeft className="w-5 h-5 text-stone-500" />
              </button>
            )}
            <Home className="w-5 h-5 text-emerald-500" />
            <h2 className="text-xl font-bold text-stone-800 dark:text-stone-100 font-serif">
              {selectedRoom ? selectedRoom.name : 'My Rooms'}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors">
            <X className="w-5 h-5 text-stone-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {selectedRoom ? (
            <RoomDetailView
              room={selectedRoom}
              onChooseDesign={handleChooseDesign}
              onLoadDesign={handleLoadDesign}
              onRefresh={() => {
                const r = getRoom(selectedRoom.id);
                if (r) setSelectedRoom(r);
              }}
            />
          ) : (
            <GalleryGrid
              rooms={filteredRooms}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onSelectRoom={handleSelectRoom}
              editingId={editingId}
              editName={editName}
              onStartEdit={(r) => { setEditingId(r.id); setEditName(r.name); }}
              onSaveEdit={handleRename}
              onCancelEdit={() => setEditingId(null)}
              onEditNameChange={setEditName}
              confirmDeleteId={confirmDeleteId}
              onConfirmDelete={setConfirmDeleteId}
              onDelete={handleDelete}
            />
          )}
        </div>

        {/* Footer */}
        {!selectedRoom && (
          <div className="px-6 py-3 border-t border-stone-200 dark:border-stone-700 text-xs text-stone-400 dark:text-stone-500 flex-shrink-0">
            {rooms.length} room{rooms.length !== 1 ? 's' : ''} saved
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// GALLERY GRID
// ============================================================================

interface GalleryGridProps {
  rooms: RoomMetadata[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSelectRoom: (id: string) => void;
  editingId: string | null;
  editName: string;
  onStartEdit: (r: RoomMetadata) => void;
  onSaveEdit: (id: string) => void;
  onCancelEdit: () => void;
  onEditNameChange: (name: string) => void;
  confirmDeleteId: string | null;
  onConfirmDelete: (id: string | null) => void;
  onDelete: (id: string) => void;
}

const GalleryGrid: React.FC<GalleryGridProps> = ({
  rooms, searchQuery, onSearchChange, onSelectRoom,
  editingId, editName, onStartEdit, onSaveEdit, onCancelEdit, onEditNameChange,
  confirmDeleteId, onConfirmDelete, onDelete
}) => (
  <div className="p-6">
    {/* Search */}
    <div className="relative mb-6">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
      <input
        type="text"
        placeholder="Search rooms..."
        value={searchQuery}
        onChange={e => onSearchChange(e.target.value)}
        className="w-full pl-10 pr-4 py-2.5 border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-700 text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
      />
    </div>

    {rooms.length === 0 ? (
      <div className="text-center py-16">
        <Home className="w-12 h-12 text-stone-300 dark:text-stone-600 mx-auto mb-4" />
        <p className="text-stone-500 dark:text-stone-400 text-lg font-medium mb-2">
          {searchQuery ? 'No rooms found' : 'No rooms saved yet'}
        </p>
        <p className="text-stone-400 dark:text-stone-500 text-sm">
          {searchQuery ? 'Try a different search' : 'Analyze a room and save it to start your portfolio'}
        </p>
      </div>
    ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {rooms.map(room => (
          <RoomCard
            key={room.id}
            room={room}
            onSelect={() => onSelectRoom(room.id)}
            isEditing={editingId === room.id}
            editName={editName}
            onStartEdit={() => onStartEdit(room)}
            onSaveEdit={() => onSaveEdit(room.id)}
            onCancelEdit={onCancelEdit}
            onEditNameChange={onEditNameChange}
            isConfirmingDelete={confirmDeleteId === room.id}
            onConfirmDelete={() => onConfirmDelete(room.id)}
            onCancelDelete={() => onConfirmDelete(null)}
            onDelete={() => onDelete(room.id)}
          />
        ))}
      </div>
    )}
  </div>
);

// ============================================================================
// ROOM CARD
// ============================================================================

interface RoomCardProps {
  room: RoomMetadata;
  onSelect: () => void;
  isEditing: boolean;
  editName: string;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onEditNameChange: (name: string) => void;
  isConfirmingDelete: boolean;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
  onDelete: () => void;
}

const RoomCard: React.FC<RoomCardProps> = ({
  room, onSelect,
  isEditing, editName, onStartEdit, onSaveEdit, onCancelEdit, onEditNameChange,
  isConfirmingDelete, onConfirmDelete, onCancelDelete, onDelete
}) => {
  const formatDate = (ts: number) =>
    new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <div className="group relative bg-white dark:bg-stone-700/50 border border-stone-200 dark:border-stone-600 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
      {/* Thumbnail — clickable */}
      <button onClick={onSelect} className="w-full focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-inset">
        <div className="relative h-36 bg-stone-100 dark:bg-stone-700">
          <LazyImage src={room.thumbnail} alt="" className="w-full h-full object-cover" blurUp />
          {/* Completion overlay */}
          {room.completionPercent > 0 && (
            <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs font-bold px-2 py-1 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              {room.completionPercent}%
            </div>
          )}
          {/* Design count badge */}
          <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 flex items-center gap-1">
            <Palette className="w-3 h-3" />
            {room.designCount} design{room.designCount !== 1 ? 's' : ''}
          </div>
        </div>
      </button>

      {/* Info */}
      <div className="p-3">
        {isEditing ? (
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={editName}
              onChange={e => onEditNameChange(e.target.value)}
              className="flex-1 px-2 py-1 text-sm border border-stone-300 dark:border-stone-500 bg-white dark:bg-stone-600 text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              autoFocus
              onKeyDown={e => { if (e.key === 'Enter') onSaveEdit(); if (e.key === 'Escape') onCancelEdit(); }}
            />
            <button onClick={onSaveEdit} className="p-1 hover:bg-emerald-100 dark:hover:bg-emerald-900/30">
              <Check className="w-4 h-4 text-emerald-600" />
            </button>
          </div>
        ) : (
          <button onClick={onSelect} className="text-left w-full focus:outline-none">
            <h3 className="font-semibold text-stone-800 dark:text-stone-100 text-sm truncate">{room.name}</h3>
          </button>
        )}

        <div className="flex items-center justify-between mt-1.5">
          <div className="flex items-center gap-2 text-xs text-stone-400 dark:text-stone-500">
            <Clock className="w-3 h-3" />
            {formatDate(room.updatedAt)}
          </div>

          {room.chosenDesignName && (
            <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              <Star className="w-3 h-3 fill-current" />
              <span className="truncate max-w-[80px]">{room.chosenDesignName}</span>
            </span>
          )}
        </div>

        {/* Progress bar */}
        {room.completionPercent > 0 && (
          <div className="mt-2">
            <div className="h-1.5 bg-stone-100 dark:bg-stone-600 overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${room.completionPercent}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Hover actions */}
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {isConfirmingDelete ? (
          <>
            <button onClick={onDelete} className="p-1.5 bg-red-500 text-white shadow-sm hover:bg-red-600" title="Confirm">
              <Check className="w-3.5 h-3.5" />
            </button>
            <button onClick={onCancelDelete} className="p-1.5 bg-white dark:bg-stone-600 shadow-sm hover:bg-stone-100" title="Cancel">
              <X className="w-3.5 h-3.5 text-stone-600 dark:text-stone-300" />
            </button>
          </>
        ) : (
          <>
            <button onClick={onStartEdit} className="p-1.5 bg-white/90 dark:bg-stone-600/90 shadow-sm hover:bg-white" title="Rename">
              <Edit2 className="w-3.5 h-3.5 text-stone-600 dark:text-stone-300" />
            </button>
            <button onClick={onConfirmDelete} className="p-1.5 bg-white/90 dark:bg-stone-600/90 shadow-sm hover:bg-red-50" title="Delete">
              <Trash2 className="w-3.5 h-3.5 text-stone-600 dark:text-stone-300" />
            </button>
          </>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// ROOM DETAIL VIEW
// ============================================================================

interface RoomDetailViewProps {
  room: SavedRoom;
  onChooseDesign: (roomId: string, designIndex: number) => void;
  onLoadDesign: (room: SavedRoom, designIndex: number) => void;
  onRefresh: () => void;
}

const RoomDetailView: React.FC<RoomDetailViewProps> = ({ room, onChooseDesign, onLoadDesign, onRefresh }) => {
  const [expandedDesign, setExpandedDesign] = useState<number | null>(null);

  const handleTogglePurchased = useCallback((design: SavedDesign, itemId: string) => {
    const current = new Set(design.purchaseProgress.purchasedIds);
    if (current.has(itemId)) current.delete(itemId); else current.add(itemId);
    updatePurchaseProgress(room.id, design.index, [...current]);
    onRefresh();
  }, [room.id, onRefresh]);

  return (
    <div className="p-6 space-y-6">
      {/* Room image */}
      <div className="overflow-hidden h-48 bg-stone-100 dark:bg-stone-700">
        <LazyImage src={room.imageDataUrl || room.thumbnail} alt={room.name} className="w-full h-full object-cover" blurUp />
      </div>

      {/* Designs */}
      <div>
        <h3 className="text-lg font-bold text-stone-800 dark:text-stone-100 mb-4 flex items-center gap-2">
          <Palette className="w-5 h-5 text-emerald-500" />
          Saved Designs
        </h3>

        <div className="space-y-3">
          {room.designs.map(design => {
            const isChosen = room.chosenDesignIndex === design.index;
            const isExpanded = expandedDesign === design.index;
            const progress = design.purchaseProgress;
            const pct = progress.totalItems > 0
              ? Math.round((progress.purchasedIds.length / progress.totalItems) * 100)
              : 0;

            return (
              <div
                key={design.index}
                className={`border overflow-hidden transition-colors ${
                  isChosen
                    ? 'border-emerald-300 dark:border-emerald-600 bg-emerald-50/50 dark:bg-emerald-900/10'
                    : 'border-stone-200 dark:border-stone-600'
                }`}
              >
                {/* Design header */}
                <button
                  onClick={() => setExpandedDesign(isExpanded ? null : design.index)}
                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-stone-50 dark:hover:bg-stone-700/50 transition-colors"
                >
                  {/* Mini visualization */}
                  <div className="w-14 h-14 overflow-hidden bg-stone-100 dark:bg-stone-700 flex-shrink-0">
                    {design.visualizationImage ? (
                      <LazyImage src={`data:image/png;base64,${design.visualizationImage}`} alt="" className="w-full h-full object-cover" blurUp />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Palette className="w-5 h-5 text-stone-300" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-stone-800 dark:text-stone-100 truncate">{design.name}</span>
                      {isChosen && (
                        <span className="flex items-center gap-1 text-xs bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 font-medium">
                          <Star className="w-3 h-3 fill-current" /> Chosen
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 line-clamp-1">{design.mood}</p>

                    {/* Palette dots */}
                    <div className="flex items-center gap-1 mt-1.5">
                      {design.palette.map((hex, i) => (
                        <div key={i} className="w-4 h-4 border border-white dark:border-stone-600 shadow-sm" style={{ backgroundColor: hex }} />
                      ))}
                    </div>
                  </div>

                  {/* Progress circle */}
                  {progress.totalItems > 0 && (
                    <div className="flex-shrink-0 text-center">
                      <div className="relative w-10 h-10">
                        <svg className="w-10 h-10 -rotate-90">
                          <circle cx="20" cy="20" r="16" fill="none" stroke="currentColor" strokeWidth="3" className="text-stone-200 dark:text-stone-600" />
                          <circle cx="20" cy="20" r="16" fill="none" stroke="currentColor" strokeWidth="3"
                            className="text-emerald-500"
                            strokeDasharray={`${2 * Math.PI * 16}`}
                            strokeDashoffset={`${2 * Math.PI * 16 * (1 - pct / 100)}`}
                            strokeLinecap="round"
                          />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-stone-600 dark:text-stone-300">{pct}%</span>
                      </div>
                    </div>
                  )}

                  <ChevronRight className={`w-4 h-4 text-stone-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                </button>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="border-t border-stone-100 dark:border-stone-700 p-4 space-y-4">
                    {/* Actions */}
                    <div className="flex flex-wrap gap-2">
                      {!isChosen && (
                        <button
                          onClick={() => onChooseDesign(room.id, design.index)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 font-medium transition-colors"
                        >
                          <Star className="w-3.5 h-3.5" /> Set as Chosen
                        </button>
                      )}
                      <button
                        onClick={() => onLoadDesign(room, design.index)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-stone-100 dark:bg-stone-700 text-stone-700 dark:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-600 font-medium transition-colors"
                      >
                        <ChevronRight className="w-3.5 h-3.5" /> Open in Editor
                      </button>
                    </div>

                    {/* Key changes */}
                    <div>
                      <h4 className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wide mb-2">Key Changes</h4>
                      <ul className="space-y-1">
                        {design.keyChanges.map((c, i) => (
                          <li key={i} className="text-sm text-stone-600 dark:text-stone-300 flex items-start gap-1.5">
                            <span className="text-emerald-500 mt-0.5">•</span> {c}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Shopping list progress */}
                    {design.shoppingList && design.shoppingList.items.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                          <ShoppingCart className="w-3.5 h-3.5" />
                          Shopping Progress ({progress.purchasedIds.length}/{progress.totalItems})
                        </h4>
                        <div className="space-y-1 max-h-48 overflow-y-auto">
                          {design.shoppingList.items.map(item => {
                            const isPurchased = progress.purchasedIds.includes(item.id);
                            return (
                              <button
                                key={item.id}
                                onClick={() => handleTogglePurchased(design, item.id)}
                                className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                                  isPurchased
                                    ? 'bg-emerald-50 dark:bg-emerald-900/20 text-stone-400 dark:text-stone-500'
                                    : 'hover:bg-stone-50 dark:hover:bg-stone-700/50 text-stone-700 dark:text-stone-200'
                                }`}
                              >
                                <div className={`w-4 h-4 border-2 flex items-center justify-center flex-shrink-0 ${
                                  isPurchased
                                    ? 'bg-emerald-500 border-emerald-500 text-white'
                                    : 'border-stone-300 dark:border-stone-600'
                                }`}>
                                  {isPurchased && <Check className="w-2.5 h-2.5" />}
                                </div>
                                <span className={isPurchased ? 'line-through' : ''}>{item.name}</span>
                                {item.quantity > 1 && <span className="text-xs text-stone-400">×{item.quantity}</span>}
                                <span className="ml-auto text-xs text-stone-400">${item.priceEstimate.low}–${item.priceEstimate.high}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default MyRoomsGallery;
