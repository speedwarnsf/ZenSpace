import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://vqkoxfenyjomillmxawh.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

// ═══════════════════════════════════════════════════════════════════
//  NUDIO LABS PORTRAIT ENGINE — exact prompts from labsLighting.js
// ═══════════════════════════════════════════════════════════════════

// ─── Lens Choices ───

const LABS_LENS_CHOICES = [
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

// ─── Retouch Choices ───

const LABS_RETOUCH_CHOICES = [
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

// ─── Wardrobe Choices ───

const LABS_WARDROBE_MALE = [
  {
    id: 'style-corporate',
    label: 'Tailored formal',
    prompt: 'modern executive tailoring inspired by Brioni, Kiton, Armani, or Thom Browne—sleek suits, immaculate shirts, sharp ties, and luxurious fabrics that photograph like a GQ cover',
    useOriginal: false,
  },
  {
    id: 'style-casual',
    label: 'City smart',
    prompt: 'elevated off-duty layers referencing Todd Snyder, Arket, COS, Fear of God, Peter Millar, or Bonobos—neutral palettes, premium knits, relaxed tailoring, and street-ready confidence',
    useOriginal: false,
  },
  {
    id: 'style-dramatic',
    label: 'Art-forward',
    prompt: 'experimental menswear silhouettes inspired by New York Men\'s Day runways or Lemon8 street fashion—statement outerwear, layered textures, unexpected proportions, and bold accessories',
    useOriginal: false,
  },
];

const LABS_WARDROBE_FEMALE = [
  {
    id: 'style-women-tailored',
    label: 'Editorial womenswear',
    prompt: 'powerful womenswear tailoring that feels like a Khaite, Proenza Schouler, or The Row look—sculpted blazers, fluid trousers, monochrome palettes, and architectural silhouettes that read like a Vogue feature',
    useOriginal: false,
  },
  {
    id: 'style-women-play',
    label: 'Playful womenswear',
    prompt: 'fashion-forward womenswear inspired by Jacquemus, Loewe, Cult Gaia, and other modern labels—unexpected cutouts, asymmetric draping, color-pop accessories, and artful textures that photograph with lively energy',
    useOriginal: false,
  },
  {
    id: 'style-women-punk',
    label: 'Edgy rebel',
    prompt: 'avant-garde punk couture referencing Alexander McQueen, Balenciaga, Rick Owens, and Ann Demeulemeester—glossy leathers, sculpted jackets, metal hardware, and daring asymmetry',
    useOriginal: false,
  },
];

// ─── Backdrop Variants (Savage Seamless) ───

const BACKDROP_VARIANTS = [
  {
    id: 'fashion-grey',
    label: 'Fashion Grey',
    description: 'Savage Seamless Fashion Grey (#56, hex #90969B)',
    tone: 'a soft city-fog grey backdrop with studio neutrality',
  },
  {
    id: 'deep-yellow',
    label: 'Deep Yellow',
    description: 'Savage Seamless Deep Yellow (#71, hex #FFB300)',
    tone: 'a glowing amber yellow backdrop with sunshine warmth',
  },
  {
    id: 'blue-mist',
    label: 'Blue Mist',
    description: 'Savage Seamless Blue Mist (#41, hex #7CAFD6)',
    tone: 'a cool powder blue backdrop with airy vibrancy',
  },
];

// ─── Lighting Setups (from LABS_LIGHTING_GROUPS) ───

function lightingPrompt(text: string): string {
  return `${text.replace(/\s+/g, ' ').trim()} Describe only the light's effect on the subject and seamless backdrop. Keep every fixture, boom, stand, cable, reflection, or hardware element out of frame—lights must feel implied and invisible. Frame so the seamless background fills edge-to-edge with no studio floor, backdrop roll, or paper edge visible.`;
}

const LIGHTING_SETUPS = [
  {
    id: 'classic-executive',
    name: 'Classic Executive',
    prompt: lightingPrompt('[Lighting Setup: Classic Executive], main light is a medium softbox positioned camera right creating modeled light, fill light from an umbrella near camera axis to open shadows, subject against a seamless [USER_COLOR] studio backdrop, background lit naturally by spill from the main light.'),
  },
  {
    id: 'dramatic-rim-edge',
    name: 'Dramatic Rim Edge',
    prompt: lightingPrompt('[Lighting Setup: Dramatic Rim Edge], main light is a medium softbox camera left, tight 30-degree gridded spot light with a warming gel acting as a hard rim/hair light from rear right, gobos used to shape light patterns on the seamless [USER_COLOR] backdrop.'),
  },
  {
    id: 'butterfly-beauty',
    name: 'Butterfly Beauty',
    prompt: lightingPrompt('[Lighting Setup: Butterfly Beauty], imagine a large overhead softbox and white reflector shaping the face, plus a gridded hair light for separation on the seamless [USER_COLOR] backdrop. Describe only the luminous beauty ripple—never the reflector, boom, or any hardware. If a reflector would be visible, reframe tighter so only the subject and backdrop remain.'),
  },
];

// ═══════════════════════════════════════════════════════════════════
//  PROMPT BUILDER — exact structure from Nudio Labs buildLabsPrompt
// ═══════════════════════════════════════════════════════════════════

interface PortraitCombo {
  lens: typeof LABS_LENS_CHOICES[0];
  retouch: typeof LABS_RETOUCH_CHOICES[0];
  wardrobe: typeof LABS_WARDROBE_MALE[0];
  lighting: typeof LIGHTING_SETUPS[0];
  backdrop: typeof BACKDROP_VARIANTS[0];
}

function buildLabsPrompt(combo: PortraitCombo): string {
  const { lens, retouch, wardrobe, lighting, backdrop } = combo;

  const lightingText = lighting.prompt.replaceAll('[USER_COLOR]', backdrop.description ?? backdrop.label);

  const wardrobeLine = wardrobe.useOriginal
    ? 'Use the clothing from the upload but steam away wrinkles and discreetly pin fabrics into the most flattering drape. Reimagine the outfit with new accessories, layers, or styling so each portrait feels freshly tailored even when garments repeat.'
    : `Restyle the subject in ${wardrobe.prompt}. Explore varied silhouettes, fabrics, and accessories so the wardrobe never repeats the same combination twice.`;

  return `Transform this casual iPhone selfie into a cinematic, fashion-editorial portrait while maintaining absolute realism. Maintain original skin tone and ethnic features exactly. Maintain forehead, nose, lips, eye color, and proportions precisely. Keep grey hair, scars, and asymmetry untouched.

Above every styling decision, the final portrait must feel undeniably like the same person—when they see it, they should instantly recognize themselves in the image.

Preserve bone structure: keep identical cheekbones, jawline width, chin length, ear height, and eye spacing. Do not shrink or enlarge facial features. If the model is uncertain about facial geometry, err on the side of a slightly slimmer interpretation rather than widening the face. Professional retouching, makeup, and hair styling are allowed, but they must sit on top of the original geometry so the subject is instantly recognizable as themselves.

Do not introduce hair color changes or grey strands that weren't in the upload; honor the original pigment. Use sophisticated posing, body posture, tailored clothing, shaping garments, and flattering angles to naturally slim or elongate the physique while keeping anatomy believable.

Respect the subject's identity yet allow creative posing and lighting experimentation. Do not alter the shot's width-to-height proportions—match the original aspect ratio exactly instead of cropping to a new frame.

Render using the Labs portrait research stack with ${lens.prompt}. Style the subject as if a wardrobe stylist, hair stylist, and makeup artist were on set — polished yet effortless.

Place the subject in front of a seamless nudio studio backdrop (${backdrop.label} — ${backdrop.description}) with ${lightingText}. Interpret every lighting diagram as creative direction only—describe the sculpting effect (soft wrap, rim glow, hair separation, etc.) without ever depicting the physical fixtures or their reflections. The light sources must feel implied, invisible, and completely outside the frame.

Never show lighting equipment, stands, modifiers, reflections of fixtures, cables, rolled seamless edges, or studio floors. If any hardware begins to appear, immediately recompose or crop tighter until only the subject and the perfectly smooth ${backdrop.label} seamless wall remain edge to edge. This is non-negotiable: no matter what lighting technique you follow, frame and crop like a master photographer so zero physical lighting elements ever enter the shot. If hiding the gear requires changing the camera height or angle, do so instinctively.

${wardrobeLine} Avoid displaying visible brand logos, monograms, or text on garments or accessories—keep all surfaces clean and label-free by default.

Use the Labs portrait workflow at its standard 2048-by-2048 render size for faster turnaround.

${retouch.prompt}. Composition goals: shallow depth of field (f/2.0–f/4.0 feel), precise focus on the eyes, natural confident expression, studio color grading that feels filmic but still honest. Mood keywords: editorial, refined, confident, minimalism, cinematic realism. Render up to 4K resolution with fully photorealistic detail.`;
}

// ═══════════════════════════════════════════════════════════════════
//  COMBO GENERATOR — 3 unique non-repeating combos
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
  const wardrobePool = gender === 'female' ? LABS_WARDROBE_FEMALE : LABS_WARDROBE_MALE;

  const lenses = shuffle(LABS_LENS_CHOICES);
  const retouches = shuffle(LABS_RETOUCH_CHOICES);
  const wardrobes = shuffle(wardrobePool);
  const lightings = shuffle(LIGHTING_SETUPS);
  const backdrops = shuffle(BACKDROP_VARIANTS);

  return [0, 1, 2].map(i => ({
    lens: lenses[i]!,
    retouch: retouches[i]!,
    wardrobe: wardrobes[i]!,
    lighting: lightings[i]!,
    backdrop: backdrops[i]!,
  }));
}

// ═══════════════════════════════════════════════════════════════════
//  HANDLER
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

    // Build 3 unique combos
    const combos = generateCombos(gender || 'male');
    const portraits: Array<{ index: number; imageBase64: string; combo: PortraitCombo }> = [];
    const errors: string[] = [];

    // Use gemini-2.5-flash-image — the Nudio engine model
    const imageModel = 'gemini-2.5-flash-image';

    for (let i = 0; i < combos.length; i++) {
      const combo = combos[i]!;
      const prompt = buildLabsPrompt(combo);

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
                  { text: prompt },
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

        // Extract generated image from response
        let foundImage = false;
        if (data.candidates?.[0]?.content?.parts) {
          for (const part of data.candidates[0].content.parts) {
            if (part.inlineData?.data) {
              portraits.push({
                index: i,
                imageBase64: part.inlineData.data,
                combo,
              });
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
        settings: {
          lens: portrait.combo.lens.label,
          retouch: portrait.combo.retouch.label,
          wardrobe: portrait.combo.wardrobe.label,
          lighting: portrait.combo.lighting.name,
          backdrop: portrait.combo.backdrop.label,
        },
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
