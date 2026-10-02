import { Cairo, IBM_Plex_Sans_Arabic, Tajawal } from "next/font/google";

// The default font is preloaded; the alternatives a store can choose in its
// theme load lazily, only when a page actually renders with them.
const tajawal = Tajawal({
  variable: "--font-tajawal",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "700"],
});

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "700"],
  preload: false,
});

const plexArabic = IBM_Plex_Sans_Arabic({
  variable: "--font-ibm-plex-sans-arabic",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "700"],
  preload: false,
});

/** Class names that define the font CSS variables on <html>. */
export const fontVariables = `${tajawal.variable} ${cairo.variable} ${plexArabic.variable}`;
