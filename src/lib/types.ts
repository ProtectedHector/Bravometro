export const PRODUCT_TYPES = [
  "bravas",
  "pimientos",
  "tortilla",
  "chipirones",
  "pulpo",
  "bocadillos",
  "callos",
  "croquetas",
  "cachopo",
  "chuleton",
  "boquerones",
  "calamares",
  "cocido",
  "paella",
  "gazpacho",
  "ensaladilla",
  "ajoblanco",
  "torreznos",
  "montaditos",
  "quesos",
  "empanadas",
] as const;

export type ProductType = (typeof PRODUCT_TYPES)[number];
export type Locale = "es" | "en";
export type ConfidenceLevel = "low" | "medium" | "high";

export interface DishScores {
  overall: number;
  potato: number;
  sauce: number;
  spiciness: number;
  taste: number;
  texture: number;
  quantity: number;
  value: number;
}

export interface Place {
  id: string;
  name: string;
  slug: string;
  city: string;
  country: string;
  neighborhood: string;
  address: string;
  latitude?: number;
  longitude?: number;
  website?: string;
  phone?: string;
  googlePlaceId?: string;
  googleMapsUrl?: string;
  source?: "admin" | "google_places";
  verifiedAt?: number;
  priceLevel: 1 | 2 | 3 | 4;
  image?: string;
  status: "demo" | "published" | "draft";
  productType: ProductType;
  scores: DishScores;
  confidence: ConfidenceLevel;
  confidenceScore: number;
  evidenceCount: number;
  summary: Record<Locale, string>;
  highlights: Record<Locale, string[]>;
  methodologyVersion: string;
  analyzedAt: string;
  communityScore?: number;
  communityRatingCount?: number;
  communityPhotos?: Array<{url:string;userName:string;score:number;comment?:string}>;
}

export interface GooglePlaceCandidate {
  googlePlaceId: string;
  name: string;
  address: string;
  latitude?: number;
  longitude?: number;
  googleMapsUrl: string;
}

export interface GooglePlaceSearchResult extends GooglePlaceCandidate {
  local?: {
    slug: string;
    score: number | null;
    ratingCount: number;
  };
}

export interface MyRating {
  id: string;
  place: { id:string;name:string;address:string;slug:string;googlePlaceId?:string;googleMapsUrl?:string };
  overallScore: number;
  scores: Omit<DishScores,"overall">;
  comment?: string;
  photoUrl?: string;
  status: "pending"|"approved"|"rejected";
  createdAt: number;
  updatedAt: number;
}

export type PlaceOption = Pick<Place,"id"|"name"|"neighborhood"|"city"|"status">;

export interface FutureMeter {
  slug: ProductType;
  emoji: string;
  name: Record<Locale, string>;
  description: Record<Locale, string>;
}
