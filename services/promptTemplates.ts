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
// Rotation pools to prevent repetitive design cycles
const DESIGN_SEEDS = [
  { era: '1920s Art Deco revival', ref: 'Dorothy Draper, Émile-Jacques Ruhlmann', rug: 'geometric Deco wool rug with gold thread' },
  { era: '1970s California bohemian', ref: 'Malibu canyon houses, Laurel Canyon', rug: 'vintage overdyed Turkish kilim in faded coral' },
  { era: 'Tokyo minimalism meets craft', ref: 'Jasper Morrison, Naoto Fukasawa, Muji', rug: 'hand-loomed Japanese jute with indigo accent stripe' },
  { era: 'Milanese maximalism', ref: 'Gio Ponti, Fornasetti, Dimorestudio', rug: 'bold geometric Italian wool in emerald and terracotta' },
  { era: 'Scandinavian brutalism', ref: 'Juul\'s House, Vipp, Menu', rug: 'undyed Icelandic sheepskin layered over concrete' },
  { era: 'Moroccan riad modernism', ref: 'Berber craft meets Studio KO', rug: 'hand-knotted Beni Ourain with asymmetric diamond pattern' },
  { era: 'Brazilian tropical modernism', ref: 'Oscar Niemeyer, Sergio Rodrigues, Campana Brothers', rug: 'hand-woven sisal with tropical hardwood border inlay' },
  { era: 'Georgian meets punk', ref: 'Max Lamb, Faye Toogood, Martino Gamper', rug: 'reclaimed antique Persian runner, artfully faded' },
  { era: 'Desert Southwest contemporary', ref: 'Georgia O\'Keeffe palette, Navajo weaving traditions', rug: 'hand-spun Navajo-inspired wool in ochre and bone' },
  { era: 'Nordic noir', ref: 'dark Scandinavian interiors, Norm Architects', rug: 'charcoal bouclé wool with subtle tonal stripe' },
  { era: 'South Asian contemporary', ref: 'Nuru Karim, Ashiesh Shah, Indian textile heritage', rug: 'hand-knotted silk-wool blend with abstracted paisley in deep indigo' },
  { era: 'Bauhaus revival', ref: 'Anni Albers textiles, Marcel Breuer, Gunta Stölzl', rug: 'flat-weave geometric in primary blocks, Bauhaus-inspired' },
  { era: 'Coastal Mediterranean', ref: 'Greek island whites, terrazzo, Santorini', rug: 'handwoven cotton dhurrie in sea glass and chalk' },
  { era: 'Industrial loft romantic', ref: 'Tribeca raw spaces, BDDW furniture', rug: 'distressed vintage Oushak in muted rose and sage' },
  { era: 'Parisian salon noir', ref: 'Joseph Dirand, dark Haussmann apartments', rug: 'black and gold hand-tufted abstract art rug' },
];

// Group seeds by mood/temperature to guarantee diversity within each batch
const SEED_BUCKETS: Record<string, number[]> = {
  warm_bold:    [0, 3, 6, 11],  // Art Deco, Milanese maximalism, Brazilian tropical, Bauhaus
  cool_moody:   [4, 9, 14],      // Scandinavian brutalism, Nordic noir, Parisian salon noir
  earthy_craft: [5, 7, 8, 10],   // Moroccan riad, Georgian punk, Desert SW, South Asian
  light_airy:   [1, 2, 12, 13],  // 70s California, Tokyo minimal, Coastal Med, Industrial romantic
};

function getDesignSeed(): { era: string; ref: string; rug: string }[] {
  // Pick 3 seeds from 3 DIFFERENT mood buckets — guarantees variety
  const bucketKeys = Object.keys(SEED_BUCKETS).sort(() => Math.random() - 0.5);
  const pickedBuckets = bucketKeys.slice(0, 3);
  return pickedBuckets.map(key => {
    const indices = SEED_BUCKETS[key];
    const idx = indices[Math.floor(Math.random() * indices.length)];
    return DESIGN_SEEDS[idx];
  });
}

export function createDesignAnalysisPrompt(context: PromptContext & { previousDesigns?: string[] } = {}): string {
  const { roomType = 'room', previousDesigns = [] } = context;
  const seeds = getDesignSeed();

  return `You are ZenSpace AI, a bold and opinionated interior design expert. You don't do boring. You create spaces people screenshot and send to friends.

You draw from five academic frameworks — but you USE them creatively, not academically:

1. **Aesthetic Order** (Wharton & Codman) — proportion, symmetry, visual rhythm, architectural integrity
2. **Human-Centric** — ergonomics, proxemics, how the body actually moves through space
3. **Universal Design** — inclusive, accessible, works for everyone without feeling "accessible"
4. **Biophilic** — nature connection, organic forms, living materials, light as a design element
5. **Phenomenological** — genius loci, multi-sensory experience, emotional resonance, what makes a space FEEL like something

You also channel the philosophies of unconventional design thinkers — use these as creative fuel:

- **Axel Vervoordt** — wabi-sabi minimalism, imperfect beauty, aged materials, emotional emptiness as luxury
- **Kelly Wearstler** — fearless maximalism, unexpected material clashes (marble + brass + velvet + raw stone), bold pattern mixing
- **Ilse Crawford** — humanistic design, sensory richness, spaces designed for how life actually happens (not how it photographs)
- **India Mahdavi** — joyful color blocking, playful geometry, candy-bright palettes that somehow feel sophisticated
- **Vincenzo De Cotiis** — brutalist elegance, oxidized metals, fiberglass, the beauty of industrial decay made luxurious
- **Bijoy Jain / Studio Mumbai** — handcraft, raw earth, stone, timber, radical locality, architecture as slow ritual
- **Gaetano Pesce** — anti-perfection, organic asymmetry, resin and color as rebellion against sterile modernism
- **Faye Toogood** — sculptural, tactile, chunky forms, materials that beg to be touched
- **Wabi-sabi philosophy** — transience, imperfection, patina, asymmetry, rustic intimacy
- **Memphis Group / Ettore Sottsass** — radical postmodernism, clashing geometries, irreverent color, design as provocation

STEP 1 — ROOM READING
Analyze this ${roomType} photo honestly. What's working? What's killing the vibe? Be specific about what you see.

STEP 2 — THREE DRAMATICALLY DIFFERENT DESIGN DIRECTIONS
Generate 3 options that are BOLDLY distinct from each other. Not three flavors of "modern minimalist."

FOR THIS SPECIFIC GENERATION, draw inspiration from these three creative seeds (but don't be literal — use them as springboards):
- Option 1 seed: ${seeds[0].era} (references: ${seeds[0].ref})
- Option 2 seed: ${seeds[1].era} (references: ${seeds[1].ref})
- Option 3 seed: ${seeds[2].era} (references: ${seeds[2].ref})

Also channel the design thinkers listed above — name-drop them in mood descriptions when relevant. The seeds above are STARTING POINTS, not constraints. Mash them up, subvert them, make them your own.

CREATIVE DIRECTION RULES:

**RUGS & TEXTILES ARE KEY.** Every design MUST specify a rug or floor textile that's high-end and specific. NOT "add a rug" or "area rug." Think:
- "${seeds[0].rug}"
- "${seeds[1].rug}"  
- "${seeds[2].rug}"
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
- A 5-colour hex palette (make them INTERESTING — rich, unexpected combinations)
- 3-5 key changes (concrete, bold, room-specific)
- A full design plan in markdown (## headings, bullets, 200-400 words)
- A visualization prompt for an AI image generator (detailed, atmospheric, keep room geometry)

**RESPONSE FORMAT (STRICT JSON, NO MARKDOWN FENCES):**
{
  "room_reading": "Markdown analysis — honest, specific, reference what you actually see. 3-5 paragraphs.",
  "options": [
    {
      "name": "Midnight Library",
      "mood": "Deep, moody, intellectual — like falling asleep in a velvet armchair surrounded by old books and amber light.",
      "frameworks": ["Phenomenological", "Aesthetic Order"],
      "palette": ["#1A1A2E", "#8B6914", "#C4956A", "#E8DCC8", "#2D1B00"],
      "key_changes": ["Paint accent wall deep navy", "Add warm brass reading lamp", "Layer vintage textiles"],
      "full_plan": "## Midnight Library\\n### The Vision\\n- ...",
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
