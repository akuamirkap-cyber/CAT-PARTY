/** Optional facial styles. Defaults preserve each cat's original face. */
export type EyeStyleId = "default" | "round" | "slit" | "grumpy" | "green" | "goofy";
export type ExpressionId = "default" | "grumpy" | "tongue";

export const EYE_STYLES: { id: EyeStyleId; name: string; description: string }[] = [
  { id: "default", name: "Asli Kucing", description: "Mata bawaan tiap kucing" },
  { id: "green", name: "Manis Hijau", description: "Kilau hijau di mata gelap" },
  { id: "goofy", name: "Bulat Kocak", description: "Mata besar yang ekspresif" },
  { id: "grumpy", name: "Judes Mint", description: "Mata setengah terpejam" },
  { id: "round", name: "Bulat Berkilau", description: "Bulat besar dengan kilau emas" },
  { id: "slit", name: "Tajam Emas", description: "Pupil lonjong, ekspresi penasaran" },
];
export const EXPRESSIONS: { id: ExpressionId; name: string; description: string }[] = [
  { id: "default", name: "Asli Kucing", description: "Ekspresi bawaan tiap kucing" },
  { id: "grumpy", name: "Cemberut", description: "Raut kesal yang menggemaskan" },
  { id: "tongue", name: "Lidah Usil", description: "Ekspresi ceria dan jahil" },
];
