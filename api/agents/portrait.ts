import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';

const SUPABASE_URL = 'https://vqkoxfenyjomillmxawh.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

// ─── Nudio-Style Portrait Parameters ───

const LENS_TYPES = [
  'Portrait 85mm f/1.4 — shallow depth of field, creamy bokeh',
  'Standard 50mm f/1.8 — natural perspective, slight bokeh',
  'Wide 35mm f/2.0 — environmental portrait, context visible',
];

const RETOUCH_STYLES = [
  'Natural polish — subtle skin smoothing, even tone, no heavy retouching',
  'Magazine finish — flawless skin, catch lights enhanced, refined details',
  'Film grain — organic texture, slightly desaturated, analog warmth',
];

const WARDROBE_VIBES_MALE = [
  'Sharp professional — tailored blazer, crisp shirt, clean lines',
  'Smart casual — elevated everyday, open collar, understated luxury',
  'Modern minimal — monochrome, architectural silhouette, no distractions',
];

const WARDROBE_VIBES_FEMALE = [
  'Editorial womenswear — structured blazer, elegant draping, editorial styling',
  'Smart professional — tailored top or blouse, refined and polished',
  'Modern minimal — monochrome, clean silhouette, understated luxury',
];

const BACKGROUNDS = [
  'City fog — soft urban atmosphere, muted buildings dissolving into haze',
  'Amber yellow — warm golden gradient, studio feel',
  'Powder blue — cool, clean, airy backdrop with soft gradient',
];

const LIGHTING = [
  'Clean corporate — soft front key light, subtle fill, even illumination',
  'Dramatic rim edge — strong backlight defining silhouette, moody shadows',
  'Graphic studio — high contrast, sharp directional light, editorial feel',
];

const POOL_NAMES = ['Lens', 'Retouch', 'Wardrobe', 'Background', 'Lighting'];

function getAllPools(gender: string): string[][] {
  const wardrobe = gender === 'female' ? WARDROBE_VIBES_FEMALE : WARDROBE_VIBES_MALE;
  return [LENS_TYPES, RETOUCH_STYLES, wardrobe, BACKGROUNDS, LIGHTING];
}

/**
 * Generate 3 unique non-repeating combinations.
 * Each element is used at most once across the 3 portraits.
 */
function generateCombinations(gender: string): Array<Record<string, string>> {
  const combos: Array<Record<string, string>> = [];
  const pools = getAllPools(gender);

  // Shuffle each pool independently
  const shuffled: string[][] = pools.map(pool => {
    const arr = [...pool];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i]!, arr[j]!] = [arr[j]!, arr[i]!];
    }
    return arr;
  });

  for (let i = 0; i < 3; i++) {
    const combo: Record<string, string> = {};
    shuffled.forEach((pool: string[], poolIdx: number) => {
      combo[POOL_NAMES[poolIdx] as string] = pool[i] as string;
    });
    combos.push(combo);
  }

  return combos;
}

function buildPortraitPrompt(combo: Record<string, string>, description: string): string {
  return `Create a professional real estate agent headshot portrait.

SOURCE PHOTO DESCRIPTION: ${description}

IMPORTANT: This must look like the SAME PERSON from the source photo. Preserve their face, features, skin tone, hair, and identity exactly.

PHOTOGRAPHY SETTINGS:
- ${combo.Lens}
- ${combo.Retouch}
- ${combo.Wardrobe}
- ${combo.Background}
- ${combo.Lighting}

REQUIREMENTS:
- Head and shoulders framing, centered composition
- Professional, approachable expression — slight confident smile
- Eyes sharp and in focus, looking at camera
- The portrait should feel like a premium headshot from a professional photographer
- Square aspect ratio (1:1)
- High quality, photorealistic result`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { imageBase64, mimeType, agentId, gender } = req.body;

    if (!imageBase64 || !mimeType) {
      return res.status(400).json({ error: 'imageBase64 and mimeType required' });
    }

    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
    }

    // Step 1: Analyze the source photo to get a face description
    const analysisModel = 'gemini-2.0-flash';
    const analysisResponse = await ai.models.generateContent({
      model: analysisModel,
      contents: [{
        role: 'user',
        parts: [
          {
            inlineData: {
              mimeType,
              data: imageBase64,
            },
          },
          {
            text: `Describe this person's appearance for portrait recreation. Include: approximate age, gender, ethnicity/skin tone, hair color/style/length, facial hair, face shape, distinctive features. Be specific and detailed. Output only the description, no preamble.`,
          },
        ],
      }],
    });

    const faceDescription = analysisResponse.text || 'Professional adult';

    // Step 2: Generate 3 portraits with unique combos
    const combos = generateCombinations(gender || 'male');
    const portraits: Array<{ combo: Record<string, string>; imageBase64: string }> = [];

    // imagen-3.0-generate-002 for photorealistic portrait generation
    const genModel = 'imagen-3.0-generate-002';
    const errors: string[] = [];

    for (const combo of combos) {
      const prompt = buildPortraitPrompt(combo, faceDescription);

      try {
        const response = await ai.models.generateImages({
          model: genModel,
          prompt,
          config: {
            numberOfImages: 1,
            aspectRatio: '1:1',
            personGeneration: 'ALLOW_ALL',
          },
        });

        const image = response.generatedImages?.[0];
        if (image?.image?.imageBytes) {
          portraits.push({
            combo,
            imageBase64: image.image.imageBytes,
          });
        } else {
          errors.push(`No image returned for combo ${portraits.length + 1}`);
        }
      } catch (genErr: any) {
        const msg = genErr.message || String(genErr);
        console.error(`Portrait generation failed:`, msg);
        errors.push(msg);
        // Continue with remaining combos
      }
    }

    if (portraits.length === 0) {
      return res.status(500).json({ 
        error: 'All portrait generations failed',
        details: errors,
        faceDescription,
      });
    }

    // Step 3: Upload portraits to Supabase storage
    const results = [];
    for (let i = 0; i < portraits.length; i++) {
      const portrait = portraits[i]!;
      const buffer = Buffer.from(portrait.imageBase64, 'base64');
      const fileName = `portraits/${agentId || 'temp'}/${Date.now()}-${i}.jpg`;

      const { error: uploadErr } = await supabase.storage
        .from('listing-designs')
        .upload(fileName, buffer, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (uploadErr) {
        console.error('Upload error:', uploadErr);
        continue;
      }

      const { data: urlData } = supabase.storage
        .from('listing-designs')
        .getPublicUrl(fileName);

      results.push({
        url: urlData.publicUrl,
        combo: portrait.combo,
      });
    }

    // Also upload the original
    const origBuffer = Buffer.from(imageBase64, 'base64');
    const origFileName = `portraits/${agentId || 'temp'}/${Date.now()}-original.jpg`;
    await supabase.storage
      .from('listing-designs')
      .upload(origFileName, origBuffer, {
        contentType: mimeType,
        upsert: true,
      });
    const { data: origUrlData } = supabase.storage
      .from('listing-designs')
      .getPublicUrl(origFileName);

    return res.status(200).json({
      portraits: results,
      original: origUrlData.publicUrl,
      faceDescription,
    });

  } catch (err: any) {
    console.error('Portrait handler error:', err);
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
}
