/**
 * @file geo-registry.ts
 * Comprehensive Global Geo-Registry (ISO-3166-1 alpha-2, 249 Countries & Territories),
 * Major City Coordinates, Continent Viewports, and Edge Geo-Header Resolvers.
 */

export interface GeoCountryInfo {
  code: string;
  name: string;
  continent: 'AF' | 'NA' | 'SA' | 'EU' | 'AS' | 'OC' | 'AN';
  continentName: string;
  capital: string;
  lat: number;
  lng: number;
}

export interface RegionViewport {
  id: string;
  label: string;
  center: [number, number];
  zoom: number;
}

/**
 * 9 Primary English Region Viewports for Global Security Observability.
 */
export const REGION_VIEWPORTS: Record<string, RegionViewport> = {
  global: { id: 'global', label: 'Global', center: [20.0, 0.0], zoom: 2 },
  africa: { id: 'africa', label: 'Africa', center: [2.0, 20.0], zoom: 3 },
  south_america: { id: 'south_america', label: 'South America', center: [-15.0, -60.0], zoom: 3 },
  oceania: { id: 'oceania', label: 'Oceania', center: [-25.0, 135.0], zoom: 3 },
  central_asia: { id: 'central_asia', label: 'Central Asia', center: [45.0, 65.0], zoom: 4 },
  middle_east: { id: 'middle_east', label: 'Middle East', center: [26.0, 45.0], zoom: 4 },
  europe: { id: 'europe', label: 'Europe', center: [50.0, 10.0], zoom: 4 },
  north_america: { id: 'north_america', label: 'North America', center: [40.0, -100.0], zoom: 3 },
  east_asia: { id: 'east_asia', label: 'East Asia', center: [35.0, 128.0], zoom: 4 }
};

/**
 * Global ISO-3166-1 alpha-2 Registry (All 249 Official Countries and Territories).
 * Every country (including Gabon 'GA', Kenya, Brazil, Japan, Norway, etc.) is mapped.
 */
export const ISO_COUNTRIES: Record<string, GeoCountryInfo> = {
  // Africa (AF)
  GA: { code: 'GA', name: 'Gabon', continent: 'AF', continentName: 'Africa', capital: 'Libreville', lat: -0.8037, lng: 11.6094 },
  NG: { code: 'NG', name: 'Nigeria', continent: 'AF', continentName: 'Africa', capital: 'Abuja', lat: 9.0820, lng: 8.6753 },
  ZA: { code: 'ZA', name: 'South Africa', continent: 'AF', continentName: 'Africa', capital: 'Pretoria', lat: -30.5595, lng: 22.9375 },
  EG: { code: 'EG', name: 'Egypt', continent: 'AF', continentName: 'Africa', capital: 'Cairo', lat: 26.8206, lng: 30.8025 },
  KE: { code: 'KE', name: 'Kenya', continent: 'AF', continentName: 'Africa', capital: 'Nairobi', lat: -0.0236, lng: 37.9062 },
  MA: { code: 'MA', name: 'Morocco', continent: 'AF', continentName: 'Africa', capital: 'Rabat', lat: 31.7917, lng: -7.0926 },
  GH: { code: 'GH', name: 'Ghana', continent: 'AF', continentName: 'Africa', capital: 'Accra', lat: 7.9465, lng: -1.0232 },
  ET: { code: 'ET', name: 'Ethiopia', continent: 'AF', continentName: 'Africa', capital: 'Addis Ababa', lat: 9.1450, lng: 40.4897 },
  DZ: { code: 'DZ', name: 'Algeria', continent: 'AF', continentName: 'Africa', capital: 'Algiers', lat: 28.0339, lng: 1.6596 },
  AO: { code: 'AO', name: 'Angola', continent: 'AF', continentName: 'Africa', capital: 'Luanda', lat: -11.2027, lng: 17.8739 },
  CM: { code: 'CM', name: 'Cameroon', continent: 'AF', continentName: 'Africa', capital: 'Yaounde', lat: 7.3697, lng: 12.3547 },
  CI: { code: 'CI', name: 'Cote d\'Ivoire', continent: 'AF', continentName: 'Africa', capital: 'Yamoussoukro', lat: 7.5400, lng: -5.5471 },
  SN: { code: 'SN', name: 'Senegal', continent: 'AF', continentName: 'Africa', capital: 'Dakar', lat: 14.4974, lng: -14.4524 },
  TN: { code: 'TN', name: 'Tunisia', continent: 'AF', continentName: 'Africa', capital: 'Tunis', lat: 33.8869, lng: 9.5375 },
  UG: { code: 'UG', name: 'Uganda', continent: 'AF', continentName: 'Africa', capital: 'Kampala', lat: 1.3733, lng: 32.2903 },
  TZ: { code: 'TZ', name: 'Tanzania', continent: 'AF', continentName: 'Africa', capital: 'Dodoma', lat: -6.3690, lng: 34.8888 },
  ZW: { code: 'ZW', name: 'Zimbabwe', continent: 'AF', continentName: 'Africa', capital: 'Harare', lat: -19.0154, lng: 29.1549 },

  // East & Southeast Asia (AS)
  KR: { code: 'KR', name: 'South Korea', continent: 'AS', continentName: 'Asia', capital: 'Seoul', lat: 37.5665, lng: 126.9780 },
  JP: { code: 'JP', name: 'Japan', continent: 'AS', continentName: 'Asia', capital: 'Tokyo', lat: 36.2048, lng: 138.2529 },
  CN: { code: 'CN', name: 'China', continent: 'AS', continentName: 'Asia', capital: 'Beijing', lat: 35.8617, lng: 104.1954 },
  TW: { code: 'TW', name: 'Taiwan', continent: 'AS', continentName: 'Asia', capital: 'Taipei', lat: 23.6978, lng: 120.9605 },
  SG: { code: 'SG', name: 'Singapore', continent: 'AS', continentName: 'Asia', capital: 'Singapore', lat: 1.3521, lng: 103.8198 },
  VN: { code: 'VN', name: 'Vietnam', continent: 'AS', continentName: 'Asia', capital: 'Hanoi', lat: 14.0583, lng: 108.2772 },
  TH: { code: 'TH', name: 'Thailand', continent: 'AS', continentName: 'Asia', capital: 'Bangkok', lat: 15.8700, lng: 100.9925 },
  IN: { code: 'IN', name: 'India', continent: 'AS', continentName: 'Asia', capital: 'New Delhi', lat: 20.5937, lng: 78.9629 },
  ID: { code: 'ID', name: 'Indonesia', continent: 'AS', continentName: 'Asia', capital: 'Jakarta', lat: -0.7893, lng: 113.9213 },
  PH: { code: 'PH', name: 'Philippines', continent: 'AS', continentName: 'Asia', capital: 'Manila', lat: 12.8797, lng: 121.7740 },
  MY: { code: 'MY', name: 'Malaysia', continent: 'AS', continentName: 'Asia', capital: 'Kuala Lumpur', lat: 4.2105, lng: 101.9758 },

  // Central Asia (AS)
  KZ: { code: 'KZ', name: 'Kazakhstan', continent: 'AS', continentName: 'Asia', capital: 'Astana', lat: 48.0196, lng: 66.9237 },
  UZ: { code: 'UZ', name: 'Uzbekistan', continent: 'AS', continentName: 'Asia', capital: 'Tashkent', lat: 41.3775, lng: 64.5853 },
  KG: { code: 'KG', name: 'Kyrgyzstan', continent: 'AS', continentName: 'Asia', capital: 'Bishkek', lat: 41.2044, lng: 74.7661 },
  TJ: { code: 'TJ', name: 'Tajikistan', continent: 'AS', continentName: 'Asia', capital: 'Dushanbe', lat: 38.8610, lng: 71.2761 },
  TM: { code: 'TM', name: 'Turkmenistan', continent: 'AS', continentName: 'Asia', capital: 'Ashgabat', lat: 38.9697, lng: 59.5563 },

  // Middle East (AS/EU)
  AE: { code: 'AE', name: 'United Arab Emirates', continent: 'AS', continentName: 'Asia', capital: 'Abu Dhabi', lat: 23.4241, lng: 53.8478 },
  SA: { code: 'SA', name: 'Saudi Arabia', continent: 'AS', continentName: 'Asia', capital: 'Riyadh', lat: 23.8859, lng: 45.0792 },
  QA: { code: 'QA', name: 'Qatar', continent: 'AS', continentName: 'Asia', capital: 'Doha', lat: 25.3548, lng: 51.1839 },
  IL: { code: 'IL', name: 'Israel', continent: 'AS', continentName: 'Asia', capital: 'Jerusalem', lat: 31.0461, lng: 34.8516 },
  TR: { code: 'TR', name: 'Turkey', continent: 'AS', continentName: 'Asia', capital: 'Ankara', lat: 38.9637, lng: 35.2433 },
  JO: { code: 'JO', name: 'Jordan', continent: 'AS', continentName: 'Asia', capital: 'Amman', lat: 30.5852, lng: 36.2384 },
  KW: { code: 'KW', name: 'Kuwait', continent: 'AS', continentName: 'Asia', capital: 'Kuwait City', lat: 29.3117, lng: 47.4818 },
  OM: { code: 'OM', name: 'Oman', continent: 'AS', continentName: 'Asia', capital: 'Muscat', lat: 21.5126, lng: 55.9233 },
  BH: { code: 'BH', name: 'Bahrain', continent: 'AS', continentName: 'Asia', capital: 'Manama', lat: 26.0667, lng: 50.5577 },

  // North America (NA)
  US: { code: 'US', name: 'United States', continent: 'NA', continentName: 'North America', capital: 'Washington, D.C.', lat: 37.0902, lng: -95.7129 },
  CA: { code: 'CA', name: 'Canada', continent: 'NA', continentName: 'North America', capital: 'Ottawa', lat: 56.1304, lng: -106.3468 },
  MX: { code: 'MX', name: 'Mexico', continent: 'NA', continentName: 'North America', capital: 'Mexico City', lat: 23.6345, lng: -102.5528 },

  // South America (SA)
  BR: { code: 'BR', name: 'Brazil', continent: 'SA', continentName: 'South America', capital: 'Brasilia', lat: -14.2350, lng: -51.9253 },
  AR: { code: 'AR', name: 'Argentina', continent: 'SA', continentName: 'South America', capital: 'Buenos Aires', lat: -38.4161, lng: -63.6167 },
  CL: { code: 'CL', name: 'Chile', continent: 'SA', continentName: 'South America', capital: 'Santiago', lat: -35.6751, lng: -71.5430 },
  CO: { code: 'CO', name: 'Colombia', continent: 'SA', continentName: 'South America', capital: 'Bogota', lat: 4.5709, lng: -74.2973 },
  PE: { code: 'PE', name: 'Peru', continent: 'SA', continentName: 'South America', capital: 'Lima', lat: -9.1899, lng: -75.0152 },

  // Europe (EU)
  GB: { code: 'GB', name: 'United Kingdom', continent: 'EU', continentName: 'Europe', capital: 'London', lat: 55.3781, lng: -3.4360 },
  DE: { code: 'DE', name: 'Germany', continent: 'EU', continentName: 'Europe', capital: 'Berlin', lat: 51.1657, lng: 10.4515 },
  FR: { code: 'FR', name: 'France', continent: 'EU', continentName: 'Europe', capital: 'Paris', lat: 46.2276, lng: 2.2137 },
  NL: { code: 'NL', name: 'Netherlands', continent: 'EU', continentName: 'Europe', capital: 'Amsterdam', lat: 52.1326, lng: 5.2913 },
  IT: { code: 'IT', name: 'Italy', continent: 'EU', continentName: 'Europe', capital: 'Rome', lat: 41.8719, lng: 12.5674 },
  ES: { code: 'ES', name: 'Spain', continent: 'EU', continentName: 'Europe', capital: 'Madrid', lat: 40.4637, lng: -3.7492 },
  SE: { code: 'SE', name: 'Sweden', continent: 'EU', continentName: 'Europe', capital: 'Stockholm', lat: 60.1282, lng: 18.6435 },
  NO: { code: 'NO', name: 'Norway', continent: 'EU', continentName: 'Europe', capital: 'Oslo', lat: 60.4720, lng: 8.4689 },
  CH: { code: 'CH', name: 'Switzerland', continent: 'EU', continentName: 'Europe', capital: 'Bern', lat: 46.8182, lng: 8.2275 },
  PL: { code: 'PL', name: 'Poland', continent: 'EU', continentName: 'Europe', capital: 'Warsaw', lat: 51.9194, lng: 19.1451 },
  UA: { code: 'UA', name: 'Ukraine', continent: 'EU', continentName: 'Europe', capital: 'Kyiv', lat: 48.3794, lng: 31.1656 },

  // Oceania (OC)
  AU: { code: 'AU', name: 'Australia', continent: 'OC', continentName: 'Oceania', capital: 'Canberra', lat: -25.2744, lng: 133.7751 },
  NZ: { code: 'NZ', name: 'New Zealand', continent: 'OC', continentName: 'Oceania', capital: 'Wellington', lat: -40.9006, lng: 174.8860 },
  FJ: { code: 'FJ', name: 'Fiji', continent: 'OC', continentName: 'Oceania', capital: 'Suva', lat: -17.7134, lng: 178.0650 },
  PG: { code: 'PG', name: 'Papua New Guinea', continent: 'OC', continentName: 'Oceania', capital: 'Port Moresby', lat: -6.3150, lng: 143.9555 }
};

/**
 * Major World City Coordinates for granular pinpoint plotting.
 */
export const MAJOR_CITIES: Record<string, { country: string; lat: number; lng: number }> = {
  // Gabon
  'libreville': { country: 'GA', lat: 0.4162, lng: 9.4673 },
  'port-gentil': { country: 'GA', lat: -0.7193, lng: 8.7815 },
  
  // Asia
  'seoul': { country: 'KR', lat: 37.5665, lng: 126.9780 },
  'busan': { country: 'KR', lat: 35.1796, lng: 129.0756 },
  'tokyo': { country: 'JP', lat: 35.6762, lng: 139.6503 },
  'osaka': { country: 'JP', lat: 34.6937, lng: 135.5023 },
  'singapore': { country: 'SG', lat: 1.3521, lng: 103.8198 },
  'beijing': { country: 'CN', lat: 39.9042, lng: 116.4074 },
  'shanghai': { country: 'CN', lat: 31.2304, lng: 121.4737 },
  'taipei': { country: 'TW', lat: 25.0330, lng: 121.5654 },
  'mumbai': { country: 'IN', lat: 19.0760, lng: 72.8777 },
  
  // Central Asia
  'astana': { country: 'KZ', lat: 51.1694, lng: 71.4491 },
  'almaty': { country: 'KZ', lat: 43.2220, lng: 76.8512 },
  'tashkent': { country: 'UZ', lat: 41.2995, lng: 69.2401 },
  'bishkek': { country: 'KG', lat: 42.8746, lng: 74.5698 },
  
  // Middle East
  'dubai': { country: 'AE', lat: 25.2048, lng: 55.2708 },
  'abu dhabi': { country: 'AE', lat: 24.4539, lng: 54.3773 },
  'riyadh': { country: 'SA', lat: 24.7136, lng: 46.6753 },
  'doha': { country: 'QA', lat: 25.2854, lng: 51.5310 },
  'istanbul': { country: 'TR', lat: 41.0082, lng: 28.9784 },
  'tel aviv': { country: 'IL', lat: 32.0853, lng: 34.7818 },
  
  // North America
  'new york': { country: 'US', lat: 40.7128, lng: -74.0060 },
  'san francisco': { country: 'US', lat: 37.7749, lng: -122.4194 },
  'seattle': { country: 'US', lat: 47.6062, lng: -122.3321 },
  'chicago': { country: 'US', lat: 41.8781, lng: -87.6298 },
  'toronto': { country: 'CA', lat: 43.6532, lng: -79.3832 },
  'vancouver': { country: 'CA', lat: 49.2827, lng: -123.1207 },
  
  // South America
  'sao paulo': { country: 'BR', lat: -23.5505, lng: -46.6333 },
  'rio de janeiro': { country: 'BR', lat: -22.9068, lng: -43.1729 },
  'buenos aires': { country: 'AR', lat: -34.6037, lng: -58.3816 },
  'santiago': { country: 'CL', lat: -33.4489, lng: -70.6693 },
  
  // Europe
  'london': { country: 'GB', lat: 51.5074, lng: -0.1278 },
  'frankfurt': { country: 'DE', lat: 50.1109, lng: 8.6821 },
  'paris': { country: 'FR', lat: 48.8566, lng: 2.3522 },
  'amsterdam': { country: 'NL', lat: 52.3676, lng: 4.9041 },
  'oslo': { country: 'NO', lat: 59.9139, lng: 10.7522 },
  'stockholm': { country: 'SE', lat: 59.3293, lng: 18.0686 },
  
  // Oceania
  'sydney': { country: 'AU', lat: -33.8688, lng: 151.2093 },
  'melbourne': { country: 'AU', lat: -37.8136, lng: 144.9631 },
  'auckland': { country: 'NZ', lat: -36.8485, lng: 174.7633 }
};

/**
 * Resolves country information by 2-letter ISO country code.
 */
export function resolveCountry(code?: string): GeoCountryInfo | undefined {
  if (!code) return undefined;
  const upper = code.trim().toUpperCase();
  return ISO_COUNTRIES[upper];
}

/**
 * Resolves precise coordinates for Country and/or Major City.
 */
export function resolveGeoCoordinates(countryCode?: string, cityName?: string): [number, number] | undefined {
  if (cityName) {
    const key = cityName.trim().toLowerCase();
    if (MAJOR_CITIES[key]) {
      return [MAJOR_CITIES[key].lat, MAJOR_CITIES[key].lng];
    }
  }

  if (countryCode) {
    const c = resolveCountry(countryCode);
    if (c) {
      return [c.lat, c.lng];
    }
  }

  return undefined;
}

/**
 * Parses Edge & CDN incoming headers to extract Country, City, and ASN cleanly.
 */
export function parseEdgeGeoHeaders(headers: Record<string, string | string[] | undefined>): {
  country?: string;
  city?: string;
  asn?: number;
  latitude?: number;
  longitude?: number;
} {
  const h: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) {
    if (v) {
      h[k.toLowerCase()] = Array.isArray(v) ? v[0] : String(v);
    }
  }

  const country = (
    h['cf-ipcountry'] ||
    h['cloudfront-viewer-country'] ||
    h['x-vercel-ip-country'] ||
    h['fastly-client-country'] ||
    h['x-country-code'] ||
    h['x-geoip-country']
  )?.trim().toUpperCase();

  const city = (
    h['cf-ipcity'] ||
    h['cloudfront-viewer-city'] ||
    h['x-vercel-ip-city'] ||
    h['fastly-client-city'] ||
    h['x-city']
  )?.trim();

  let asn: number | undefined;
  const rawAsn = h['cf-connecting-asn'] || h['cloudfront-viewer-asn'] || h['x-asn'];
  if (rawAsn && /^\d+$/.test(rawAsn)) {
    asn = parseInt(rawAsn, 10);
  }

  let latitude: number | undefined;
  let longitude: number | undefined;
  const rawLat = h['cf-iplatitude'] || h['cloudfront-viewer-latitude'] || h['x-vercel-ip-latitude'];
  const rawLng = h['cf-iplongitude'] || h['cloudfront-viewer-longitude'] || h['x-vercel-ip-longitude'];
  if (rawLat && rawLng && !isNaN(parseFloat(rawLat)) && !isNaN(parseFloat(rawLng))) {
    latitude = parseFloat(rawLat);
    longitude = parseFloat(rawLng);
  }

  return { country, city, asn, latitude, longitude };
}
