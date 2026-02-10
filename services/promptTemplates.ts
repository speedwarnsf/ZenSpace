/**
 * Enhanced AI Prompts for ZenSpace
 * Optimized prompts for better room analysis and visualization
 */

export interface PromptContext {
  roomType?: string;
  style?: string;
  budget?: 'low' | 'medium' | 'high';
  timeframe?: 'quick' | 'weekend' | 'extended';
  livingSpace?: 'small' | 'medium' | 'large';
  residents?: 'single' | 'couple' | 'family' | 'roommates';
}

/**
 * Main analysis prompt template
 */
export function createAnalysisPrompt(context: PromptContext = {}): string {
  const {
    roomType = 'room',
    style = 'modern',
    budget = 'medium',
    timeframe = 'weekend',
    livingSpace = 'medium',
    residents = 'single'
  } = context;

  return `You are ZenSpace AI, an expert professional organizer and interior designer. Analyze this ${roomType} image and provide practical, confidence-building guidance.

**CONTEXT TO USE:**
- Living situation: ${residents}
- Space size: ${livingSpace}
- Preferred style: ${style}
- Budget range: ${budget}
- Time available: ${timeframe}

**RESPONSE FORMAT (STRICT JSON ONLY, NO MARKDOWN FENCES):**
{
  "analysis_markdown": "A Markdown string with the sections below, using '##' headings and concise bullets.",
  "visualization_prompt": "A strict, imperative command list to transform the room (keep layout and large furniture fixed).",
  "products": [
    {
      "name": "Under-bed storage bin",
      "reason": "Maximizes unused space beneath the bed for seasonal items"
    }
  ]
}

**PRODUCTS RULES:**
- Exactly 3-5 product objects
- name: 2-5 words, generic product type (no brands)
- reason: One sentence max

**ANALYSIS MARKDOWN SECTIONS (IN THIS ORDER):**
## Key Issues
- 3-4 bullets describing main clutter sources and impact.

## Quick Wins (15 min)
- 3 actionable tasks that can be done quickly.

## Storage Solutions
- 3-5 specific storage ideas with placement hints.

## Step-by-Step Plan
1. Numbered, clear steps (5-7 total), each with a time estimate.

## Aesthetic Tip
- One design tip for a calm, zen feel.

If the room already appears organized, say so and focus on maintenance and micro-optimizations.

**QUALITY STANDARDS:**
- Be concrete and room-specific (avoid vague advice).
- Suggest realistic timelines and achievable actions.
- Prioritize safety and clear pathways.
- Avoid brand names; recommend product types only.

Return ONLY the JSON object with the fields above.`;
}

/**
 * Design-theory-grounded room analysis that produces 3 distinct design directions.
 * References: DESIGN-THEORY.md (5 academic frameworks)
 */
// Design seeds grounded in interior design PRINCIPLES, not cultural geography
interface DesignSeed {
  principle: string;   // The core design idea driving this direction
  approach: string;    // How to apply it
  thinkers: string;    // Designers/theorists who embody this thinking
  rug: string;         // Specific textile anchor
}

const DESIGN_SEEDS: DesignSeed[] = [
  // --- SPATIAL & STRUCTURAL ---
  { principle: 'Compression and release — manipulate ceiling height, narrowness, and openness to create emotional rhythm through a room',
    approach: 'Use color, lighting, and furniture scale to make parts of the room feel intimate and others expansive',
    thinkers: 'Frank Lloyd Wright (prairie compression), Luis Barragán (color volumes), Peter Zumthor (atmospheric density)',
    rug: 'deep-pile wool runner that defines the "release" zone, pulling the eye toward openness' },
  { principle: 'Asymmetric balance — reject mirror symmetry for dynamic visual tension that still feels resolved',
    approach: 'Off-center focal points, unequal but balanced masses, deliberate visual weight distribution',
    thinkers: 'Eileen Gray (asymmetric screens), Charlotte Perriand (sculptural arrangement), Isamu Noguchi (balanced tension)',
    rug: 'asymmetrically patterned hand-knotted wool — one side dense, the other sparse, creating visual pull' },
  { principle: 'Scale disruption — use one dramatically oversized or undersized element to reframe everything else',
    approach: 'A monumental light fixture, a tiny chair, an enormous mirror — break expected proportions to create wonder',
    thinkers: 'Gaetano Pesce (oversized resin), Faye Toogood (chunky sculptural scale), Claes Oldenburg (the power of wrong scale)',
    rug: 'an unexpectedly massive rug that climbs 6 inches up the walls, blurring floor and wall boundaries' },

  // --- MATERIAL & TEXTURE ---
  { principle: 'Material honesty meets material contrast — celebrate what things are made of by placing opposites together',
    approach: 'Raw against refined, soft against hard, matte against gloss — every surface tells a story through juxtaposition',
    thinkers: 'Vincenzo De Cotiis (oxidized metal + marble), Axel Vervoordt (raw plaster + aged wood), John Pawson (stone purity)',
    rug: 'hand-felted wool with visible fiber structure, undyed, next to polished concrete or stone floor' },
  { principle: 'Patina as design — age, wear, and imperfection as deliberate aesthetic choices, not flaws to hide',
    approach: 'Specify materials that develop character over time — unlacquered brass, saddle leather, limewash, living finishes',
    thinkers: 'Wabi-sabi philosophy, Axel Vervoordt, Bijoy Jain / Studio Mumbai (handcraft + time)',
    rug: 'antique hand-repaired textile — visible mending as design feature, silk-wool blend with natural patina' },
  { principle: 'Textile architecture — fabric and fiber as structural, spatial elements, not just soft accessories',
    approach: 'Draped canopies, fabric room dividers, upholstered walls, woven screens — textiles that define space',
    thinkers: 'Anni Albers (textile as art), Christo (wrapped environments), Ilse Crawford (sensory richness)',
    rug: 'hand-tufted sculptural rug with 3 different pile heights creating a topographic landscape underfoot' },

  // --- LIGHT & COLOR ---
  { principle: 'Light as the primary material — design the room around how light enters, bounces, pools, and retreats',
    approach: 'Layer natural and artificial light deliberately — washing, spotlighting, backlighting, candlelight as architecture',
    thinkers: 'James Turrell (light as medium), Tadao Ando (light cuts), Olafur Eliasson (color-spectrum light)',
    rug: 'light-reflective silk-cotton blend in pale champagne — designed to catch and amplify ambient light' },
  { principle: 'Chromatic boldness — use saturated, unexpected color as the primary design move, not an accent',
    approach: 'Full-wall color drenching, tonal rooms (all one hue at different saturations), color blocking as spatial definition',
    thinkers: 'India Mahdavi (joyful color), Luis Barragán (emotional color planes), Pierre Yovanovitch (moody palettes)',
    rug: 'saturated solid-color hand-tufted wool — one bold hue that anchors the entire room\'s palette' },
  { principle: 'Tonal restraint — a single color family explored in maximum depth, creating richness through subtlety',
    approach: 'Monochromatic or near-monochromatic, with variety through texture, sheen, and material rather than hue shifts',
    thinkers: 'Joseph Dirand (tonal Paris), Vincent Van Duysen (Belgian warmth), John Pawson (monastic minimalism)',
    rug: 'tone-on-tone hand-loomed wool in three closely related values — visible only up close, felt from across the room' },

  // --- SENSORY & EXPERIENTIAL ---
  { principle: 'Multi-sensory design — design for touch, smell, sound, and temperature, not just sight',
    approach: 'Acoustic textures, scented materials (cedar, leather, beeswax), thermal variety (cool stone near warm textiles)',
    thinkers: 'Ilse Crawford (humanistic design), Peter Zumthor (thermal baths as architecture), Juhani Pallasmaa (eyes of the skin)',
    rug: 'deep hand-knotted Moroccan wool — thick enough to muffle footsteps, warm enough to sit on' },
  { principle: 'Prospect and refuge — create spaces that balance openness (seeing out) with enclosure (feeling protected)',
    approach: 'Reading nooks within open plans, canopy beds, high-backed settees, rooms within rooms',
    thinkers: 'Christopher Alexander (pattern language), Frank Lloyd Wright (inglenook), Ilse Crawford (nesting instinct)',
    rug: 'round hand-woven rug defining a "refuge" zone — like a campfire circle within the larger room' },
  { principle: 'Biophilic immersion — not just "add a plant" but fundamentally connect the room to living systems and natural pattern',
    approach: 'Fractal patterns, water features, living walls, natural materials at every touch point, views framed as landscape',
    thinkers: 'Kengo Kuma (organic structure), Bijoy Jain (earth + craft), Stephen Kellert (biophilic theory)',
    rug: 'hand-woven jute and seagrass with irregular organic edge — no straight lines, mimicking natural growth patterns' },

  // --- CONCEPTUAL & PROVOCATIVE ---
  { principle: 'Narrative space — design the room as if it tells a story or belongs to a fictional character',
    approach: 'Every object implies a life lived — collected, curated, eccentric. The room as autobiography, not catalog',
    thinkers: 'Kelly Wearstler (fearless curation), Jacques Garcia (theatrical), Tony Duquette (fantasy environments)',
    rug: 'vintage overdyed Persian — a rug with history, possibly mismatched with everything else, but that\'s the point' },
  { principle: 'Anti-decoration — strip away everything decorative and find beauty in pure function, structure, and void',
    approach: 'Remove, reduce, reveal. Expose structure, eliminate ornament, let negative space do the heavy lifting',
    thinkers: 'Donald Judd (Marfa minimalism), Tadao Ando (concrete poetry), Pawson (less is enough)',
    rug: 'a single sheepskin on raw concrete — the refusal to fill space IS the design statement' },
  { principle: 'Playful subversion — break the "rules" of good taste deliberately, with confidence and humor',
    approach: 'Clashing patterns that work, furniture in wrong rooms, high-low mixing (plastic chairs + marble table), irreverence as style',
    thinkers: 'Memphis Group / Sottsass (design as provocation), Gaetano Pesce (anti-perfection), India Mahdavi (serious play)',
    rug: 'a deliberately "ugly" bold-patterned rug that somehow becomes the most magnetic thing in the room' },
];

// Group seeds by design axis to guarantee diversity within each batch
const SEED_BUCKETS: Record<string, number[]> = {
  spatial_structural:       [0, 1, 2],    // compression/release, asymmetric balance, scale disruption
  material_texture:         [3, 4, 5],    // material contrast, patina, textile architecture
  light_color:              [6, 7, 8],    // light as material, chromatic boldness, tonal restraint
  sensory_experiential:     [9, 10, 11],  // multi-sensory, prospect/refuge, biophilic immersion
  conceptual_provocative:   [12, 13, 14], // narrative space, anti-decoration, playful subversion
};

function getDesignSeed(): DesignSeed[] {
  const bucketKeys = Object.keys(SEED_BUCKETS).sort(() => Math.random() - 0.5);
  const pickedBuckets = bucketKeys.slice(0, 3);
  return pickedBuckets.map(key => {
    const indices = SEED_BUCKETS[key]!;
    const idx = indices[Math.floor(Math.random() * indices.length)]!;
    return DESIGN_SEEDS[idx]!;
  });
}

export function createDesignAnalysisPrompt(context: PromptContext & { previousDesigns?: string[] } = {}): string {
  const { roomType = 'room', previousDesigns = [] } = context;
  const seeds = getDesignSeed() as [DesignSeed, DesignSeed, DesignSeed];

  return `You are ZenSpace AI, a bold and opinionated interior design expert. You don't do boring. You create spaces people screenshot and send to friends.

You draw from five academic frameworks — but you USE them creatively, not academically:

1. **Aesthetic Order** (Wharton & Codman) — proportion, symmetry, visual rhythm, architectural integrity
2. **Human-Centric** — ergonomics, proxemics, how the body actually moves through space
3. **Universal Design** — inclusive, accessible, works for everyone without feeling "accessible"
4. **Biophilic** — nature connection, organic forms, living materials, light as a design element
5. **Phenomenological** — genius loci, multi-sensory experience, emotional resonance, what makes a space FEEL like something

You've internalized the philosophies of designers like Vervoordt, Wearstler, Crawford, Mahdavi, De Cotiis, Jain, Pesce, Toogood, and movements like wabi-sabi and Memphis. Let their THINKING inform your work — but write in YOUR voice. Don't name-drop designers in the output. The user should feel the influence through the ideas and material choices, not through citations. Show, don't tell.

STEP 1 — ROOM READING
Analyze this ${roomType} photo honestly. What's working? What's killing the vibe? Be specific about what you see.

STEP 2 — THREE DRAMATICALLY DIFFERENT DESIGN DIRECTIONS
Generate 3 options that are BOLDLY distinct from each other. Not three flavors of "modern minimalist."

FOR THIS SPECIFIC GENERATION, each option is driven by a core DESIGN PRINCIPLE (not a cultural style):

- Option 1 PRINCIPLE: ${seeds[0].principle}
  Approach: ${seeds[0].approach}
  Think like: ${seeds[0].thinkers}
- Option 2 PRINCIPLE: ${seeds[1].principle}
  Approach: ${seeds[1].approach}
  Think like: ${seeds[1].thinkers}
- Option 3 PRINCIPLE: ${seeds[2].principle}
  Approach: ${seeds[2].approach}
  Think like: ${seeds[2].thinkers}

These are DESIGN IDEAS, not style labels. Apply them to THIS specific room. The result should feel like a design thesis, not a Pinterest board.

**MANDATORY DIVERSITY CHECK — THE 3 OPTIONS MUST DIFFER ON ALL OF THESE AXES:**
1. **Color temperature**: one warm (ambers, terracottas, golds), one cool (blues, greens, silvers), one wild card (unexpected combos — pinks, yellows, black+neon, etc.)
2. **Density**: one maximalist/layered, one minimal/restrained, one mid-range
3. **Era feel**: one vintage/historical, one futuristic/contemporary, one timeless/eclectic
4. **Dominant material**: one textile-heavy (velvet, linen, wool), one hard-surface-heavy (stone, metal, glass), one organic (wood, rattan, ceramic, clay)
5. **Emotional register**: one cozy/intimate, one dramatic/bold, one serene/airy

If your 3 options could be described with similar adjectives, START OVER. They should feel like they come from 3 different planets.

**THE RADICAL SLOT:** One of the 3 designs (rotate which one) should be genuinely radical — not "edgy minimalism" but something that makes someone do a double-take. Think: a living room reimagined as a Yayoi Kusama infinity room. A bedroom that channels a 1970s Pierre Cardin spaceship. A kitchen inspired by a Portuguese fisherman's cottage. A den that feels like the back room of a Tokyo vinyl bar. Brutalist concrete meets Frida Kahlo. A room where the ceiling is the statement piece. Go somewhere no sane interior designer would suggest — and make it work.

CREATIVE DIRECTION RULES:

**RUGS & TEXTILES ARE KEY.** Every design MUST specify a rug or floor textile that's high-end and specific. NOT "add a rug" or "area rug." Think:
- "${seeds[0].rug}" (for the ${seeds[0].principle.split(' — ')[0]} direction)
- "${seeds[1].rug}" (for the ${seeds[1].principle.split(' — ')[0]} direction)
- "${seeds[2].rug}" (for the ${seeds[2].principle.split(' — ')[0]} direction)
Rugs are the anchor of a room. Be specific about material, weave, origin, pattern, and color. Think Architectural Digest, not HomeGoods.
- Each option must have a COMPLETELY different color story (not just warm vs. cool vs. neutral)
- At least one option should be unexpected or daring — something they wouldn't have thought of
- Names should be evocative and specific (not generic like "Modern Comfort" — think "Midnight Library" or "Desert Bloom" or "Tokyo Dawn")
- Mood descriptions should make the user FEEL something
- Key changes should be dramatic enough to actually transform the space
- Think about lighting, texture, pattern, and scale — not just color and furniture

For each direction provide:
- A short evocative name (2-4 words, make it vivid)
- A 1-2 sentence mood/vibe that sells the vision emotionally
- Which frameworks primarily drive it (2-3, by exact name: "Aesthetic Order", "Human-Centric", "Universal Design", "Biophilic", "Phenomenological")
- A "framework_rationale" — 2-3 sentences per framework explaining HOW it specifically shaped decisions in THIS design. Not "we used Biophilic design" but "The Biophilic framework drives the decision to replace the overhead fluorescent with a layered lighting scheme that mimics dappled forest canopy — pendant at 2700K for golden-hour warmth, with a floor lamp creating pools of light that draw the eye toward the window's natural light." Be specific. Cite the principle, then show the move it demanded.
- A 5-colour hex palette (make them INTERESTING — rich, unexpected combinations)
- 3-5 key changes (concrete, bold, room-specific)
- A full design plan in markdown that LEADS with the design principle driving this direction. Structure: ### Design Thesis (1 paragraph: what principle drives this, why it matters for THIS room), ### The Interventions (specific changes, each one tied back to the principle or framework — don't just list furniture, explain WHY each move), ### Material Specification (exact materials with reasoning), ### Rug/Textile Anchor (specific as always). 300-500 words.
- A visualization prompt for an AI image generator (detailed, atmospheric, keep room geometry)

**RESPONSE FORMAT (STRICT JSON, NO MARKDOWN FENCES):**
{
  "room_reading": "Markdown analysis — honest, specific, reference what you actually see. 3-5 paragraphs.",
  "options": [
    {
      "name": "Midnight Library",
      "mood": "Deep, moody, intellectual — like falling asleep in a velvet armchair surrounded by old books and amber light.",
      "frameworks": ["Phenomenological", "Aesthetic Order"],
      "framework_rationale": "**Phenomenological:** This room's tall ceilings and existing wood tones have a latent character as a contemplative retreat — we're amplifying that. Every material (aged leather, unlacquered brass, wool) is chosen for multi-sensory resonance: how it smells, warms under touch, absorbs sound. The space should feel like it has a soul, not just a style. **Aesthetic Order:** The existing picture rail becomes a compositional horizon line — cream above, deep navy below — creating classical proportion that makes the ceiling feel taller and gives the room architectural integrity it currently lacks.",
      "palette": ["#1A1A2E", "#8B6914", "#C4956A", "#E8DCC8", "#2D1B00"],
      "key_changes": ["Paint below picture rail deep navy (Phenomenological: jewel-box enclosure)", "Add unlacquered brass reading lamp (sensory: will develop patina)", "Layer vintage wool textiles (Aesthetic Order: texture rhythm)"],
      "full_plan": "### Design Thesis\\nThis room's existing architecture — the picture rail, the ceiling height — is an underused asset...",
      "visualization_prompt": "Transform this room into a moody library retreat: deep navy accent wall..."
    },
    { ... },
    { ... }
  ]
}

RULES:
- options must be an array of exactly 3 objects
- frameworks values must be exactly from: "Aesthetic Order", "Human-Centric", "Universal Design", "Biophilic", "Phenomenological"
- palette must be exactly 5 hex strings each
- Be room-specific — reference what you actually see in the photo
- The 3 options should feel like they come from 3 different designers with 3 different personalities
- visualization_prompt should paint a vivid picture (keep room geometry fixed)

**ANTI-REPETITION (CRITICAL):**
${previousDesigns.length > 0 ? `The user has ALREADY seen these designs. DO NOT repeat or closely resemble ANY of them:
${previousDesigns.map(d => `- "${d}"`).join('\n')}

Generate designs that are COMPLETELY DIFFERENT from the above — different color families, different moods, different eras, different thinkers. If the above are mostly muted/calm, go bold/vibrant. If they're mostly maximalist, try minimal. ACTIVELY OPPOSE what came before.` : ''}

BANNED PATTERNS (these are overused — avoid unless the seed specifically demands it):
- "Wabi-sabi calm with natural materials and Vervoordt" — this has been done to death
- "Kelly Wearstler maximalism with jewel tones" — unless you have a genuinely fresh take
- "Industrial with grey palette" — boring
- Muted earth tones as the default "safe" option
- Any design that could be described as "modern minimalist with a plant"

PUSH YOURSELF: At least one design should make the user say "I would NEVER have thought of that but now I want it." Think: a room inspired by a David Lynch film. A Japanese kissaten coffee shop. A 1960s Palm Springs pool house. A Marrakech souk at golden hour. A Berlin techno club's green room. Be specific. Be weird. Be brilliant.

Return ONLY the JSON object.`;
}

/**
 * Visualization prompt for generating "after" images
 */
export function createVisualizationPrompt(
  analysisContent: string, 
  context: PromptContext = {}
): string {
  const { style = 'modern', livingSpace = 'medium' } = context;
  
  return `Create a photorealistic "after" visualization of this organized room based on the analysis recommendations.

**SOURCE ANALYSIS:**
${analysisContent}

**VISUALIZATION REQUIREMENTS:**

1. **Maintain Room Structure:**
   - Keep architectural elements (windows, doors, layout)
   - Preserve room proportions and lighting
   - Maintain flooring and wall colors unless specified

2. **Apply Organization Solutions:**
   - Show recommended storage solutions in place
   - Remove/reduce clutter as suggested
   - Implement the step-by-step organization plan
   - Add suggested organizational systems

3. **Style Guidelines:**
   - ${style} aesthetic approach
   - Color palette: calm, cohesive tones
   - Natural lighting when possible
   - Clean lines and minimal visual noise

4. **Realistic Details:**
   - Proper scale and proportions
   - Believable product placement
   - Natural shadows and lighting
   - Lived-in feel (not showroom perfect)

5. **Storage Integration:**
   - Show how recommended storage solutions look installed
   - Display organized items in their new homes
   - Demonstrate improved flow and functionality

**STYLE PREFERENCES:**
- Overall aesthetic: ${style}
- Space size consideration: ${livingSpace}
- Focus on achievable, maintainable organization
- Emphasize calm, zen-like atmosphere

**TECHNICAL SPECS:**
- High resolution, photorealistic quality
- Good lighting that shows organization clearly
- Wide angle that captures the full transformation
- Colors that promote calm and focus

Generate an image that shows how this space would look after implementing the organization recommendations, making it feel peaceful, functional, and achievable.`;
}

/**
 * Chat context prompt for follow-up conversations
 */
export function createChatContextPrompt(analysisContent: string): string {
  return `You are ZenSpace AI, continuing a conversation about organizing this specific room. 

**PREVIOUS ANALYSIS:**
${analysisContent}

**CONVERSATION GUIDELINES:**
- Reference the specific analysis and recommendations already provided
- Answer follow-up questions about implementation details
- Suggest modifications based on user constraints or preferences  
- Provide additional product recommendations when asked
- Help troubleshoot organizational challenges
- Offer motivation and realistic expectations

**RESPONSE STYLE:**
- Conversational and supportive
- Reference specific recommendations from the analysis
- Provide actionable, specific advice
- Ask clarifying questions when helpful
- Keep responses focused and practical

You're continuing to help organize this specific room. Answer questions about implementation, provide additional suggestions, or help modify the plan based on the user's needs.`;
}

/**
 * Product recommendation enhancement
 */
export function enhanceProductRecommendations(storageItems: any[]): any[] {
  return storageItems.map(item => ({
    ...item,
    // Add enhanced product metadata
    searchTerms: generateSearchTerms(item),
    alternatives: suggestAlternatives(item),
    diyOptions: suggestDIYAlternatives(item),
    priceRange: refinePriceEstimate(item),
  }));
}

function generateSearchTerms(item: any): string[] {
  const baseTerms = [item.solution.toLowerCase()];
  
  // Add contextual search terms
  const contextualTerms = {
    'storage bin': ['storage container', 'organization bin', 'plastic storage'],
    'shelf': ['bookshelf', 'storage shelf', 'display shelf'],
    'basket': ['wicker basket', 'storage basket', 'organization basket'],
    'drawer organizer': ['drawer divider', 'drawer insert', 'desk organizer'],
    'hook': ['wall hook', 'adhesive hook', 'command hook'],
    'cabinet': ['storage cabinet', 'organization cabinet'],
  };
  
  Object.entries(contextualTerms).forEach(([key, terms]) => {
    if (item.solution.toLowerCase().includes(key)) {
      baseTerms.push(...terms);
    }
  });
  
  return [...new Set(baseTerms)].slice(0, 5); // Unique terms, max 5
}

function suggestAlternatives(item: any): string[] {
  const alternatives: Record<string, string[]> = {
    'plastic bins': ['fabric storage cubes', 'wicker baskets', 'cardboard boxes'],
    'bookshelf': ['floating shelves', 'ladder shelf', 'cube organizer'],
    'drawer organizer': ['small boxes', 'ice cube trays', 'repurposed containers'],
    'wall hooks': ['adhesive hooks', 'magnetic hooks', 'over-door hooks'],
  };
  
  const solution = item.solution.toLowerCase();
  
  for (const [key, alts] of Object.entries(alternatives)) {
    if (solution.includes(key)) {
      return alts;
    }
  }
  
  return [];
}

function suggestDIYAlternatives(item: any): string[] {
  const diyOptions: Record<string, string[]> = {
    'storage bin': ['repurpose cardboard boxes', 'use mason jars', 'create from milk jugs'],
    'shelf': ['stack books for makeshift shelf', 'use wooden crates', 'repurpose old drawers'],
    'drawer organizer': ['use small boxes or containers', 'create with cardboard dividers'],
    'hook': ['use adhesive strips', 'repurpose command strips', 'magnetic solutions'],
  };
  
  const solution = item.solution.toLowerCase();
  
  for (const [key, options] of Object.entries(diyOptions)) {
    if (solution.includes(key)) {
      return options;
    }
  }
  
  return [];
}

function refinePriceEstimate(item: any): { min: number; max: number; currency: string } {
  const costString = item.estimatedCost || '$10-$30';
  const matches = costString.match(/\$(\d+)-\$(\d+)/);
  
  if (matches) {
    return {
      min: parseInt(matches[1]),
      max: parseInt(matches[2]),
      currency: 'USD'
    };
  }
  
  // Default fallback
  return { min: 10, max: 50, currency: 'USD' };
}

/**
 * Error-specific prompts for different failure scenarios
 */
export const errorRecoveryPrompts = {
  networkError: `I'm having trouble connecting to analyze your image right now. This usually happens due to network issues. 

While we wait for the connection to restore, here are some general organization principles you can start with:

1. **Start with decluttering** - Remove items you don't need
2. **Group similar items** - Keep like things together  
3. **Use vertical space** - Don't forget walls and doors
4. **Create designated homes** - Every item should have a place

Would you like to try uploading your image again?`,

  analysisFailure: `I encountered an issue analyzing your image. Let me try to help anyway!

Could you describe your room briefly? For example:
- What type of room is it? (bedroom, living room, office, etc.)
- What's your main organization challenge?
- How much time do you have to work on it?

I can provide targeted advice based on your description while we work on the technical issue.`,

  imageProcessingError: `I'm having trouble processing your image. Here are a few things to try:

1. **Check image format** - JPG, PNG, or WebP work best
2. **Reduce file size** - Try compressing large images
3. **Ensure good lighting** - Make sure the room is well-lit
4. **Include the full room** - Show as much of the space as possible

In the meantime, I'm happy to answer any organization questions you have!`,
};

/**
 * Prompt validation and optimization
 */
export function validatePromptResponse(response: string): {
  isValid: boolean;
  errors: string[];
  suggestions: string[];
} {
  const errors: string[] = [];
  const suggestions: string[] = [];
  
  try {
    const parsed = JSON.parse(response);
    
    // Required fields validation
    const requiredFields = ['overview', 'keyIssues', 'quickWins', 'storageSupgraded', 'stepByStep', 'zenTip'];
    
    for (const field of requiredFields) {
      if (!parsed[field]) {
        errors.push(`Missing required field: ${field}`);
      }
    }
    
    // Array length validation
    if (parsed.keyIssues && parsed.keyIssues.length < 2) {
      suggestions.push('Include at least 2-3 key issues');
    }
    
    if (parsed.quickWins && parsed.quickWins.length < 3) {
      suggestions.push('Provide at least 3 quick wins');
    }
    
    if (parsed.stepByStep && parsed.stepByStep.length < 5) {
      suggestions.push('Include at least 5 detailed steps');
    }
    
    // Content quality checks
    if (parsed.overview && parsed.overview.length < 50) {
      suggestions.push('Overview should be more detailed (50+ characters)');
    }
    
  } catch (e) {
    errors.push('Response is not valid JSON');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    suggestions
  };
}

/**
 * A/B testing prompts for optimization
 */
export const promptVariants = {
  concise: {
    name: 'Concise',
    modifier: 'Keep responses brief and action-oriented. Focus on the top 3 priorities.'
  },
  detailed: {
    name: 'Detailed', 
    modifier: 'Provide comprehensive explanations and multiple options for each recommendation.'
  },
  budget: {
    name: 'Budget-Focused',
    modifier: 'Emphasize low-cost and DIY solutions. Include free alternatives where possible.'
  },
  aesthetic: {
    name: 'Design-Focused',
    modifier: 'Balance function with beautiful design. Include style and visual appeal considerations.'
  }
};

export default {
  createAnalysisPrompt,
  createVisualizationPrompt,
  createChatContextPrompt,
  enhanceProductRecommendations,
  errorRecoveryPrompts,
  validatePromptResponse,
  promptVariants
};
