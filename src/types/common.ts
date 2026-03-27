export type PackageTierLevel = "INTIMATE" | "GRAND" | "ROYAL";

export interface Destination {
  id: string;
  name: string;
  slug: string;
  country: string;
  tagline: string;
  description: string;
  heroImage: string;
  startingPrice: number;
  peakSeason: string;
  venueCount: number;
  gallery: string[];
}

export interface PackageTier {
  id: string;
  name: string;
  level: PackageTierLevel;
  tagline: string;
  description: string;
  startingPrice: number;
  currency: string;
  inclusions: string[];
  featured: boolean;
  icon: string;
}

export interface VendorCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  count: number;
}

export interface Testimonial {
  id: string;
  coupleName: string;
  destination: string;
  quote: string;
  rating: number;
  photo: string;
  weddingDate: string;
}

export interface BudgetItem {
  id: string;
  label: string;
  estimatedAmount: number;
  category: string;
  notes?: string;
}

export interface ContactFormData {
  name: string;
  email: string;
  phone: string;
  weddingDate: string;
  guestCount: number;
  destination: string;
  message: string;
}
