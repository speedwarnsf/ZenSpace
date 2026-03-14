/**
 * Publish Listing API
 * POST endpoint that:
 * 1. Sets approved designs is_curated=true with display_order
 * 2. Sets non-approved designs is_curated=false
 * 3. Updates listing status to 'ready'
 * 4. Generates QR codes for house and rooms
 * 5. Updates hero image
 */

import { supabaseAdmin } from '../../services/supabaseAdmin';
import { generateQRCodesForListing } from '../../services/qrGenerator';

export const maxDuration = 60;

interface PublishRequest {
  listingId: string;
  approvedDesigns: Array<{ id: string; order: number }>;
  heroImage: string;
}

interface PublishResponse {
  success: boolean;
  listingUrl: string;
  qrCodes: {
    house: string;
    rooms: Record<string, string>;
  };
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
    const body: PublishRequest = req.body;

    if (!body || !body.listingId || !body.approvedDesigns) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { listingId, approvedDesigns, heroImage } = body;

    // Get all designs for this listing
    const { data: allDesigns, error: designsError } = await supabaseAdmin
      .from('listing_designs')
      .select('id, room_id')
      .eq('listing_id', listingId);

    if (designsError) {
      throw new Error(`Failed to fetch designs: ${designsError.message}`);
    }

    // Create a map of approved design IDs
    const approvedMap = new Map(approvedDesigns.map(d => [d.id, d.order]));

    // Update all designs
    for (const design of allDesigns || []) {
      const isApproved = approvedMap.has(design.id);
      const displayOrder = approvedMap.get(design.id) || null;

      await supabaseAdmin
        .from('listing_designs')
        .update({
          is_curated: isApproved,
          display_order: displayOrder
        })
        .eq('id', design.id);
    }

    // Get all visible rooms for QR code generation
    const { data: rooms, error: roomsError } = await supabaseAdmin
      .from('listing_rooms')
      .select('id')
      .eq('listing_id', listingId)
      .neq('status', 'hidden');

    if (roomsError) {
      throw new Error(`Failed to fetch rooms: ${roomsError.message}`);
    }

    const roomIds = (rooms || []).map(r => r.id);

    // Generate QR codes
    const qrCodes = await generateQRCodesForListing(listingId, roomIds);

    // Update listing status and hero image
    await supabaseAdmin
      .from('listings')
      .update({
        status: 'ready',
        hero_image: heroImage || null,
        qr_code_house: qrCodes.houseQR,
        updated_at: new Date().toISOString()
      })
      .eq('id', listingId);

    // Update room QR codes
    for (const roomId of roomIds) {
      if (qrCodes.roomQRs[roomId]) {
        await supabaseAdmin
          .from('listing_rooms')
          .update({ qr_code: qrCodes.roomQRs[roomId] })
          .eq('id', roomId);
      }
    }

    return res.status(200).json({
      success: true,
      listingUrl: `/listing/${listingId}`,
      qrCodes: {
        house: qrCodes.houseQR,
        rooms: qrCodes.roomQRs
      }
    });
  } catch (error) {
    console.error('Publish error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : String(error)
    });
  }
}
