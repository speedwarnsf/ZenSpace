import { Listing, ListingRoom } from '../types';
import { SEED_LISTINGS } from './listingData';

export function getListingById(id: string): Listing | null {
  return SEED_LISTINGS.find(listing => listing.id === id) || null;
}

export function getListingRoom(listingId: string, roomId: string): ListingRoom | null {
  const listing = getListingById(listingId);
  if (!listing) return null;
  return listing.rooms.find(room => room.id === roomId) || null;
}
