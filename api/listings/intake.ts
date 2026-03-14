/**
 * Listing Intake API
 * POST endpoint that processes real estate listings:
 * 1. Scrapes photos from Compass URL
 * 2. Labels rooms with AI
 * 3. Generates design directions for each room
 * 4. Stores everything in Supabase
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

interface ScrapedListing {
  address: string;
  city: string;
  state: string;
  zip: string;
  price: number;
  beds: number;
  baths: number;
  sqft: number;
  description: string;
  photos: string[];
  agentName?: string;
  agentBrokerage?: string;
  neighborhood?: string;
  yearBuilt?: number;
}

interface LabeledPhoto {
  url: string;
  index: number;
  roomType: string;
  confidence: number;
  isPrimary: boolean;
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
// COMPASS SCRAPER
// ============================================================================
async function scrapeCompassListing(url: string): Promise<ScrapedListing> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch listing: ${response.status}`);
    }

    const html = await response.text();

    // Extract JSON-LD structured data
    const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/i);
    let structuredData: any = null;

    if (jsonLdMatch && jsonLdMatch[1]) {
      try {
        const raw = JSON.parse(jsonLdMatch[1]);
        // Compass wraps data in @graph array
        structuredData = raw['@graph'] ? raw['@graph'][0] : raw;
      } catch (e) {
        console.warn('Failed to parse JSON-LD:', e);
      }
    }

    // Extract photo URLs — /m3/ pattern
    const photoRegex = /https:\/\/(?:www\.)?compass\.com\/m3\/[a-f0-9]+(?:\/[^"'\s]*)?\.(?:jpg|jpeg|png|webp)/gi;
    const photoMatches = html.match(photoRegex) || [];

    const photos = Array.from(new Set(photoMatches))
      .filter(photoUrl => !photoUrl.match(/\/\d{1,3}x\d{1,3}\./))
      .slice(0, 50);

    // Extract property details
    let address = '';
    let city = '';
    let state = 'CA';
    let zip = '';
    let price = 0;
    let beds = 0;
    let baths = 0;
    let sqft = 0;
    let description = '';
    let agentName = '';
    let agentBrokerage = 'Compass';
    let neighborhood = '';
    let yearBuilt: number | undefined;

    if (structuredData) {
      address = structuredData.address?.streetAddress || '';

      // Extract city from name field
      const nameField = structuredData.name || '';
      const nameParts = nameField.split(',').map((s: string) => s.trim());
      if (nameParts.length >= 3) {
        city = nameParts[nameParts.length - 2] || structuredData.address?.addressLocality || '';
      } else {
        city = structuredData.address?.addressLocality || '';
      }

      if (structuredData.address?.addressLocality && structuredData.address.addressLocality !== city) {
        neighborhood = structuredData.address.addressLocality;
      }

      state = structuredData.address?.addressRegion || 'CA';
      zip = structuredData.address?.postalCode || '';

      const offers = structuredData.offers || {};
      price = parseInt(String(offers.price || structuredData.price || '0').replace(/[^0-9]/g, ''), 10);
      description = structuredData.description || structuredData.accommodationFloorPlan?.description || '';

      if (structuredData.numberOfRooms) {
        beds = parseInt(String(structuredData.numberOfRooms).replace(/[^0-9]/g, ''), 10);
      }
      if (structuredData.numberOfBathroomsTotal) {
        baths = parseFloat(String(structuredData.numberOfBathroomsTotal));
      }

      const floorSize = Array.isArray(structuredData.floorSize) ? structuredData.floorSize[0] : structuredData.floorSize;
      if (floorSize) {
        sqft = parseInt(String(floorSize.value || floorSize).replace(/[^0-9]/g, ''), 10);
      }

      // Photos from JSON-LD
      if (Array.isArray(structuredData.image) && structuredData.image.length > 0) {
        const ldPhotos = structuredData.image
          .map((img: { url?: string }) => img.url)
          .filter(Boolean);
        if (ldPhotos.length > 0) {
          photos.length = 0;
          photos.push(...ldPhotos.slice(0, 50));
        }
      }
    }

    // Fallback extraction from HTML
    if (!address) {
      const ogTitleMatch = html.match(/<meta property="og:title" content="([^"]+)"/i);
      if (ogTitleMatch && ogTitleMatch[1]) {
        const titleParts = ogTitleMatch[1].split(',').map(s => s.trim());
        if (titleParts.length >= 3) {
          address = titleParts.slice(0, -2).join(', ');
          city = titleParts[titleParts.length - 2] || '';
          const stateZip = titleParts[titleParts.length - 1] || '';
          const stateZipMatch = stateZip.match(/([A-Z]{2})\s*(\d{5})/);
          if (stateZipMatch) {
            state = stateZipMatch[1] || 'CA';
            zip = stateZipMatch[2] || '';
          }
        }
      }
    }

    if (!price) {
      const priceMatch = html.match(/\$([0-9,]+)/);
      if (priceMatch && priceMatch[1]) {
        price = parseInt(priceMatch[1].replace(/,/g, ''), 10);
      }
    }

    if (!description) {
      const descMatch = html.match(/<meta name="description" content="([^"]+)"/i);
      if (descMatch && descMatch[1]) {
        description = descMatch[1];
      }
    }

    if (!beds) {
      const bedsMatch = html.match(/(\d+)\s*(?:bed|br|bedroom)/i);
      if (bedsMatch && bedsMatch[1]) {
        beds = parseInt(bedsMatch[1], 10);
      }
    }

    if (!baths) {
      const bathsMatch = html.match(/(\d+(?:\.\d+)?)\s*(?:bath|ba|bathroom)/i);
      if (bathsMatch && bathsMatch[1]) {
        baths = parseFloat(bathsMatch[1]);
      }
    }

    if (!sqft) {
      const sqftMatch = html.match(/([0-9,]+)\s*(?:sq\.?\s*ft|sqft|square\s*feet)/i);
      if (sqftMatch && sqftMatch[1]) {
        sqft = parseInt(sqftMatch[1].replace(/,/g, ''), 10);
      }
    }

    const agentMatch = html.match(/agent[^>]*>([^<]+)</i) || html.match(/listing\s+agent[^>]*>([^<]+)</i);
    if (agentMatch && agentMatch[1]) {
      agentName = agentMatch[1].trim();
    }

    const neighborhoodMatch = html.match(/neighborhood[^>]*>([^<]+)</i);
    if (neighborhoodMatch && neighborhoodMatch[1]) {
      neighborhood = neighborhoodMatch[1].trim();
    }

    const yearMatch = html.match(/(?:built|year)[^>]*>(\d{4})</i);
    if (yearMatch && yearMatch[1]) {
      yearBuilt = parseInt(yearMatch[1], 10);
    }

    if (!address || photos.length === 0) {
      throw new Error('Could not extract required listing data (address or photos missing)');
    }

    return {
      address,
      city,
      state,
      zip,
      price,
      beds,
      baths,
      sqft,
      description,
      photos,
      agentName,
      agentBrokerage,
      neighborhood,
      yearBuilt
    };
  } catch (error) {
    throw new Error(`Failed to scrape Compass listing: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// ============================================================================
// ROOM LABELER
// ============================================================================
async function identifyRoomType(photoUrl: string, apiKey: string): Promise<string> {
  const imageResponse = await fetch(photoUrl);
  if (!imageResponse.ok) {
    throw new Error(`Failed to fetch image: ${imageResponse.status}`);
  }

  const imageBlob = await imageResponse.blob();
  const imageBuffer = await imageBlob.arrayBuffer();
  const imageBase64 = Buffer.from(imageBuffer).toString('base64');
  const mimeType = imageBlob.type || 'image/jpeg';

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            {
              text: `What room type is shown in this real estate listing photo? Respond with ONLY the room type from this list (no explanation, just the room name):

Living Room
Kitchen
Master Bedroom
Bedroom
Bathroom
Dining Room
Office
Balcony
Terrace
View
Exterior
Hallway
Closet
Laundry
Garage
Gym
Library
Media Room
Wine Cellar
Other

If the photo shows multiple rooms or an unclear space, pick the most prominent feature.`
            },
            {
              inlineData: {
                mimeType,
                data: imageBase64
              }
            }
          ]
        }]
      })
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'Unknown';

  const roomType = text
    .split('\n')[0]
    ?.trim()
    .replace(/^(The room is|This is|Room type:)/i, '')
    .trim();

  return roomType || 'Unknown';
}

async function labelPhotos(photoUrls: string[]): Promise<LabeledPhoto[]> {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const results: LabeledPhoto[] = [];
  const BATCH_SIZE = 10;

  for (let i = 0; i < photoUrls.length; i += BATCH_SIZE) {
    const batch = photoUrls.slice(i, i + BATCH_SIZE);

    const batchResults = await Promise.all(
      batch.map(async (url, batchIndex) => {
        const index = i + batchIndex;
        try {
          const roomType = await identifyRoomType(url, GEMINI_API_KEY);
          return {
            url,
            index,
            roomType,
            confidence: 1.0,
            isPrimary: false
          };
        } catch (error) {
          console.warn(`Failed to label photo ${index}:`, error);
          return {
            url,
            index,
            roomType: 'Unknown',
            confidence: 0,
            isPrimary: false
          };
        }
      })
    );

    results.push(...batchResults);
  }

  // Mark primary photo for each room type
  const roomGroups = new Map<string, LabeledPhoto[]>();
  results.forEach(photo => {
    if (photo.roomType !== 'Unknown') {
      const group = roomGroups.get(photo.roomType) || [];
      group.push(photo);
      roomGroups.set(photo.roomType, group);
    }
  });

  roomGroups.forEach(photos => {
    if (photos.length > 0) {
      photos[0]!.isPrimary = true;
    }
  });

  return results;
}

function getPrimaryPhotosPerRoom(labeledPhotos: LabeledPhoto[]): LabeledPhoto[] {
  return labeledPhotos.filter(photo => photo.isPrimary);
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
                  text: `Interior design visualization: ${visualizationPrompt}. Professional photo, realistic rendering.`
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
              topK: 40
            }
          })
        }
      );

      if (!imageResponse.ok) {
        console.error(`Image generation failed: ${imageResponse.status}`);
        continue;
      }

      const imageData = await imageResponse.json();
      const imageBase64 = imageData.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

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
function generateListingId(url: string): string {
  const match = url.match(/\/([^\/]+)\/([^\/]+)$/);
  if (match && match[1] && match[2]) {
    const slug = `${match[1]}-${match[2]}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    return slug;
  }

  const hash = crypto.createHash('md5').update(url).digest('hex').substring(0, 12);
  return `listing-${hash}`;
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

    const listingId = generateListingId(body.url);

    // Check if listing exists
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

    // Create listing record
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

    // 1. Scrape photos
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

    // Update with scraped data
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

    // 2. Label photos
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

    const primaryPhotos = getPrimaryPhotosPerRoom(labeledPhotos);

    await supabaseAdmin.from('listings').update({
      status: 'generating',
      updated_at: new Date().toISOString()
    }).eq('id', listingId);

    // 3. Create room records
    const roomRecords = await Promise.all(
      primaryPhotos.map(async (photo) => {
        const roomId = crypto.randomUUID();

        await supabaseAdmin.from('listing_rooms').insert({
          id: roomId,
          listing_id: listingId,
          label: photo.roomType,
          original_photo: photo.url,
          thumbnail: photo.url,
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

    // 4. Generate designs
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
          5
        );

        for (const design of designs) {
          const designId = crypto.randomUUID();

          const imageUrl = await uploadDesignImage(listingId, room.id, designId, design.imageBase64);
          const thumbnailUrl = await uploadThumbnail(listingId, room.id, designId, design.imageBase64);

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

        await supabaseAdmin.from('listing_rooms').update({
          status: 'ready'
        }).eq('id', room.id);
      } catch (error) {
        console.error(`Failed to generate designs for room ${room.id}:`, error);

        await supabaseAdmin.from('listing_rooms').update({
          status: 'error'
        }).eq('id', room.id);
      }
    }

    // 5. Mark listing as review
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
