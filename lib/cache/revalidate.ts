import { revalidatePath } from 'next/cache';

/**
 * Revalidates a user's public profile page.
 * Call this after a user changes their collection, profile bio, accent color, or likes.
 */
export async function revalidateProfile(username: string) {
  if (!username) return;
  const lowerUsername = username.toLowerCase();
  revalidatePath(`/u/${lowerUsername}`);
  // Also revalidate followers/following sub-pages if cached
  revalidatePath(`/u/${lowerUsername}/followers`);
  revalidatePath(`/u/${lowerUsername}/following`);
}

/**
 * Revalidates a specific fragrance detail page if it is ever split into a dedicated subroute.
 */
export async function revalidateFragrance(slug: string) {
  if (!slug) return;
  revalidatePath(`/f/${slug}`);
}

/**
 * Revalidates global public pages like feed and discover.
 */
export async function revalidateGlobalFeeds() {
  revalidatePath('/discover');
  revalidatePath('/feed');
  revalidatePath('/');
}
