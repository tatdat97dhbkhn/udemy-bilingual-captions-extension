export function normalizeCaption(text: string): string {
  return text.replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\s+/g, ' ').trim();
}

export function cacheKey(text: string, target: 'vi' = 'vi'): string {
  return `${target}:${normalizeCaption(text).toLocaleLowerCase('en-US')}`;
}
