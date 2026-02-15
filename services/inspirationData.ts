/**
 * Curated design inspiration data
 * Static dataset of interior design inspiration organized by style
 */

export interface InspirationImage {
  id: string;
  src: string;
  alt: string;
  style: DesignStyle;
  room: string;
  credit: string;
  tags: string[];
}

export type DesignStyle =
  | 'Modern'
  | 'Traditional'
  | 'Scandinavian'
  | 'Industrial'
  | 'Japandi'
  | 'Mid-Century'
  | 'Bohemian'
  | 'Mediterranean';

export interface DesignTip {
  id: string;
  title: string;
  principle: string;
  body: string;
  category: 'Color Theory' | 'Spatial Balance' | 'Lighting' | 'Texture' | 'Proportion';
}

export const DESIGN_STYLES: DesignStyle[] = [
  'Modern',
  'Traditional',
  'Scandinavian',
  'Industrial',
  'Japandi',
  'Mid-Century',
  'Bohemian',
  'Mediterranean',
];

/**
 * Curated inspiration images — uses Unsplash source for demo purposes.
 * In production, replace with your own CDN URLs.
 */
export const INSPIRATION_IMAGES: InspirationImage[] = [
  // Modern
  { id: 'mod-1', src: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=600&q=80', alt: 'Modern living room with leather sofa, gallery wall, and indoor plants', style: 'Modern', room: 'Living Room', credit: 'Unsplash', tags: ['minimalist', 'neutral', 'open-plan'] },
  { id: 'mod-2', src: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&q=80', alt: 'Modern kitchen with open shelving and warm lighting', style: 'Modern', room: 'Kitchen', credit: 'Unsplash', tags: ['white', 'sleek', 'functional'] },
  { id: 'mod-3', src: 'https://images.unsplash.com/photo-1600607687644-c7171b42498f?w=600&q=80', alt: 'Modern bedroom with grey upholstered headboard and glass doors', style: 'Modern', room: 'Bedroom', credit: 'Unsplash', tags: ['low-profile', 'ambient', 'calm'] },

  // Traditional
  { id: 'trad-1', src: 'https://images.unsplash.com/photo-1600210491892-03d54c0aaf87?w=600&q=80', alt: 'Traditional living room with exposed beams and arched windows', style: 'Traditional', room: 'Living Room', credit: 'Unsplash', tags: ['classic', 'warm', 'layered'] },
  { id: 'trad-2', src: 'https://images.unsplash.com/photo-1617806118233-18e1de247200?w=600&q=80', alt: 'Traditional dining room with wood table and classic chandelier', style: 'Traditional', room: 'Dining Room', credit: 'Unsplash', tags: ['wood', 'elegant', 'formal'] },
  { id: 'trad-3', src: 'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=600&q=80', alt: 'Traditional bedroom with upholstered headboard and warm bedding', style: 'Traditional', room: 'Bedroom', credit: 'Unsplash', tags: ['upholstered', 'rich', 'symmetry'] },

  // Scandinavian
  { id: 'scand-1', src: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=600&q=80', alt: 'Scandinavian living room with mustard accent chair and light wood', style: 'Scandinavian', room: 'Living Room', credit: 'Unsplash', tags: ['light', 'hygge', 'wood'] },
  { id: 'scand-2', src: 'https://images.unsplash.com/photo-1600585152220-90363fe7e115?w=600&q=80', alt: 'Scandinavian kitchen with white island and pendant lights', style: 'Scandinavian', room: 'Kitchen', credit: 'Unsplash', tags: ['bright', 'functional', 'open-shelving'] },
  { id: 'scand-3', src: 'https://images.unsplash.com/photo-1617325247661-675ab4b64ae2?w=600&q=80', alt: 'Scandinavian bedroom with raw wood platform bed and linen', style: 'Scandinavian', room: 'Bedroom', credit: 'Unsplash', tags: ['linen', 'natural', 'serene'] },

  // Industrial
  { id: 'ind-1', src: 'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=600&q=80', alt: 'Industrial loft with exposed brick and metal accents', style: 'Industrial', room: 'Living Room', credit: 'Unsplash', tags: ['brick', 'metal', 'loft'] },
  { id: 'ind-2', src: 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=600&q=80', alt: 'Industrial kitchen with concrete and steel fixtures', style: 'Industrial', room: 'Kitchen', credit: 'Unsplash', tags: ['pendant', 'raw', 'utilitarian'] },
  { id: 'ind-3', src: 'https://images.unsplash.com/photo-1600607688969-a5bfcd646154?w=600&q=80', alt: 'Industrial bedroom with metal frame bed and exposed materials', style: 'Industrial', room: 'Bedroom', credit: 'Unsplash', tags: ['concrete', 'contrast', 'warm'] },

  // Japandi
  { id: 'jap-1', src: 'https://images.unsplash.com/photo-1598928506311-c55ez633272?w=600&q=80', alt: 'Japandi living space with low furniture and muted palette', style: 'Japandi', room: 'Living Room', credit: 'Unsplash', tags: ['low', 'muted', 'wabi-sabi'] },
  { id: 'jap-2', src: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=600&q=80', alt: 'Japandi-inspired living space with natural tones and clean lines', style: 'Japandi', room: 'Living Room', credit: 'Unsplash', tags: ['natural', 'simple', 'crafted'] },
  { id: 'jap-3', src: 'https://images.unsplash.com/photo-1617325247661-675ab4b64ae2?w=600&q=80', alt: 'Japandi bedroom with raw wood platform bed and linen bedding', style: 'Japandi', room: 'Bedroom', credit: 'Unsplash', tags: ['platform', 'zen', 'earth-tones'] },

  // Mid-Century
  { id: 'mid-1', src: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=600&q=80', alt: 'Mid-century modern living room with arc lamp and leather poufs', style: 'Mid-Century', room: 'Living Room', credit: 'Unsplash', tags: ['iconic', 'organic', 'retro'] },
  { id: 'mid-2', src: 'https://images.unsplash.com/photo-1600121848594-d8644e57abab?w=600&q=80', alt: 'Contemporary living room with dark accent wall', style: 'Mid-Century', room: 'Living Room', credit: 'Unsplash', tags: ['walnut', 'hairpin', 'atomic'] },
  { id: 'mid-3', src: 'https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=600&q=80', alt: 'Mid-century living room with leather sofa and brass chandelier', style: 'Mid-Century', room: 'Living Room', credit: 'Unsplash', tags: ['teak', 'geometric', 'warm'] },

  // Bohemian
  { id: 'boho-1', src: 'https://images.unsplash.com/photo-1616486029423-aaa4789e8c9a?w=600&q=80', alt: 'Bohemian bedroom with gallery wall and layered textiles', style: 'Bohemian', room: 'Bedroom', credit: 'Unsplash', tags: ['layered', 'plants', 'eclectic'] },
  { id: 'boho-2', src: 'https://images.unsplash.com/photo-1618220179428-22790b461013?w=600&q=80', alt: 'Eclectic living corner with bold accent chair and tropical plants', style: 'Bohemian', room: 'Living Room', credit: 'Unsplash', tags: ['macrame', 'rattan', 'texture'] },
  { id: 'boho-3', src: 'https://images.unsplash.com/photo-1616046229478-9901c5536a45?w=600&q=80', alt: 'Boho-inspired room with sage wall and rattan furniture', style: 'Bohemian', room: 'Living Room', credit: 'Unsplash', tags: ['outdoor', 'pattern', 'relaxed'] },

  // Mediterranean
  { id: 'med-1', src: 'https://images.unsplash.com/photo-1600585153490-76fb20a32601?w=600&q=80', alt: 'Warm living space with fireplace and natural light', style: 'Mediterranean', room: 'Living Room', credit: 'Unsplash', tags: ['arches', 'terracotta', 'warm'] },
  { id: 'med-2', src: 'https://images.unsplash.com/photo-1600573472550-8090b5e0745e?w=600&q=80', alt: 'Open-plan living area with glass walls and pool views', style: 'Mediterranean', room: 'Living Room', credit: 'Unsplash', tags: ['stone', 'olive', 'courtyard'] },
  { id: 'med-3', src: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=600&q=80', alt: 'Contemporary open-plan living and kitchen with warm timber accents', style: 'Mediterranean', room: 'Living Room', credit: 'Unsplash', tags: ['tile', 'blue', 'rustic'] },
];

/**
 * Design tips — brief educational content about interior design principles
 */
export const DESIGN_TIPS: DesignTip[] = [
  {
    id: 'tip-color-1',
    title: 'The 60-30-10 Rule',
    principle: 'Color Theory',
    category: 'Color Theory',
    body: 'Use your dominant color for 60% of the room (walls, large furniture), a secondary color for 30% (upholstery, curtains), and an accent for the remaining 10% (pillows, art). This creates visual balance without monotony.',
  },
  {
    id: 'tip-color-2',
    title: 'Warm vs Cool Undertones',
    principle: 'Color Theory',
    category: 'Color Theory',
    body: 'Every neutral has an undertone. A "white" wall can lean blue, yellow, or pink. Match undertones across paint, fabric, and wood stain to prevent clashing — pull swatches together in natural light before committing.',
  },
  {
    id: 'tip-balance-1',
    title: 'Visual Weight Distribution',
    principle: 'Spatial Balance',
    category: 'Spatial Balance',
    body: 'Large, dark, or heavily textured items carry more visual weight. Balance a heavy sofa against a wall of floating shelves rather than another heavy piece. Distribute weight across the room to avoid a "tipping" feeling.',
  },
  {
    id: 'tip-balance-2',
    title: 'The Rule of Thirds',
    principle: 'Spatial Balance',
    category: 'Spatial Balance',
    body: 'Divide your wall or shelf into a 3x3 grid. Place focal objects at intersection points rather than dead center. Off-center arrangements feel more dynamic and professional.',
  },
  {
    id: 'tip-light-1',
    title: 'Layer Three Types of Light',
    principle: 'Lighting',
    category: 'Lighting',
    body: 'Every room needs ambient (overhead/general), task (reading lamps, under-cabinet), and accent (wall washers, candles) lighting. Relying on a single ceiling fixture flattens a room — layers create depth and mood.',
  },
  {
    id: 'tip-light-2',
    title: 'Color Temperature Matters',
    principle: 'Lighting',
    category: 'Lighting',
    body: 'Use warm white (2700K) in living rooms and bedrooms for coziness, neutral white (3500K) in kitchens, and cool white (5000K) for task areas. Mixing temperatures in the same sightline creates visual tension.',
  },
  {
    id: 'tip-texture-1',
    title: 'Contrast Rough and Smooth',
    principle: 'Texture',
    category: 'Texture',
    body: 'A polished marble table next to a rough linen sofa creates tactile interest. Rooms that use only one texture — all smooth or all rough — feel flat. Aim for at least three contrasting textures per space.',
  },
  {
    id: 'tip-proportion-1',
    title: 'Scale Furniture to the Room',
    principle: 'Proportion',
    category: 'Proportion',
    body: 'A large sectional overwhelms a small room; a petite loveseat gets lost in a great room. Measure doorways, ceiling height, and floor area. Furniture should fill roughly 60% of usable floor space — the rest is breathing room.',
  },
];

/**
 * Get trending styles — returns styles with highest engagement / seasonal relevance
 */
export function getTrendingStyles(): { style: DesignStyle; description: string; imageId: string }[] {
  return [
    { style: 'Japandi', description: 'Japanese minimalism meets Scandinavian warmth — the most searched style this year', imageId: 'jap-1' },
    { style: 'Mediterranean', description: 'Warm terracotta, arched doorways, and sun-washed textures are surging in popularity', imageId: 'med-1' },
    { style: 'Mid-Century', description: 'Timeless organic shapes and warm woods continue to dominate modern interiors', imageId: 'mid-1' },
    { style: 'Industrial', description: 'Raw materials and open spaces — the urban aesthetic that keeps evolving', imageId: 'ind-1' },
  ];
}

export function getImagesByStyle(style: DesignStyle): InspirationImage[] {
  return INSPIRATION_IMAGES.filter(img => img.style === style);
}

export function getImageById(id: string): InspirationImage | undefined {
  return INSPIRATION_IMAGES.find(img => img.id === id);
}
