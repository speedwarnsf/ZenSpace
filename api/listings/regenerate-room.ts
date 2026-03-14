/**
 * Regenerate Room API
 * POST endpoint that regenerates all designs for a specific room
 * Deletes old designs, generates 5 new ones, stores them
 */

import { supabaseAdmin } from '../services/supabaseAdmin';
import { generateDesignsForRoom } from '../services/designGenerator';
import { uploadDesignImage, uploadThumbnail } from '../services/imageStorage';
import crypto from 'crypto';

export const maxDuration = 300;

interface RegenerateRequest {
  listingId: string;
  roomId: string;
}

interface RegenerateResponse {
  success: boolean;
  designs: Array<{
    id: string;
    name: string;
    imageUrl: string;
  }>;
}

export default async function handler(req: any, res: any) {
  // CORS
  const allowedOrigins = ['https://zenspace.design', 'https://zenspace-two.vercel.app', 'http://localhost:3000'];
  const origin = req.headers.origin || '';
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body: RegenerateRequest = req.body;

    if (!body || !body.listingId || !body.roomId) {
      return res.status(400).json({ error: 'Missing listingId or roomId' });
    }

    const { listingId, roomId } = body;

    // Get the listing for context
    const { data: listing, error: listingError } = await supabaseAdmin
      .from('listings')
      .select('city, neighborhood, year_built')
      .eq('id', listingId)
      .single();

    if (listingError || !listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    // Get the room
    const { data: room, error: roomError } = await supabaseAdmin
      .from('listing_rooms')
      .select('*')
      .eq('id', roomId)
      .single();

    if (roomError || !room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Delete old designs
    await supabaseAdmin
      .from('listing_designs')
      .delete()
      .eq('room_id', roomId);

    // Update room status
    await supabaseAdmin
      .from('listing_rooms')
      .update({ status: 'generating' })
      .eq('id', roomId);

    // Generate new designs
    const designs = await generateDesignsForRoom(
      room.original_photo,
      room.label,
      {
        city: listing.city,
        neighborhood: listing.neighborhood,
        yearBuilt: listing.year_built
      },
      5
    );

    // Store new designs
    const storedDesigns = [];
    for (const design of designs) {
      const designId = crypto.randomUUID();

      // Upload image to storage
      const imageUrl = await uploadDesignImage(listingId, roomId, designId, design.imageBase64);
      const thumbnailUrl = await uploadThumbnail(listingId, roomId, designId, design.imageBase64);

      // Create design record
      await supabaseAdmin.from('listing_designs').insert({
        id: designId,
        room_id: roomId,
        listing_id: listingId,
        name: design.name,
        description: design.description,
        image_url: imageUrl,
        thumbnail_url: thumbnailUrl,
        frameworks: design.frameworks,
        design_seed: design.designSeed,
        room_reading: design.roomReading,
        quality_score: design.qualityScore,
        is_curated: false,
        created_at: new Date().toISOString()
      });

      storedDesigns.push({
        id: designId,
        name: design.name,
        imageUrl
      });
    }

    // Update room status
    await supabaseAdmin
      .from('listing_rooms')
      .update({ status: 'ready' })
      .eq('id', roomId);

    return res.status(200).json({
      success: true,
      designs: storedDesigns
    });
  } catch (error) {
    console.error('Regenerate room error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : String(error)
    });
  }
}
