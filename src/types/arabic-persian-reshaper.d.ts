declare module "arabic-persian-reshaper" {
  interface Shaper {
    convertArabic(text: string): string;
  }
  const reshaper: { PersianShaper: Shaper; ArabicShaper: Shaper };
  export default reshaper;
}
