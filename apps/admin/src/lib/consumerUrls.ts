export function consumerListingUrl(listingId: string | undefined | null): string {
  const id = String(listingId ?? "").trim();
  const base =
    process.env.NEXT_PUBLIC_LOBBY_WEB_ORIGIN?.replace(/\/$/, "") || "http://localhost:3000";
  if (!id) {
    return base;
  }
  return `${base}/listings/${encodeURIComponent(id)}`;
}

export function adminUsersSearchUrl(query: string | undefined | null): string {
  const q = String(query ?? "").trim();
  if (!q) {
    return "/users";
  }
  return `/users?q=${encodeURIComponent(q)}`;
}
