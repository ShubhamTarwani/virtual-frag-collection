import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getProfileByUsername, getCurrentProfile } from '@/lib/supabase/queries'
import { getFollowers, isFollowing as checkIsFollowing, isFollowedBy as checkIsFollowedBy } from '@/lib/supabase/social-queries'
import FollowButton from '@/app/components/FollowButton'

export default async function FollowersPage(props: { params: Promise<{ username: string }> }) {
  const { username } = await props.params
  const profile = await getProfileByUsername(username)
  if (!profile) notFound()

  const currentUser = await getCurrentProfile()
  const followers = await getFollowers(profile.id)

  // For each follower, check if the current user follows them and if they follow back
  const followersWithState = await Promise.all(
    followers.map(async (f) => {
      const isOwn = currentUser?.id === f.profiles.id
      const [following, followsBack] = isOwn
        ? [false, false]
        : currentUser
          ? await Promise.all([
              checkIsFollowing(f.profiles.id),
              checkIsFollowedBy(f.profiles.id),
            ])
          : [false, false]
      return { ...f, isOwn, following, followsBack }
    })
  )

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-6 py-12">
        <div className="mb-8">
          <Link href={`/u/${username}`} className="text-sm text-accent hover:underline">
            ← Back to @{username}
          </Link>
          <h1 className="text-2xl font-bold text-foreground font-serif mt-2">Followers</h1>
          <p className="text-sm text-muted">{followers.length} follower{followers.length !== 1 ? 's' : ''}</p>
        </div>

        {followers.length === 0 ? (
          <p className="text-sm text-muted py-8 text-center">No followers yet.</p>
        ) : (
          <div className="space-y-3">
            {followersWithState.map((f) => (
              <div key={f.follower_id} className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-4">
                <Link href={`/u/${f.profiles.username}`} className="flex-shrink-0">
                  <div className="h-10 w-10 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center text-sm font-bold text-accent">
                    {f.profiles.avatar_url ? (
                      <img src={f.profiles.avatar_url} alt="" className="h-full w-full rounded-full object-cover" />
                    ) : (
                      (f.profiles.display_name || f.profiles.username)[0].toUpperCase()
                    )}
                  </div>
                </Link>
                <div className="flex-1 min-w-0">
                  <Link href={`/u/${f.profiles.username}`} className="hover:text-accent transition-colors">
                    <div className="text-sm font-semibold text-foreground truncate">
                      {f.profiles.display_name || f.profiles.username}
                    </div>
                    <div className="text-xs text-muted">@{f.profiles.username}</div>
                  </Link>
                </div>
                <FollowButton
                  userId={f.profiles.id}
                  initialFollowing={f.following}
                  initialFollowsBack={f.followsBack}
                  isOwnProfile={f.isOwn}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
