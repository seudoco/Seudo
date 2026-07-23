import "server-only";

import { City, Country } from "country-state-city";

/** ISO 639-1 language codes used for practitioner profile language selection. */
const LANGUAGE_CODES = [
  "af", "sq", "am", "ar", "hy", "az", "eu", "be", "bn", "bs", "bg", "my", "ca", "zh", "hr", "cs",
  "da", "nl", "en", "et", "fi", "fr", "ka", "de", "el", "gu", "he", "hi", "hu", "is", "id", "ga",
  "it", "ja", "kn", "kk", "km", "ko", "ku", "lo", "lv", "lt", "mk", "ms", "ml", "mt", "mr", "mn",
  "ne", "no", "fa", "pl", "pt", "pa", "ro", "ru", "sr", "si", "sk", "sl", "es", "sw", "sv", "ta",
  "te", "th", "tr", "uk", "ur", "vi", "cy",
] as const;

const languageDisplay = new Intl.DisplayNames(["en"], { type: "language" });
const countryByName = new Map(Country.getAllCountries().map((c) => [c.name, c]));

const countryNames = [...countryByName.keys()].sort((a, b) => a.localeCompare(b));

const languageNames = [...new Set(
  LANGUAGE_CODES.map((code) => languageDisplay.of(code)).filter((name): name is string => Boolean(name))
)].sort((a, b) => a.localeCompare(b));

const timezoneNames = Intl.supportedValuesOf("timeZone").sort((a, b) => a.localeCompare(b));

export function getCountryNames(): readonly string[] {
  return countryNames;
}

export function getLanguageNames(): readonly string[] {
  return languageNames;
}

export function getTimezoneNames(): readonly string[] {
  return timezoneNames;
}

export function getCountryCode(countryName: string): string | undefined {
  return countryByName.get(countryName)?.isoCode;
}

export function isValidCountry(countryName: string): boolean {
  return countryByName.has(countryName);
}

export function isValidLanguage(languageName: string): boolean {
  return languageNames.includes(languageName);
}

export function isValidTimezone(timezone: string): boolean {
  return timezoneNames.includes(timezone);
}

export function isValidCity(countryName: string, cityName: string): boolean {
  const code = getCountryCode(countryName);
  if (!code) return false;
  return City.getCitiesOfCountry(code)?.some((city) => city.name === cityName) ?? false;
}

export function searchCities(countryName: string, query: string, limit = 20): string[] {
  const code = getCountryCode(countryName);
  if (!code) return [];

  const normalizedQuery = query.trim().toLowerCase();
  const cities = City.getCitiesOfCountry(code) ?? [];

  if (!normalizedQuery) {
    return cities.slice(0, limit).map((city) => city.name);
  }

  return cities
    .filter((city) => city.name.toLowerCase().includes(normalizedQuery))
    .slice(0, limit)
    .map((city) => city.name);
}
