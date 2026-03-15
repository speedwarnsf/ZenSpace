import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://vqkoxfenyjomillmxawh.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

// ─── Nudio-Style Portrait Parameters ───
// Each pool has exactly 3 options. For 3 portraits, each element is used once.

const BACKDROP_VARIANTS = [
  { id: 'city-fog', description: 'a warm charcoal grey' },
  { id: 'amber', description: 'a rich amber yellow' },
  { id: 'powder-blue', description: 'a cool powder blue' },
];

const WARDROBE_MALE = [
  'a sharp tailored blazer with crisp shirt — clean professional lines',
  'smart casual with open collar — elevated everyday, understated luxury',
  'modern minimal monochrome — architectural silhouette, no distractions',
];

const WARDROBE_FEMALE = [
  'a structured editorial blazer with elegant draping',
  'smart professional — tailored blouse, refined and polished',
  'modern minimal — clean monochrome silhouette, understated luxury',
];

const LIGHTING_SETUPS = [
  'a clean Broncolor ParaLight three-point setup — soft front key, subtle fill, even illumination',
  'dramatic rim-edge lighting — strong backlight defining silhouette with moody shadows',
  'graphic studio lighting — high contrast, sharp directional, editorial feel',
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i]!, a[j]!] = [a[j]!, a[i]!];
  }
  return a;
}

/**
 * Build 3 unique portrait prompts — Nudio engine style.
 * Uses gemini-2.5-flash-image with the source photo as input (image-to-image).
 * Each prompt gets a unique backdrop, wardrobe, and lighting combo.
 */
function buildPortraitPrompts(gender: string): string[] {
  const backdrops = shuffle(BACKDROP_VARIANTS);
  const wardrobes = shuffle(gender === 'female' ? WARDROBE_FEMALE : WARDROBE_MALE);
  const lightings = shuffle(LIGHTING_SETUPS);

  return [0, 1, 2].map(i => {
    const backdrop = backdrops[i]!;
    const wardrobe = wardrobes[i]!;
    const lighting = lightings[i]!;

    return `Take this picture of a person and examine every pore of their skin, every scar, mark, mole, and freckle. Look carefully at the shape of their face and their body. You are going to represent every detail in the most realistic way, but imagine they have been taken to a world-leading NYC portrait studio with stylists, hair, and makeup specialists. The set uses ${lighting} with a cyc wall backdrop painted to match ${backdrop.description}.

Ground rules: the subject must be 16ft from the backdrop. They are now wearing ${wardrobe}. Makeup must be virtually unnoticeable. Hair should remain similar but look clean, styled, and magazine-quality cool. The photographer is incredibly skilled at directing the best pose and expression.

Only show the subject from head and shoulders, centered in frame. Never reveal lighting equipment, stands, rolled paper, flooring seams, or any other set pieces — just the person against that perfectly smooth ${backdrop.description} backdrop edge to edge.

The shoot is captured on a Phase One camera using a Schneider Kreuznach 110mm LS f/2.8 lens. Deliver the final Vogue magazine-style candid editorial portrait — hyper-real, flattering, and true to the subject. Square aspect ratio.`;
  });
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

    // Build 3 unique prompts with non-repeating combos
    const prompts = buildPortraitPrompts(gender || 'male');
    const portraits: Array<{ index: number; imageBase64: string }> = [];
    const errors: string[] = [];

    // Use gemini-2.5-flash-image via generateContent — the actual Nudio engine
    // This is image-to-image: source photo goes IN, transformed portrait comes OUT
    const imageModel = 'gemini-2.5-flash-image';

    for (let i = 0; i < prompts.length; i++) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${imageModel}:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                role: 'user',
                parts: [
                  { inlineData: { mime_type: mimeType, data: imageBase64 } },
                  { text: prompts[i] },
                ],
              }],
              generationConfig: {
                responseModalities: ['TEXT', 'IMAGE'],
                temperature: 0.4,
                topP: 0.95,
                topK: 40,
              },
            }),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Portrait ${i + 1} API error:`, errorText);
          errors.push(`Portrait ${i + 1}: API ${response.status}`);
          continue;
        }

        const data = await response.json();

        // Extract generated image from response (camelCase inlineData)
        let foundImage = false;
        if (data.candidates?.[0]?.content?.parts) {
          for (const part of data.candidates[0].content.parts) {
            if (part.inlineData?.data) {
              portraits.push({
                index: i,
                imageBase64: part.inlineData.data,
              });
              foundImage = true;
              break;
            }
          }
        }

        if (!foundImage) {
          // Check for text-only response (model refused or couldn't generate)
          const textParts = data.candidates?.[0]?.content?.parts
            ?.filter((p: any) => p.text)
            ?.map((p: any) => p.text)
            ?.join(' ');
          errors.push(`Portrait ${i + 1}: No image returned${textParts ? ` — ${textParts.slice(0, 200)}` : ''}`);
        }
      } catch (genErr: any) {
        const msg = genErr.message || String(genErr);
        console.error(`Portrait ${i + 1} generation failed:`, msg);
        errors.push(`Portrait ${i + 1}: ${msg}`);
      }
    }

    if (portraits.length === 0) {
      return res.status(500).json({
        error: 'All portrait generations failed',
        details: errors,
      });
    }

    // Upload portraits to Supabase storage
    const results = [];
    for (const portrait of portraits) {
      const buffer = Buffer.from(portrait.imageBase64, 'base64');
      const fileName = `portraits/${agentId || 'temp'}/${Date.now()}-${portrait.index}.png`;

      const { error: uploadErr } = await supabase.storage
        .from('listing-designs')
        .upload(fileName, buffer, {
          contentType: 'image/png',
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
        index: portrait.index,
      });
    }

    // Upload the original photo
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
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (err: any) {
    console.error('Portrait handler error:', err);
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
}
