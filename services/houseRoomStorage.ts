/**
 * House & Room Storage Service
 * 
 * Manages rooms with per-room design history (LookbookEntry[]).
 * Uses localStorage with base64 image stripping (same pattern as lookbookStorage).
 * Supabase migration comes later.
 */

import { Room, House, LookbookEntry } from '../types';

const HOUSE_KEY = 'zenspace-house';
const THUMBNAIL_MAX = 200;

// ============================================================================
// HELPERS
// ============================================================================

function loadHouseRaw(): House | null {
  try {
    const raw = localStorage.getItem(HOUSE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function persistHouse(house: House): void {
  try {
    // Strip base64 visualization images before persisting
    const slim: House = {
      ...house,
      rooms: house.rooms.map(room => ({
        ...room,
        sourceImage: undefined, // too large for localStorage
        designs: room.designs.map(d => ({
          ...d,
          option: {
            ...d.option,
            visualizationImage: undefined,
          },
        })),
      })),
    };
    localStorage.setItem(HOUSE_KEY, JSON.stringify(slim));
  } catch (err) {
    if (err instanceof DOMException && err.name === 'QuotaExceededError') {
      console.warn('houseRoomStorage: quota exceeded, trimming oldest rooms');
      house.rooms = house.rooms.slice(0, 10);
      persistHouse(house);
    }
  }
}

/**
 * Generate a small thumbnail from a base64 data URL
 */
function generateThumb(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const scale = Math.min(THUMBNAIL_MAX / img.width, THUMBNAIL_MAX / img.height, 1);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.6));
      } else {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

function createDefaultHouse(): House {
  return {
    id: `house-${Date.now()}`,
    name: 'Our Home',
    rooms: [],
    createdAt: Date.now(),
  };
}

// ============================================================================
// PUBLIC API
// ============================================================================

export function getHouse(): House {
  const existing = loadHouseRaw();
  if (existing) return existing;
  const house = createDefaultHouse();
  persistHouse(house);
  return house;
}

export function getRooms(): Room[] {
  return getHouse().rooms;
}

export function getRoom(id: string): Room | null {
  return getHouse().rooms.find(r => r.id === id) || null;
}

export async function saveRoom(room: Room): Promise<void> {
  const house = getHouse();
  // Generate thumbnail if we have a source image but no thumb
  if (room.sourceImage && !room.sourceImageThumb) {
    room.sourceImageThumb = await generateThumb(room.sourceImage);
  }
  const idx = house.rooms.findIndex(r => r.id === room.id);
  if (idx >= 0) {
    house.rooms[idx] = room;
  } else {
    house.rooms.unshift(room);
  }
  persistHouse(house);
}

export function updateRoom(id: string, updates: Partial<Room>): void {
  const house = getHouse();
  const idx = house.rooms.findIndex(r => r.id === id);
  if (idx < 0) return;
  const existing = house.rooms[idx]!;
  house.rooms[idx] = { ...existing, ...updates, updatedAt: Date.now() };
  persistHouse(house);
}

export function deleteRoom(id: string): void {
  const house = getHouse();
  house.rooms = house.rooms.filter(r => r.id !== id);
  persistHouse(house);
}

export function saveDesignToRoom(roomId: string, entry: LookbookEntry): void {
  const house = getHouse();
  const room = house.rooms.find(r => r.id === roomId);
  if (!room) return;
  // Avoid duplicates
  if (!room.designs.find(d => d.id === entry.id)) {
    room.designs.push(entry);
  }
  room.updatedAt = Date.now();
  persistHouse(house);
}

export function createRoom(name: string, sourceImage?: string): Room {
  return {
    id: `room-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name,
    sourceImage,
    designs: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}
