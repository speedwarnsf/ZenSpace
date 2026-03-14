/**
 * Regenerate Room API
 * POST endpoint that regenerates all designs for a specific room
 * Deletes old designs, generates 5 new ones, stores them
 *
 * SELF-CONTAINED: All logic inlined - no local file imports
 */

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export const maxDuration = 300;

// ============================================================================
// SUPABASE ADMIN CLIENT
// ============================================================================
const SUPABASE_URL = 'https://vqkoxfenyjomillmxawh.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '';
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false }
});

// ============================================================================
// TYPES
// ============================================================================
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

interface GeneratedDesign {
  name: string;
  description: string;
  imageBase64: string;
  frameworks: string[];
  designSeed: any;
  roomReading: any;
  qualityScore: number;
}

// ============================================================================
// DESIGN GENERATOR (Simplified for listings)
// ============================================================================
async function generateDesignsForRoom(
  photoUrl: string,
  roomType: string,
  listingContext: { city: string; neighborhood?: string; yearBuilt?: number },
  count: number
): Promise<GeneratedDesign[]> {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  // Fetch photo
  const photoResponse = await fetch(photoUrl);
  if (!photoResponse.ok) {
    throw new Error(`Failed to fetch photo: ${photoResponse.status}`);
  }

  const photoBlob = await photoResponse.blob();
  const photoBuffer = await photoBlob.arrayBuffer();
  const photoBase64 = Buffer.from(photoBuffer).toString('base64');
  const mimeType = photoBlob.type || 'image/jpeg';

  const designs: GeneratedDesign[] = [];

  // Generate designs
  for (let i = 0; i < count; i++) {
    try {
      // Step 1: Get design direction
      const analysisResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                {
                  text: `You are an interior designer creating a redesign concept for this ${roomType}.

Context: ${listingContext.city}${listingContext.neighborhood ? ', ' + listingContext.neighborhood : ''}${listingContext.yearBuilt ? `, built ${listingContext.yearBuilt}` : ''}

Provide a design direction with:
1. Name (2-4 words, evocative)
2. Description (1 sentence describing the mood)
3. Color palette (3-5 colors)
4. Key changes (3 bullet points)

Format as JSON:
{
  "name": "...",
  "description": "...",
  "palette": ["color1", "color2", "color3"],
  "keyChanges": ["change1", "change2", "change3"]
}`
                },
                {
                  inlineData: {
                    mimeType,
                    data: photoBase64
                  }
                }
              ]
            }]
          })
        }
      );

      if (!analysisResponse.ok) {
        console.error(`Design analysis failed: ${analysisResponse.status}`);
        continue;
      }

      const analysisData = await analysisResponse.json();
      const analysisText = analysisData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

      // Parse JSON from response
      let designConcept: any;
      try {
        const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          designConcept = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON found in response');
        }
      } catch (e) {
        console.error('Failed to parse design concept:', e);
        continue;
      }

      // Step 2: Generate visualization using Gemini image generation
      const visualizationPrompt = `${designConcept.name}: ${designConcept.description}. ${designConcept.keyChanges.join('. ')}. Color palette: ${designConcept.palette.join(', ')}.`;

      const imageResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                {
                  text: `Redesign this ${roomType} photo using this design direction: ${visualizationPrompt}. Keep the room structure and layout identical. Apply the new color palette, furniture, and decor as described. Photorealistic interior design visualization. Output the redesigned image.`
                },
                {
                  inlineData: {
                    mimeType,
                    data: photoBase64
                  }
                }
              ]
            }],
            generationConfig: {
              temperature: 1.0,
              topP: 0.95,
              topK: 40,
              responseModalities: ['TEXT', 'IMAGE']
            }
          })
        }
      );

      if (!imageResponse.ok) {
        const errText = await imageResponse.text();
        console.error(`Image generation failed: ${imageResponse.status}`, errText);
        continue;
      }

      const imageData = await imageResponse.json();
      // Find the image part in the response (could be text + image)
      const imagePart = imageData.candidates?.[0]?.content?.parts?.find(
        (p: { inlineData?: { data: string } }) => p.inlineData?.data
      );
      const imageBase64 = imagePart?.inlineData?.data;

      if (!imageBase64) {
        console.error('No image generated');
        continue;
      }

      designs.push({
        name: designConcept.name,
        description: designConcept.description,
        imageBase64,
        frameworks: [],
        designSeed: {
          palette: designConcept.palette,
          keyChanges: designConcept.keyChanges,
          fullPlan: visualizationPrompt
        },
        roomReading: {
          roomReading: `${roomType} in ${listingContext.city}`,
          frameworks: []
        },
        qualityScore: 0.85
      });

    } catch (error) {
      console.error(`Failed to generate design ${i}:`, error);
    }
  }

  return designs;
}

// ============================================================================
// IMAGE STORAGE
// ============================================================================
const BUCKET_NAME = 'listing-designs';

async function ensureBucket(): Promise<void> {
  const { data: buckets } = await supabaseAdmin.storage.listBuckets();
  const bucketExists = buckets?.some(b => b.name === BUCKET_NAME);

  if (!bucketExists) {
    await supabaseAdmin.storage.createBucket(BUCKET_NAME, {
      public: true,
      fileSizeLimit: 10485760,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp']
    });
  }
}

async function uploadDesignImage(
  listingId: string,
  roomId: string,
  designId: string,
  imageBase64: string
): Promise<string> {
  await ensureBucket();

  const imageBuffer = Buffer.from(imageBase64, 'base64');

  let extension = 'jpg';
  if (imageBase64.startsWith('iVBORw0KGgo')) {
    extension = 'png';
  } else if (imageBase64.startsWith('UklGR')) {
    extension = 'webp';
  }

  const fileName = `${listingId}/${roomId}/${designId}.${extension}`;

  const { error } = await supabaseAdmin.storage
    .from(BUCKET_NAME)
    .upload(fileName, imageBuffer, {
      contentType: `image/${extension}`,
      cacheControl: '31536000',
      upsert: true
    });

  if (error) {
    throw new Error(`Failed to upload image: ${error.message}`);
  }

  const { data: { publicUrl } } = supabaseAdmin.storage
    .from(BUCKET_NAME)
    .getPublicUrl(fileName);

  return publicUrl;
}

async function uploadThumbnail(
  listingId: string,
  roomId: string,
  designId: string,
  imageBase64: string
): Promise<string> {
  await ensureBucket();

  const imageBuffer = Buffer.from(imageBase64, 'base64');

  let extension = 'jpg';
  if (imageBase64.startsWith('iVBORw0KGgo')) {
    extension = 'png';
  } else if (imageBase64.startsWith('UklGR')) {
    extension = 'webp';
  }

  const fileName = `${listingId}/${roomId}/${designId}_thumb.${extension}`;

  const { error } = await supabaseAdmin.storage
    .from(BUCKET_NAME)
    .upload(fileName, imageBuffer, {
      contentType: `image/${extension}`,
      cacheControl: '31536000',
      upsert: true
    });

  if (error) {
    throw new Error(`Failed to upload thumbnail: ${error.message}`);
  }

  const { data: { publicUrl } } = supabaseAdmin.storage
    .from(BUCKET_NAME)
    .getPublicUrl(fileName);

  return publicUrl;
}

// ============================================================================
// MAIN HANDLER
// ============================================================================
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
