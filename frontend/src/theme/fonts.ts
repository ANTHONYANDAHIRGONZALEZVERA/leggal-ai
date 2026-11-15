import { InstrumentSerif_400Regular_Italic } from '@expo-google-fonts/instrument-serif/400Regular_Italic';
import { PlusJakartaSans_400Regular } from '@expo-google-fonts/plus-jakarta-sans/400Regular';
import { PlusJakartaSans_500Medium } from '@expo-google-fonts/plus-jakarta-sans/500Medium';
import { PlusJakartaSans_600SemiBold } from '@expo-google-fonts/plus-jakarta-sans/600SemiBold';
import { PlusJakartaSans_700Bold } from '@expo-google-fonts/plus-jakarta-sans/700Bold';
import { PlusJakartaSans_800ExtraBold } from '@expo-google-fonts/plus-jakarta-sans/800ExtraBold';

import { fontFamily } from './typography';

// Se importa cada peso por separado para no empaquetar los 14 archivos de la
// familia. Las claves coinciden con fontFamily para que no se desalineen.
export const fuentes: Record<(typeof fontFamily)[keyof typeof fontFamily], number> = {
  [fontFamily.regular]: PlusJakartaSans_400Regular,
  [fontFamily.medium]: PlusJakartaSans_500Medium,
  [fontFamily.semibold]: PlusJakartaSans_600SemiBold,
  [fontFamily.bold]: PlusJakartaSans_700Bold,
  [fontFamily.extrabold]: PlusJakartaSans_800ExtraBold,
  [fontFamily.serifItalic]: InstrumentSerif_400Regular_Italic,
};
