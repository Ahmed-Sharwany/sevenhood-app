// Sevenhood / سابع جار — Brand Tokens v2
export const COLORS = {
  // Primary dark (warm obsidian — replaces forest green)
  primary:      '#0B0C0A',
  primaryLight: '#131410',

  // Maqam Gold accent (replaces orange gold)
  accent:       '#C9A56B',
  accentDeep:   '#A88349',
  accentSubtle: '#F5ECD9',

  // Sage — kept for success / green status only
  sage:         '#566656',
  sageLight:    '#7A9E7A',
  sageMist:     '#E8EDE0',

  // Warm ivory surfaces
  background:   '#FBF8F2', // bone-50
  surface:      '#FFFFFF',
  sand:         '#F4F0E8', // bone-100

  // Text
  textPrimary:  '#0B0C0A',
  textSecondary:'#6B6D68',
  textTertiary: '#9B9D98',

  // Borders / hairlines
  border:       'rgba(11,12,10,.1)',
  hairline:     'rgba(11,12,10,.08)',

  // Semantic
  success:      '#566656',
  warning:      '#C9A56B',
  error:        '#DC2626',
} as const;

export const IMG = {
  buildingCurved: 'https://images.unsplash.com/photo-1771466883495-a65f9aedf39a?w=800&h=600&fit=crop&auto=format',
  buildingGlass:  'https://images.unsplash.com/photo-1758193431355-54df41421657?w=800&h=600&fit=crop&auto=format',
  buildingDusk:   'https://images.unsplash.com/photo-1758448511648-d7d8e1993c3f?w=800&h=600&fit=crop&auto=format',
  livingRoom:     'https://images.unsplash.com/photo-1672927936377-97d1be3976cd?w=800&h=600&fit=crop&auto=format',
  sofaWhite:      'https://images.unsplash.com/photo-1628744876525-f2678d8af47f?w=800&h=600&fit=crop&auto=format',
  plaza:          'https://images.unsplash.com/photo-1773496430440-328f5a407504?w=800&h=600&fit=crop&auto=format',
  cleaning:       'https://images.unsplash.com/photo-1758273238594-9a9d6c20eaa2?w=800&h=600&fit=crop&auto=format',
  bedroom:        'https://images.unsplash.com/photo-1704428382616-d8c65fdd76f4?w=800&h=600&fit=crop&auto=format',
} as const;
