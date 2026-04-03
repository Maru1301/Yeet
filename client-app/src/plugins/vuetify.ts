import { createVuetify } from 'vuetify';
import 'vuetify/styles';

// Component/directive auto-import is handled by vite-plugin-vuetify in vite.config.ts

const sharedColors = {
  primary: '#EA0428',   // $Kingston_GenerativeAI_Red
  secondary: '#3E64FF', // $KingstonGenerativeAI_Blue
  accent: '#FF8A80',    // $Kingston_Pink
  error: '#FF2F30',     // $Kingston_LightRed
  info: '#020457',      // $KingstonGenerativeAI_DarkBlue
  success: '#00C097',   // $Kingston_Green
  warning: '#E0B300',   // $Kingston_Gold
  pink: '#E37DA2',
  blue: '#817DE6',
  purple: '#C57FE5',
  lightBlue: '#A2A2D4',
  darkPurple: '#3F365D',
};

const lightColors = {
  background: '#EAEEF3',
  surface: '#fff',
  sideBar: '#A2A2D4',
  darkPrimary: '#585DAC',
  inputBtn: '#F7F8FE',
  backBtn: '#212121',
  listItemBg: '#F7F8FE',
};

const darkColors = {
  background: '#1a1b2e',
  surface: '#22243a',
  sideBar: '#272727',
  darkPrimary: '#DB2627',
  inputBtn: '#2e3048',
  backBtn: '#FAFAFA',
  listItemBg: '#353B46',
};

export default createVuetify({
  theme: {
    defaultTheme: (localStorage.getItem('theme') ?? 'dark') as string,
    themes: {
      light: {
        colors: {
          ...lightColors,
          ...sharedColors
        },
      },
      dark: {
        colors: {
          ...darkColors,
          ...sharedColors
        },
      },
    },
  },
});
