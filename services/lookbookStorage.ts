import { LookbookEntry } from '../types';

const LOOKBOOK_KEY = 'zenspace-lookbook';
const ROOM_IMAGE_KEY = 'zenspace-lookbook-room';

export function saveLookbook(entries: LookbookEntry[]): void {
  try {
    const slim = entries.map(e => ({
      ...e,
      option: {
        ...e.option,
        visualizationImage: undefined,
      },
    }));
    localStorage.setItem(LOOKBOOK_KEY, JSON.stringify(slim));
  } catch (err) {
    console.warn('Failed to save lookbook:', err);
  }
}

export function loadLookbook(): LookbookEntry[] | null {
  try {
    const data = localStorage.getItem(LOOKBOOK_KEY);
    if (!data) return null;
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export function clearLookbook(): void {
  localStorage.removeItem(LOOKBOOK_KEY);
  localStorage.removeItem(ROOM_IMAGE_KEY);
}

export function saveRoomImage(dataUrl: string): void {
  try {
    localStorage.setItem(ROOM_IMAGE_KEY, dataUrl);
  } catch (err) {
    console.warn('Failed to save room image:', err);
  }
}

export function loadRoomImage(): string | null {
  return localStorage.getItem(ROOM_IMAGE_KEY);
}
