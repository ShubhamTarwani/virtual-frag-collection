/* eslint-disable @next/next/no-img-element */
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getProfileByUsername, getPublicFragrancesByUserId, getCurrentProfile } from '@/lib/supabase/queries'
import { getFollowerCount, getFollowingCount, getFragranceCount, isFollowing, isFollowedBy, getLikeCount, isLiked } from '@/lib/supabase/social-queries'
import FollowButton from '@/app/components/FollowButton'
import LikeButton from '@/app/components/LikeButton'
import PerfumeShelf from '@/app/components/PerfumeShelf'

export default async function ProfilePage(props: { params: Promise<{ username: string }> }) {
  const { username } = await props.params
  const profile = await getProfileByUsername(username)
  if (!profile) notFound()

  const currentUser = await getCurrentProfile()
  const isOwn = currentUser?.id === profile.id

  const [fragrances, followerCount, followingCount, fragranceCount, following, followsBack] = await Promise.all([
    getPublicFragrancesByUserId(profile.id),
    getFollowerCount(profile.id),
    getFollowingCount(profile.id),
    getFragranceCount(profile.id),
    isOwn ? Promise.resolve(false) : isFollowing(profile.id),
    isOwn ? Promise.resolve(false) : isFollowedBy(profile.id),
  ])

  // Get like data for each fragrance
  const fragrancesWithLikes = await Promise.all(
    fragrances.map(async (f) => {
      const [likeCount, liked] = await Promise.all([
        getLikeCount(f.id),
        isLiked(f.id),
      ])
      return { ...f, likeCount, liked }
    })
  )

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-6 py-12">
        {/* Profile header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 mb-10">
          {/* Avatar */}
          <div className="h-20 w-20 rounded-full border-2 border-accent/30 flex items-center justify-center text-2xl font-bold text-accent bg-accent/10 flex-shrink-0"
               style={{ borderColor: profile.accent_color }}>
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="h-full w-full rounded-full object-cover" />
            ) : (
              (profile.display_name || profile.username)[0].toUpperCase()
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-4 flex-wrap">
              <h1 className="text-2xl font-bold text-foreground font-serif">
                {profile.display_name || profile.username}
              </h1>
              <FollowButton
                userId={profile.id}
                initialFollowing={following}
                initialFollowsBack={followsBack}
                isOwnProfile={isOwn}
              />
            </div>
            <p className="text-sm text-muted mt-0.5">@{profile.username}</p>
            {profile.bio && (
              <p className="text-sm text-foreground/80 mt-2 max-w-lg">{profile.bio}</p>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="flex gap-6 mb-10 border-b border-border pb-6">
          <div className="text-center">
            <div className="text-xl font-bold text-foreground">{fragranceCount}</div>
            <div className="text-xs text-muted uppercase tracking-wider">Fragrances</div>
          </div>
          <Link href={`/u/${username}/followers`} className="text-center hover:text-accent transition-colors">
            <div className="text-xl font-bold text-foreground">{followerCount}</div>
            <div className="text-xs text-muted uppercase tracking-wider">Followers</div>
          </Link>
          <Link href={`/u/${username}/following`} className="text-center hover:text-accent transition-colors">
            <div className="text-xl font-bold text-foreground">{followingCount}</div>
            <div className="text-xs text-muted uppercase tracking-wider">Following</div>
          </Link>
        </div>

        {/* Fragrance grid */}
        <h2 className="text-lg font-semibold text-foreground mb-4">Collection</h2>
        {isOwn ? (
          <PerfumeShelf />
        ) : fragrancesWithLikes.length === 0 ? (
          <p className="text-sm text-muted py-8 text-center">No fragrances yet.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {fragrancesWithLikes.map((f) => (
              <div key={f.id} className="rounded-2xl border border-border bg-surface overflow-hidden group hover:border-accent/50 transition-colors">
                <div className="aspect-square bg-surface-hover flex items-center justify-center p-4">
                  {f.image_url ? (
                    <img src={f.image_url} alt={f.name || 'Perfume'} className="h-full w-full object-contain" />
                  ) : (
                    <div className="text-3xl text-muted/30">🧴</div>
                  )}
                </div>
                <div className="p-3">
                  <div className="font-bold text-xs text-foreground truncate">{f.name || 'Unknown'}</div>
                  <div className="text-[10px] text-muted uppercase tracking-wider truncate">{f.brand || ''}</div>
                  <div className="mt-2 flex items-center justify-between">
                    {f.concentration && (
                      <span className="text-[10px] text-accent-dark">{f.concentration}</span>
                    )}
                    <LikeButton
                      fragranceId={f.id}
                      initialLiked={f.liked}
                      initialCount={f.likeCount}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
