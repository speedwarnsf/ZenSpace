import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://vqkoxfenyjomillmxawh.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

// ═══════════════════════════════════════════════════════════════════
//  PORTRAIT ENGINE — Nudio-derived, exact API structure
// ═══════════════════════════════════════════════════════════════════

// ─── Lens (3) ───

const LENS_CHOICES = [
  {
    id: 'lens-tele',
    label: 'Telephoto / Flattering',
    prompt: 'shot on an 85mm portrait lens with flattering facial compression, shallow depth of field, creamy bokeh background, and tight focus on the subject',
  },
  {
    id: 'lens-standard',
    label: 'Standard / Natural',
    prompt: 'shot on a 50mm lens, natural human eye perspective with accurate facial proportions and medium depth of field',
  },
  {
    id: 'lens-wide',
    label: 'Wide / Environmental',
    prompt: 'shot on a 24mm lens, wide angle perspective with slightly elongated features, expansive background view, and deep depth of field',
  },
];

// ─── Retouch (3) ───

const RETOUCH_CHOICES = [
  {
    id: 'finish-polished',
    label: 'Polished professional',
    prompt: 'Retouching: clean corporate makeup, neatly groomed hair, and smoothed skin while retaining texture for a professional headshot finish.',
  },
  {
    id: 'finish-glamour',
    label: 'High glamour',
    prompt: 'Retouching: flawless airbrushed skin finish with subtle grain, bold editorial makeup, and perfectly styled hair for a magazine-ready portrait.',
  },
  {
    id: 'finish-raw',
    label: 'Raw authenticity',
    prompt: 'Retouching: natural skin texture remains visible with minimal makeup, slight imperfections, and unstyled natural hair for documentary realism.',
  },
];

// ─── Wardrobe ───

const WARDROBE_MALE = [
  {
    id: 'style-original',
    label: 'Original wardrobe',
    prompt: 'the clothing already worn in the upload, preserved authentically while removing wrinkles and pinning fabric for the most flattering fit',
    useOriginal: true,
  },
  {
    id: 'style-corporate',
    label: 'Tailored formal',
    prompt: 'modern executive tailoring inspired by Brioni, Kiton, Armani, or Thom Browne\u2014sleek suits, immaculate shirts, sharp ties, and luxurious fabrics that photograph like a GQ cover',
    useOriginal: false,
  },
  {
    id: 'style-casual',
    label: 'City smart',
    prompt: 'elevated off-duty layers referencing Todd Snyder, Arket, COS, Fear of God, Peter Millar, or Bonobos\u2014neutral palettes, premium knits, relaxed tailoring, and street-ready confidence',
    useOriginal: false,
  },
];

const WARDROBE_FEMALE = [
  {
    id: 'style-original',
    label: 'Original wardrobe',
    prompt: 'the clothing already worn in the upload, preserved authentically while removing wrinkles and pinning fabric for the most flattering fit',
    useOriginal: true,
  },
  {
    id: 'style-women-tailored',
    label: 'Editorial womenswear',
    prompt: 'powerful womenswear tailoring that feels like a Khaite, Proenza Schouler, or The Row look\u2014sculpted blazers, fluid trousers, monochrome palettes, and architectural silhouettes that read like a Vogue feature',
    useOriginal: false,
  },
  {
    id: 'style-women-play',
    label: 'Playful womenswear',
    prompt: 'fashion-forward womenswear inspired by Jacquemus, Loewe, Cult Gaia, and other modern labels\u2014unexpected cutouts, asymmetric draping, color-pop accessories, and artful textures that photograph with lively energy',
    useOriginal: false,
  },
];

// ─── Backdrops (the 3 Dustin specified) ───

const BACKDROP_CHOICES = [
  {
    id: 'fashion-grey',
    label: 'Fashion Grey',
    description: 'Savage Seamless Fashion Grey (#56, hex #90969B)',
  },
  {
    id: 'deep-yellow',
    label: 'Deep Yellow',
    description: 'Savage Seamless Deep Yellow (#71, hex #FFB300)',
  },
  {
    id: 'blue-mist',
    label: 'Blue Mist',
    description: 'Savage Seamless Blue Mist (#41, hex #7CAFD6)',
  },
];

// ─── Lighting (the 3 Dustin specified) ───

function lp(text: string): string {
  return `${text.replace(/\s+/g, ' ').trim()} Describe only the light's effect on the subject and seamless backdrop. Keep every fixture, boom, stand, cable, reflection, or hardware element out of frame\u2014lights must feel implied and invisible. Frame so the seamless background fills edge-to-edge with no studio floor, backdrop roll, or paper edge visible.`;
}

const LIGHTING_CHOICES = [
  {
    id: 'clean-corporate',
    name: 'Clean Corporate',
    prompt: lp('[Lighting Setup: Clean Corporate], medium softbox camera right creating flattering modeling, white reflector fill, even illumination on seamless [USER_COLOR] backdrop.'),
  },
  {
    id: 'dramatic-rim-edge',
    name: 'Dramatic Rim Edge',
    prompt: lp('[Lighting Setup: Dramatic Rim Edge], main light is a medium softbox camera left, tight 30-degree gridded spot light with a warming gel acting as a hard rim/hair light from rear right, gobos used to shape light patterns on the seamless [USER_COLOR] backdrop.'),
  },
  {
    id: 'graphic-studio',
    name: 'Graphic Studio',
    prompt: lp('[Lighting Setup: Graphic Studio], high camera angle, medium softbox main light, medium softbox lighting backdrop, 30-degree gridded hair light, 30-degree grid with red gel creating accent on seamless [USER_COLOR] backdrop.'),
  },
];

// ═══════════════════════════════════════════════════════════════════
//  PROMPT BUILDER
// ═══════════════════════════════════════════════════════════════════

interface WardrobeChoice { id: string; label: string; prompt: string; useOriginal: boolean }
interface LightingChoice { id: string; name: string; prompt: string }
interface BackdropChoice { id: string; label: string; description: string }
interface LensChoice { id: string; label: string; prompt: string }
interface RetouchChoice { id: string; label: string; prompt: string }

interface PortraitCombo {
  lens: LensChoice;
  retouch: RetouchChoice;
  wardrobe: WardrobeChoice;
  lighting: LightingChoice;
  backdrop: BackdropChoice;
}

function buildPrompt(combo: PortraitCombo): string {
  const { lens, retouch, wardrobe, lighting, backdrop } = combo;

  const lightingText = lighting.prompt.replaceAll('[USER_COLOR]', backdrop.description);

  const wardrobeLine = wardrobe.useOriginal
    ? 'Use the clothing from the upload but steam away wrinkles and discreetly pin fabrics into the most flattering drape. Reimagine the outfit with new accessories, layers, or styling so each portrait feels freshly tailored even when garments repeat.'
    : `Restyle the subject in ${wardrobe.prompt}. Explore varied silhouettes, fabrics, and accessories so the wardrobe never repeats the same combination twice.`;

  return `Transform this casual iPhone selfie into a cinematic, fashion-editorial portrait while maintaining absolute realism. Maintain original skin tone and ethnic features exactly. Maintain forehead, nose, lips, eye color, and proportions precisely. Keep grey hair, scars, and asymmetry untouched.

Above every styling decision, the final portrait must feel undeniably like the same person\u2014when they see it, they should instantly recognize themselves in the image.

Preserve bone structure: keep identical cheekbones, jawline width, chin length, ear height, and eye spacing. Do not shrink or enlarge facial features. If the model is uncertain about facial geometry, err on the side of a slightly slimmer interpretation rather than widening the face. Professional retouching, makeup, and hair styling are allowed, but they must sit on top of the original geometry so the subject is instantly recognizable as themselves.

Do not introduce hair color changes or grey strands that weren't in the upload; honor the original pigment. Use sophisticated posing, body posture, tailored clothing, shaping garments, and flattering angles to naturally slim or elongate the physique while keeping anatomy believable.

Respect the subject's identity yet allow creative posing and lighting experimentation. Do not alter the shot's width-to-height proportions\u2014match the original aspect ratio exactly instead of cropping to a new frame.

Render using the Labs portrait research stack with ${lens.prompt}. Style the subject as if a wardrobe stylist, hair stylist, and makeup artist were on set \u2014 polished yet effortless.

Place the subject in front of a seamless nudio studio backdrop (${backdrop.label} \u2014 ${backdrop.description}) with ${lightingText}. Interpret every lighting diagram as creative direction only\u2014describe the sculpting effect (soft wrap, rim glow, hair separation, etc.) without ever depicting the physical fixtures or their reflections. The light sources must feel implied, invisible, and completely outside the frame.

Never show lighting equipment, stands, modifiers, reflections of fixtures, cables, rolled seamless edges, or studio floors. If any hardware begins to appear, immediately recompose or crop tighter until only the subject and the perfectly smooth ${backdrop.label} seamless wall remain edge to edge. This is non-negotiable: no matter what lighting technique you follow, frame and crop like a master photographer so zero physical lighting elements ever enter the shot. If hiding the gear requires changing the camera height or angle, do so instinctively.

${wardrobeLine} Avoid displaying visible brand logos, monograms, or text on garments or accessories\u2014keep all surfaces clean and label-free by default.

Use the Labs portrait workflow at its standard 2048-by-2048 render size for faster turnaround.

${retouch.prompt} Composition goals: shallow depth of field (f/2.0\u2013f/4.0 feel), precise focus on the eyes, natural confident expression, studio color grading that feels filmic but still honest. Mood keywords: editorial, refined, confident, minimalism, cinematic realism. Render up to 4K resolution with fully photorealistic detail.`;
}

// ═══════════════════════════════════════════════════════════════════
//  COMBO GENERATOR — 3 unique combos from the 3-item pools
// ═══════════════════════════════════════════════════════════════════

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i]!, a[j]!] = [a[j]!, a[i]!];
  }
  return a;
}

function generateCombos(gender: string): PortraitCombo[] {
  const wardrobePool = gender === 'female' ? WARDROBE_FEMALE : WARDROBE_MALE;

  const lenses = shuffle(LENS_CHOICES);
  const retouches = shuffle(RETOUCH_CHOICES);
  const wardrobes = shuffle(wardrobePool);
  const backdrops = shuffle(BACKDROP_CHOICES);
  const lightings = shuffle(LIGHTING_CHOICES);

  return [0, 1, 2].map(i => ({
    lens: lenses[i]!,
    retouch: retouches[i]!,
    wardrobe: wardrobes[i]!,
    lighting: lightings[i]!,
    backdrop: backdrops[i]!,
  }));
}

// ═══════════════════════════════════════════════════════════════════
//  HANDLER — matches Nudio backend API call structure exactly
// ═══════════════════════════════════════════════════════════════════

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

    // Strip data URL prefix if present (same as Nudio backend)
    const base64Data = imageBase64.includes(',')
      ? imageBase64.split(',')[1]
      : imageBase64;

    const combos = generateCombos(gender || 'male');
    const portraits: Array<{ index: number; imageBase64: string; combo: PortraitCombo }> = [];
    const errors: string[] = [];

    // gemini-2.5-flash-image — same model as Nudio
    const imageModel = 'gemini-2.5-flash-image';

    for (let i = 0; i < combos.length; i++) {
      const combo = combos[i]!;
      const promptText = buildPrompt(combo);

      try {
        // Exact same API call structure as Nudio's optimize-listing backend
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${imageModel}:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                role: 'user',
                parts: [
                  { inlineData: { mime_type: mimeType, data: base64Data } },
                  { text: promptText }
                ]
              }],
              generationConfig: {
                temperature: 0.4,
                topP: 0.95,
                topK: 40,
              }
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

        // CRITICAL: Use inlineData (camelCase) not inline_data (snake_case)
        let foundImage = false;
        if (data.candidates?.[0]?.content?.parts) {
          for (const part of data.candidates[0].content.parts) {
            if (part.inlineData) {
              portraits.push({ index: i, imageBase64: part.inlineData.data, combo });
              foundImage = true;
              break;
            }
          }
        }

        if (!foundImage) {
          const textParts = data.candidates?.[0]?.content?.parts
            ?.filter((p: any) => p.text)
            ?.map((p: any) => p.text)
            ?.join(' ');
          errors.push(`Portrait ${i + 1}: No image returned${textParts ? ` \u2014 ${textParts.slice(0, 200)}` : ''}`);
        }
      } catch (genErr: any) {
        const msg = genErr.message || String(genErr);
        console.error(`Portrait ${i + 1} generation failed:`, msg);
        errors.push(`Portrait ${i + 1}: ${msg}`);
      }
    }

    if (portraits.length === 0) {
      return res.status(500).json({ error: 'All portrait generations failed', details: errors });
    }

    // Upload portraits to Supabase storage
    const results = [];
    for (const portrait of portraits) {
      const buffer = Buffer.from(portrait.imageBase64, 'base64');
      const fileName = `portraits/${agentId || 'temp'}/${Date.now()}-${portrait.index}.png`;

      const { error: uploadErr } = await supabase.storage
        .from('listing-designs')
        .upload(fileName, buffer, { contentType: 'image/png', upsert: true });

      if (uploadErr) { console.error('Upload error:', uploadErr); continue; }

      const { data: urlData } = supabase.storage.from('listing-designs').getPublicUrl(fileName);

      results.push({
        url: urlData.publicUrl,
        index: portrait.index,
        settings: {
          lens: portrait.combo.lens.label,
          retouch: portrait.combo.retouch.label,
          wardrobe: portrait.combo.wardrobe.label,
          lighting: portrait.combo.lighting.name,
          backdrop: portrait.combo.backdrop.label,
        },
      });
    }

    // Upload original
    const origBuffer = Buffer.from(base64Data, 'base64');
    const origFileName = `portraits/${agentId || 'temp'}/${Date.now()}-original.jpg`;
    await supabase.storage.from('listing-designs').upload(origFileName, origBuffer, { contentType: mimeType, upsert: true });
    const { data: origUrlData } = supabase.storage.from('listing-designs').getPublicUrl(origFileName);

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
