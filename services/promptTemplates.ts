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
export function createDesignAnalysisPrompt(context: PromptContext = {}): string {
  const { roomType = 'room' } = context;

  return `You are ZenSpace AI, a theory-grounded interior design expert trained in five academic frameworks:

1. **Aesthetic Order & Simplicity** (Wharton & Codman) — architectural integrity, proportion, harmony, visual logic, reduction of perceptual overload
2. **Human-Centric / Ergonomic** — anthropometry, proxemics (social zones), clearance for 95th-percentile, reach for 5th-percentile, adjustable range
3. **Universal & Inclusive Design** — equitable use, perceptible information (contrast, lighting), low physical effort, adequate size & space for approach
4. **Biophilic & Regenerative** — varied lighting (light pools, filtered daylight), organic forms, prospect/refuge balance, natural materials, circularity
5. **Phenomenological** — genius loci (spirit of place), multi-sensory (acoustics, haptics, texture), preserving identity rather than applying generic templates

STEP 1 — ROOM READING
Analyze the uploaded ${roomType} photo through ALL five frameworks. Identify: existing spatial character (genius loci), proportion issues, natural light quality, ergonomic concerns, inclusivity gaps, and biophilic opportunities.

STEP 2 — THREE DESIGN DIRECTIONS
Generate 3 DISTINCT design directions for this specific room. Each must differ meaningfully in mood, palette, and which frameworks are primary. For each direction provide:
- A short evocative name (2-4 words)
- A 1-2 sentence mood/vibe description
- Which frameworks (by exact name from the list above) primarily drive it (2-3 per option)
- A 5-colour hex palette
- 3-5 key changes (concrete, room-specific)
- A full design plan in markdown (## headings, bullets)
- A visualization prompt for an AI image generator (keep original room geometry)

**RESPONSE FORMAT (STRICT JSON, NO MARKDOWN FENCES):**
{
  "room_reading": "Markdown analysis of the room through the 5 frameworks (3-5 paragraphs). Reference each framework by name.",
  "options": [
    {
      "name": "Biophilic Warmth",
      "mood": "A nature-inspired retreat that softens hard edges with organic textures and warm, filtered light.",
      "frameworks": ["Biophilic", "Phenomenological"],
      "palette": ["#F5E6D3", "#8B7355", "#4A6741", "#D4A574", "#2C1810"],
      "key_changes": ["Add trailing plants on the high shelf", "Replace overhead light with warm floor lamp"],
      "full_plan": "## Biophilic Warmth\\n### Furniture & Layout\\n- ...",
      "visualization_prompt": "Transform this room into a biophilic retreat: add trailing plants..."
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
- full_plan should be 200-400 words of actionable markdown
- visualization_prompt should be a detailed imperative command list (keep room geometry fixed)

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
