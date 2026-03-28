export const Colors = {
  primary: '#E07A5F',      // terracotta
  secondary: '#81B29A',    // sage green
  accent: '#F2CC8F',       // golden cream
  dark: '#3D405B',         // deep navy
  white: '#FFFFFF',
  background: '#FAF9F7',
  surface: '#FFFFFF',
  border: '#E8E8E8',
  textPrimary: '#1A1A2E',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  premium: '#F2CC8F',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
};

export const Typography = {
  h1: { fontSize: 28, fontWeight: '700', color: Colors.textPrimary },
  h2: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary },
  h3: { fontSize: 18, fontWeight: '600', color: Colors.textPrimary },
  body: { fontSize: 15, fontWeight: '400', color: Colors.textPrimary },
  bodySmall: { fontSize: 13, fontWeight: '400', color: Colors.textSecondary },
  caption: { fontSize: 11, fontWeight: '400', color: Colors.textMuted },
  label: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
};

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
};
