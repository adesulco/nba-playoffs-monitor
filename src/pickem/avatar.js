/** One avatar palette for every 4a screen (was copied five times). */
export const AVATAR_COLORS = ['#1E3FBB', '#7A2E8E', '#E07B00', '#1F7A3D', '#D92D1C', '#171310'];

export function avatarColor(seed) {
  let h = 0;
  const s = String(seed ?? '');
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 997;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
