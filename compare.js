export function compare(followers, following) {
  const followersSet = new Set(followers.map(user => String(user.pk)));
  return following.filter(user => !followersSet.has(String(user.pk)))
    .sort((a, b) => a.username.localeCompare(b.username));
}
