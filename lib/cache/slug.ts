export function canonicalSlug(brand: string, name: string, concentration?: string): string {
  const parts = [brand, name]
  if (concentration) {
    parts.push(concentration)
  }

  return parts
    .join('-')
    .toLowerCase()
    .normalize('NFD')                     // Decompose diacritics
    .replace(/[\u0300-\u036f]/g, '')      // Remove diacritics
    .replace(/[^a-z0-9]+/g, '-')          // Replace non-alphanumeric with dash
    .replace(/^-+|-+$/g, '')              // Trim leading/trailing dashes
}
