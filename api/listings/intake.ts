/**
 * Listing Intake API
 * POST endpoint that processes real estate listings:
 * 1. Scrapes photos from Compass URL
 * 2. Labels rooms with AI
 * 3. Generates design directions for each room
 * 4. Stores everything in Supabase
 */

import { supabaseAdmin } from '../services/supabaseAdmin';
import { scrapeCompassListing } from '../services/compassScraper';
import { labelPhotos, getPrimaryPhotosPerRoom } from '../services/roomLabeler';
import { generateDesignsForRoom } from '../services/designGenerator';
import { uploadDesignImage, uploadThumbnail } from '../services/imageStorage';
import crypto from 'crypto';

export const maxDuration = 300;

interface IntakeRequest {
  url: string;
  agent?: {
    name?: string;
    email?: string;
    phone?: string;
    license?: string;
    brokerage?: string;
  };
}

interface IntakeResponse {
  listingId: string;
  url: string;
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
    const body: IntakeRequest = req.body;

    if (!body || !body.url) {
      return res.status(400).json({ error: 'Missing listing URL' });
    }

    // Generate listing ID from URL
    const listingId = generateListingId(body.url);

    // Check if listing already exists
    const { data: existing } = await supabaseAdmin
      .from('listings')
      .select('id, status')
      .eq('id', listingId)
      .single();

    if (existing && existing.status === 'ready') {
      return res.status(200).json({
        listingId,
        url: `/listing/${listingId}`
      });
    }

    // Create or update listing record with status "scraping"
    await supabaseAdmin.from('listings').upsert({
      id: listingId,
      source_url: body.url,
      status: 'scraping',
      agent_name: body.agent?.name,
      agent_email: body.agent?.email,
      agent_phone: body.agent?.phone,
      agent_license: body.agent?.license,
      agent_brokerage: body.agent?.brokerage || 'Compass',
      updated_at: new Date().toISOString()
    });

    // 1. Scrape photos from Compass
    let scrapedData;
    try {
      scrapedData = await scrapeCompassListing(body.url);
    } catch (error) {
      await supabaseAdmin.from('listings').update({
        status: 'error',
        error_message: `Failed to scrape listing: ${error instanceof Error ? error.message : String(error)}`,
        updated_at: new Date().toISOString()
      }).eq('id', listingId);

      return res.status(500).json({
        error: 'Failed to scrape listing',
        listingId
      });
    }

    // Update listing with scraped property details
    await supabaseAdmin.from('listings').update({
      address: scrapedData.address,
      city: scrapedData.city,
      state: scrapedData.state,
      zip: scrapedData.zip,
      price: scrapedData.price,
      beds: scrapedData.beds,
      baths: scrapedData.baths,
      sqft: scrapedData.sqft,
      description: scrapedData.description,
      neighborhood: scrapedData.neighborhood,
      year_built: scrapedData.yearBuilt,
      agent_name: scrapedData.agentName || body.agent?.name,
      agent_brokerage: scrapedData.agentBrokerage || body.agent?.brokerage || 'Compass',
      photo_count: scrapedData.photos.length,
      hero_image: scrapedData.photos[0] || null,
      status: 'labeling',
      updated_at: new Date().toISOString()
    }).eq('id', listingId);

    // 2. Label photos with AI
    let labeledPhotos;
    try {
      labeledPhotos = await labelPhotos(scrapedData.photos);
    } catch (error) {
      await supabaseAdmin.from('listings').update({
        status: 'error',
        error_message: `Failed to label photos: ${error instanceof Error ? error.message : String(error)}`,
        updated_at: new Date().toISOString()
      }).eq('id', listingId);

      return res.status(500).json({
        error: 'Failed to label photos',
        listingId
      });
    }

    // 3. Get best photo per room type
    const primaryPhotos = getPrimaryPhotosPerRoom(labeledPhotos);

    // Update status to generating
    await supabaseAdmin.from('listings').update({
      status: 'generating',
      updated_at: new Date().toISOString()
    }).eq('id', listingId);

    // 4. Create listing_rooms records
    const roomRecords = await Promise.all(
      primaryPhotos.map(async (photo) => {
        const roomId = crypto.randomUUID();

        await supabaseAdmin.from('listing_rooms').insert({
          id: roomId,
          listing_id: listingId,
          label: photo.roomType,
          original_photo: photo.url,
          thumbnail: photo.url, // Use same URL for now
          photo_index: photo.index,
          confidence: photo.confidence,
          status: 'generating',
          created_at: new Date().toISOString()
        });

        return {
          id: roomId,
          label: photo.roomType,
          photoUrl: photo.url
        };
      })
    );

    // 5. Generate designs for each room
    for (const room of roomRecords) {
      try {
        const designs = await generateDesignsForRoom(
          room.photoUrl,
          room.label,
          {
            city: scrapedData.city,
            neighborhood: scrapedData.neighborhood,
            yearBuilt: scrapedData.yearBuilt
          },
          5 // Generate 5 designs per room
        );

        // Store each design
        for (const design of designs) {
          const designId = crypto.randomUUID();

          // Upload image to storage
          const imageUrl = await uploadDesignImage(listingId, room.id, designId, design.imageBase64);
          const thumbnailUrl = await uploadThumbnail(listingId, room.id, designId, design.imageBase64);

          // Create design record
          await supabaseAdmin.from('listing_designs').insert({
            id: designId,
            room_id: room.id,
            listing_id: listingId,
            name: design.name,
            description: design.description,
            image_url: imageUrl,
            thumbnail_url: thumbnailUrl,
            frameworks: design.frameworks,
            design_seed: design.designSeed,
            room_reading: design.roomReading,
            quality_score: design.qualityScore,
            is_curated: true,
            created_at: new Date().toISOString()
          });
        }

        // Mark room as ready
        await supabaseAdmin.from('listing_rooms').update({
          status: 'ready'
        }).eq('id', room.id);
      } catch (error) {
        console.error(`Failed to generate designs for room ${room.id}:`, error);

        // Mark room as error but continue with others
        await supabaseAdmin.from('listing_rooms').update({
          status: 'error'
        }).eq('id', room.id);
      }
    }

    // 6. Mark listing as review (ready for agent approval)
    await supabaseAdmin.from('listings').update({
      status: 'review',
      updated_at: new Date().toISOString()
    }).eq('id', listingId);

    return res.status(200).json({
      listingId,
      url: `/listing/${listingId}`
    });
  } catch (error) {
    console.error('Intake error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Generate a listing ID from the URL
 * Uses a slug of the address or a hash if address can't be extracted
 */
function generateListingId(url: string): string {
  // Try to extract address from URL
  // Compass URLs often have the address in the path
  const match = url.match(/\/([^\/]+)\/([^\/]+)$/);
  if (match && match[1] && match[2]) {
    const slug = `${match[1]}-${match[2]}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    return slug;
  }

  // Fallback: hash the URL
  const hash = crypto.createHash('md5').update(url).digest('hex').substring(0, 12);
  return `listing-${hash}`;
}
