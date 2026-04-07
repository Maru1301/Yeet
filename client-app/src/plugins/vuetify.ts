import { createVuetify } from 'vuetify';
import 'vuetify/styles';

// Component/directive auto-import is handled by vite-plugin-vuetify in vite.config.ts

// Utility colors shared by both themes (success, warning, error, functional accents)
const sharedColors = {
  success:    '#10B981',  // emerald-500
  warning:    '#F59E0B',  // amber-400
  error:      '#EF4444',  // red-500
  info:       '#6366F1',  // indigo-500
  pink:       '#F472B6',  // pink-400
  blue:       '#818CF8',  // indigo-400
  purple:     '#C084FC',  // purple-400
  lightBlue:  '#93C5FD',  // blue-300
  darkPurple: '#4C1D95',  // violet-900
};

// Warm palette — light mode (amber / terracotta)
const lightColors = {
  primary:     '#C2410C',  // terracotta (orange-700)
  secondary:   '#92400E',  // deep amber brown (amber-800)
  accent:      '#FB923C',  // soft orange (orange-400)
  background:  '#F7F3ED',  // warm off-white
  surface:     '#FFFBF5',  // warm paper
  sideBar:     '#E8DFD2',  // warm sand
  darkPrimary: '#9A3412',  // deep terracotta (orange-800)
  inputBtn:    '#FEF3E8',  // warm tint
  backBtn:     '#212121',
  listItemBg:  '#FEF3E8',
};

// Cool palette — dark mode (cyan / teal)
const darkColors = {
  primary:     '#06B6D4',  // cyan-500
  secondary:   '#0EA5E9',  // sky-500
  accent:      '#67E8F9',  // cyan-300
  background:  '#0F1923',  // deep cool navy
  surface:     '#162032',  // slightly lighter navy
  sideBar:     '#1A2D40',  // cool panel
  darkPrimary: '#38BDF8',  // sky-400
  inputBtn:    '#1E3044',  // cool tinted
  backBtn:     '#FAFAFA',
  listItemBg:  '#1E3044',
};

export default createVuetify({
  theme: {
    defaultTheme: (localStorage.getItem('theme') ?? 'dark') as string,
    themes: {
      light: {
        colors: {
          ...lightColors,
          ...sharedColors,
        },
      },
      dark: {
        colors: {
          ...darkColors,
          ...sharedColors,
        },
      },
    },
  },
});
