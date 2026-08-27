'use client'

import * as React from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowRight,
  Check,
  ChevronRight,
  Coins,
  Clock3,
  Copy,
  History,
  Inbox,
  Link2,
  Loader2,
  Search,
  ShieldCheck,
  ShieldAlert,
  Swords,
  UserPlus,
  UserCheck,
  Users,
  X,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input, Label } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Avatar } from '@/features/shared/avatar'
import { useAuth } from '@/features/auth/auth-provider'
import { cn } from '@/lib/utils'
import type { CombatInvite, CombatMatch, CombatPreset, Friendship, SocialProfile } from '@/types/database'
import {
  loadFriends,
  loadHistory,
  loadRequests,
  postCombat,
  postSocial,
  searchSocialUsers,
} from './combat-api'

const PRESET_COPY: Record<CombatPreset, { title: string; detail: string; questions: string }> = {
  sprint: { title: 'Sprint', detail: 'Fast and focused', questions: '5 questions · 15s each' },
  standard: { title: 'Standard', detail: 'A proper head-to-head', questions: '10 questions · 15s each' },
  custom: { title: 'Custom', detail: 'Tune the pace', questions: '3–20 questions · 5–60s each' },
}

function formatRelativeTime(value: string | null): string {
  if (!value) return 'Offline'
  const elapsed = Math.max(0, Date.now() - new Date(value).getTime())
  if (elapsed < 60_000) return 'Just now'
  const minutes = Math.floor(elapsed / 60_000)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function presenceLabel(profile: SocialProfile): string {
  if (profile.presence === 'online') return 'Online'
  if (profile.presence === 'in_combat') return 'In Combat'
  if (profile.presence === 'learning') return 'Learning'
  if (profile.presence === 'reviewing') return 'Reviewing'
  if (profile.presence === 'mock_test') return 'Mock test'
  if (profile.presence === 'idle') return 'Idle'
  return profile.last_seen_at ? formatRelativeTime(profile.last_seen_at) : 'Offline'
}

function statusLabel(match: CombatMatch): string {
  if (match.status === 'completed') return 'Completed'
  if (match.status === 'draw') return 'Draw'
  if (match.status === 'cancelled') return 'Cancelled'
  if (match.status === 'expired') return 'Expired'
  if (match.status === 'abandoned') return 'Abandoned'
  if (match.status === 'no_contest') return 'No contest'
  if (match.status === 'active') return 'In progress'
  return 'Waiting for a player'
}

export function CombatView() {
  const router = useRouter()
  const { user } = useAuth()
  const [section, setSection] = React.useState<'overview' | 'friends' | 'circle'>('overview')
  const [createOpen, setCreateOpen] = React.useState(false)
  const [joinOpen, setJoinOpen] = React.useState(false)
  const [preset, setPreset] = React.useState<CombatPreset>('sprint')
  const [customQuestions, setCustomQuestions] = React.useState(8)
  const [customSeconds, setCustomSeconds] = React.useState(15)
  const [wagerXp, setWagerXp] = React.useState<0 | 100>(0)
  const [friendToChallenge, setFriendToChallenge] = React.useState<Friendship | null>(null)
  const [joinCode, setJoinCode] = React.useState('')
  const [search, setSearch] = React.useState('')
  const [busy, setBusy] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [notice, setNotice] = React.useState<string | null>(null)
  const [copied, setCopied] = React.useState(false)

  const friends = useSWR(user ? ['combat-friends', user.id] : null, () => loadFriends())
  const requests = useSWR(user ? ['combat-requests', user.id] : null, () => loadRequests())
  const invites = useSWR<CombatInvite[]>(user ? ['combat-invites', user.id] : null, () => fetch('/api/combat?view=invites').then(async (response) => {
    const payload = await response.json() as CombatInvite[] | { error?: string }
    if (!response.ok) throw new Error((payload as { error?: string }).error ?? 'Invites could not be loaded.')
    return payload as CombatInvite[]
  }))
  const history = useSWR(user ? ['combat-history', user.id] : null, () => loadHistory())
  const searchResults = useSWR<SocialProfile[]>(user && search.trim().length >= 2 ? ['combat-search', user.id, search.trim()] : null, () => searchSocialUsers(search))

  React.useEffect(() => {
    if (!user) return
    void postSocial({ action: 'presence', state: 'in_combat' })
    return () => { void postSocial({ action: 'presence', state: 'online' }) }
  }, [user])

  const refreshSocial = async () => {
    await Promise.all([friends.mutate(), requests.mutate(), invites.mutate(), history.mutate(), searchResults.mutate()])
  }

  const run = async (key: string, action: () => Promise<void>) => {
    setBusy(key)
    setError(null)
    setNotice(null)
    try {
      await action()
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Something went wrong.')
    } finally {
      setBusy(null)
    }
  }

  const createMatch = async (selectedPreset: CombatPreset = preset, selectedWager: 0 | 100 = wagerXp, recipientId?: string) => {
    await run('create', async () => {
      const match = await postCombat<CombatMatch>({
        action: 'create',
        preset: selectedPreset,
        questionCount: selectedPreset === 'custom' ? customQuestions : selectedPreset === 'standard' ? 10 : 5,
        timeLimitSeconds: selectedPreset === 'custom' ? customSeconds : 15,
        wagerXp: selectedWager,
      })
      if (recipientId) await postCombat({ action: 'invite_friend', matchId: match.id, recipientId })
      setCreateOpen(false)
      setFriendToChallenge(null)
      router.push(`/combat/${match.id}`)
    })
  }

  const joinMatch = async () => {
    await run('join', async () => {
      const match = await postCombat<CombatMatch>({ action: 'join', joinCode })
      setJoinOpen(false)
      router.push(`/combat/${match.id}`)
    })
  }

  const challengeFriend = (friend: Friendship) => {
    setFriendToChallenge(friend)
    setPreset('sprint')
    setWagerXp(100)
    setCreateOpen(true)
  }

  const respondToInvite = async (invite: CombatInvite, response: 'accepted' | 'declined') => {
    await run(`invite-${invite.id}`, async () => {
      const match = await postCombat<CombatMatch | null>({ action: 'respond_invite', inviteId: invite.id, response })
      await invites.mutate()
      if (match) router.push(`/combat/${match.id}`)
    })
  }

  const respondToRequest = async (id: string, response: 'accepted' | 'declined' | 'cancelled') => {
    await run(`request-${id}`, async () => {
      await postSocial({ action: 'respond_request', friendshipId: id, response })
      await refreshSocial()
    })
  }

  const addFriend = async (profile: SocialProfile) => {
    await run(`add-${profile.id}`, async () => {
      await postSocial({ action: 'send_request', userId: profile.id })
      setNotice(`Friend request sent to ${profile.display_name}.`)
      await Promise.all([friends.mutate(), requests.mutate(), searchResults.mutate()])
    })
  }

  const copyCode = async (code: string) => {
    await navigator.clipboard?.writeText(code).catch(() => undefined)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 pb-28 md:gap-6 md:pb-10">
      <section className="relative overflow-hidden rounded-lg border-2 border-foreground bg-foreground px-5 py-6 text-primary-foreground shadow-brutal sm:px-7 sm:py-8">
        <div className="pointer-events-none absolute -right-12 -top-12 size-44 rounded-full border-[18px] border-coral/80 opacity-90" />
        <div className="pointer-events-none absolute -bottom-16 right-24 size-44 rounded-full border-[14px] border-mint/70 opacity-80" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border-2 border-primary-foreground/30 bg-primary-foreground/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-primary-foreground/80">
              <Swords className="size-3.5" aria-hidden /> Combat
            </div>
            <h1 className="font-heading text-3xl font-black tracking-tight sm:text-4xl">Learn it. Face it. Own it.</h1>
            <p className="mt-2 max-w-lg text-sm leading-6 text-primary-foreground/75 sm:text-base">A fair, private vocabulary duel with one shared question set. No public pressure, no random bonuses—just what you know.</p>
          </div>
          <div className="flex shrink-0 items-center gap-2 rounded-md border-2 border-primary-foreground/20 bg-primary-foreground/10 px-3 py-2 text-xs font-semibold text-primary-foreground/80">
            <Coins className="size-4 text-mint" aria-hidden /> Optional 100 XP stakes · friend matches only
          </div>
        </div>
      </section>

      {error ? <div role="alert" className="flex items-start gap-2 rounded-md border-2 border-destructive bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive"><ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden />{error}<button className="ml-auto" onClick={() => setError(null)} aria-label="Dismiss error"><X className="size-4" aria-hidden /></button></div> : null}
      {notice ? <div role="status" className="flex items-start gap-2 rounded-md border-2 border-mint bg-mint/15 px-4 py-3 text-sm font-semibold"><Check className="mt-0.5 size-4 shrink-0" aria-hidden />{notice}</div> : null}

      <div className="flex items-center gap-1 overflow-x-auto border-b-2 border-foreground/10 pb-1" role="tablist" aria-label="Combat sections">
        <TabButton active={section === 'overview'} onClick={() => setSection('overview')}>Overview</TabButton>
        <TabButton active={section === 'friends'} onClick={() => setSection('friends')}>Friends</TabButton>
        <TabButton active={section === 'circle'} onClick={() => setSection('circle')} badge={requests.data?.incoming.length ?? 0}>Circle</TabButton>
      </div>

      {section === 'overview' ? (
        <div className="grid gap-5">
          <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
            <ActionCard icon={Zap} title="Quick duel" detail="Start a 5-question Sprint" accent="coral" onClick={() => void createMatch('sprint')} loading={busy === 'create'} />
            <ActionCard icon={Swords} title="Create match" detail="Choose the pace yourself" accent="mint" onClick={() => setCreateOpen(true)} />
            <ActionCard icon={Link2} title="Join by code" detail="Enter a private 6-character code" accent="ink" onClick={() => setJoinOpen(true)} />
            <ActionCard icon={Users} title="Challenge a friend" detail="Invite from your trusted circle" accent="sand" onClick={() => setSection('circle')} />
          </div>

          <div className="grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
            <Card>
              <CardHeader className="flex-row items-start justify-between gap-4">
                <div><CardTitle className="flex items-center gap-2"><Inbox className="size-5 text-coral" aria-hidden /> Invitations</CardTitle><CardDescription>Friend challenges stay private until you accept.</CardDescription></div>
                <button className="text-xs font-bold text-muted-foreground underline-offset-4 hover:underline" onClick={() => setSection('circle')}>See Circle</button>
              </CardHeader>
              <CardContent>
                {invites.isLoading ? <LoadingLine /> : invites.data?.length ? <div className="grid gap-3">{invites.data.slice(0, 3).map((invite) => <InviteRow key={invite.id} invite={invite} busy={busy === `invite-${invite.id}`} onRespond={(response) => void respondToInvite(invite, response)} />)}</div> : <EmptyPanel icon={Inbox} title="Your inbox is clear" detail="When a friend challenges you, it will appear here." />}
              </CardContent>
            </Card>
            <Card className="bg-mint/10">
              <CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="size-5 text-mint-foreground" aria-hidden /> Fair by design</CardTitle><CardDescription>Combat should strengthen learning, not punish it.</CardDescription></CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground"><RuleLine title="Same questions" detail="Both players receive the same pre-generated set and order." /><RuleLine title="Shared timer" detail="The round advances when both answer or the deadline ends." /><RuleLine title="Knowledge first" detail="Correct answers decide the winner. Speed only breaks ties." /></CardContent>
            </Card>
          </div>

          <HistorySection history={history.data ?? []} loading={history.isLoading} userId={user?.id} onOpen={(match) => router.push(`/combat/${match.id}`)} />
        </div>
      ) : null}

      {section === 'friends' ? <SearchSection search={search} setSearch={setSearch} searchResults={searchResults.data ?? []} busy={busy} onAddFriend={(profile) => void addFriend(profile)} onRespondRequest={(id, response) => void respondToRequest(id, response)} /> : null}
      {section === 'circle' ? <CircleSection friends={friends.data ?? []} requests={requests.data} busy={busy} onRespondRequest={(id, response) => void respondToRequest(id, response)} onChallenge={(friend) => void challengeFriend(friend)} /> : null}

      <Modal open={createOpen} onClose={() => { setCreateOpen(false); setFriendToChallenge(null) }} title={friendToChallenge ? `Challenge ${friendToChallenge.other_user.display_name}` : 'Create a private match'} description={friendToChallenge ? 'Choose the rules together. They must accept the exact stake before joining.' : 'Pick a preset now. Advanced controls stay tucked away until you need them.'} footer={<><Button variant="ghost" size="sm" onClick={() => { setCreateOpen(false); setFriendToChallenge(null) }}>Cancel</Button><Button size="sm" onClick={() => void createMatch(preset, wagerXp, friendToChallenge?.other_user.id)} loading={busy === 'create'}>{friendToChallenge ? 'Send challenge' : 'Create match'} <ArrowRight className="size-4" aria-hidden /></Button></>}>
        <div className="grid gap-3">
          {(Object.keys(PRESET_COPY) as CombatPreset[]).map((item) => <button key={item} type="button" onClick={() => setPreset(item)} className={cn('rounded-md border-2 border-foreground p-4 text-left transition-colors', preset === item ? 'bg-mint shadow-brutal-sm' : 'bg-card hover:bg-muted')}><div className="flex items-start justify-between gap-3"><div><p className="font-heading font-bold">{PRESET_COPY[item].title}</p><p className="mt-1 text-sm text-muted-foreground">{PRESET_COPY[item].detail}</p></div><span className="text-xs font-semibold text-muted-foreground">{PRESET_COPY[item].questions}</span></div></button>)}
          {preset === 'custom' ? <div className="grid grid-cols-2 gap-3 rounded-md border-2 border-foreground/15 bg-muted/40 p-3"><div><Label htmlFor="combat-question-count">Questions</Label><Input id="combat-question-count" type="number" min={3} max={20} value={customQuestions} onChange={(event) => setCustomQuestions(Math.min(20, Math.max(3, Number(event.target.value) || 3)))} /></div><div><Label htmlFor="combat-time-limit">Seconds each</Label><Input id="combat-time-limit" type="number" min={5} max={60} value={customSeconds} onChange={(event) => setCustomSeconds(Math.min(60, Math.max(5, Number(event.target.value) || 5)))} /></div></div> : null}
          <div className="grid gap-2 rounded-md border-2 border-foreground/15 bg-muted/40 p-3"><p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Stake</p><div className="grid gap-2 sm:grid-cols-2"><button type="button" onClick={() => setWagerXp(0)} className={cn('rounded-md border-2 px-3 py-3 text-left', wagerXp === 0 ? 'border-foreground bg-card shadow-brutal-sm' : 'border-foreground/15 bg-background hover:bg-card')}><p className="text-sm font-bold">Practice match</p><p className="mt-1 text-xs text-muted-foreground">No XP at risk</p></button><button type="button" onClick={() => setWagerXp(100)} className={cn('rounded-md border-2 px-3 py-3 text-left', wagerXp === 100 ? 'border-foreground bg-mint/25 shadow-brutal-sm' : 'border-foreground/15 bg-background hover:bg-mint/10')}><p className="flex items-center gap-1.5 text-sm font-bold"><Coins className="size-4 text-coral" aria-hidden />100 XP wager</p><p className="mt-1 text-xs text-muted-foreground">Winner receives 200 XP</p></button></div><p className="text-xs leading-5 text-muted-foreground">The stake is reserved before play. Your opponent sees and accepts the exact amount before joining. A draw, cancellation, expiry, or protected no-contest refunds both players.</p></div><p className="text-xs leading-5 text-muted-foreground">Questions are selected from the shared eligible pool. The correct answer is never sent to your device during the match.</p>
        </div>
      </Modal>

      <Modal open={joinOpen} onClose={() => setJoinOpen(false)} title="Join by private code" description="Ask your friend for the code shown in their waiting room." footer={<><Button variant="ghost" size="sm" onClick={() => setJoinOpen(false)}>Cancel</Button><Button size="sm" onClick={() => void joinMatch()} loading={busy === 'join'} disabled={joinCode.trim().length < 6}>Join match <ArrowRight className="size-4" aria-hidden /></Button></>}>
        <div className="space-y-3"><Label htmlFor="combat-join-code">Match code</Label><Input id="combat-join-code" value={joinCode} maxLength={6} autoComplete="off" className="text-center font-heading text-2xl font-black uppercase tracking-[0.25em]" placeholder="ABC123" onChange={(event) => setJoinCode(event.target.value.replace(/[^a-z0-9]/gi, '').slice(0, 6).toUpperCase())} /><p className="text-xs text-muted-foreground">Private matches expire after 30 minutes if nobody joins.</p></div>
      </Modal>

      {copied ? <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full border-2 border-foreground bg-foreground px-4 py-2 text-xs font-bold text-primary-foreground shadow-brutal-sm md:bottom-6">Code copied</div> : null}
    </div>
  )
}

function ActionCard({ icon: Icon, title, detail, accent, onClick, loading }: { icon: typeof Swords; title: string; detail: string; accent: 'coral' | 'mint' | 'ink' | 'sand'; onClick: () => void; loading?: boolean }) {
  const colors = { coral: 'bg-coral/15', mint: 'bg-mint/15', ink: 'bg-foreground text-primary-foreground', sand: 'bg-muted' }
  return <button type="button" onClick={onClick} disabled={loading} className={cn('group rounded-lg border-2 border-foreground p-3 text-left shadow-brutal transition-transform hover:-translate-y-0.5 disabled:opacity-70 sm:p-4', colors[accent])}><span className="flex items-start justify-between gap-2"><span className={cn('grid size-9 place-items-center rounded-md border-2 border-foreground bg-card text-foreground shadow-brutal-sm sm:size-10', accent === 'ink' && 'bg-primary text-primary-foreground')}><Icon className="size-4 sm:size-5" aria-hidden /></span>{loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />}</span><p className="mt-3 font-heading text-sm font-bold sm:mt-4 sm:text-base">{title}</p><p className={cn('mt-1 text-[11px] leading-4 sm:text-xs', accent === 'ink' ? 'text-primary-foreground/70' : 'text-muted-foreground')}>{detail}</p></button>
}

function TabButton({ active, badge, children, onClick }: { active: boolean; badge?: number; children: React.ReactNode; onClick: () => void }) {
  return <button type="button" role="tab" aria-selected={active} onClick={onClick} className={cn('rounded-md px-3 py-2 text-sm font-heading font-bold transition-colors', active ? 'bg-foreground text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}>{children}{badge ? <span className="ml-2 rounded-full bg-coral px-1.5 py-0.5 text-[10px] text-coral-foreground">{badge}</span> : null}</button>
}

function InviteRow({ invite, busy, onRespond }: { invite: CombatInvite; busy: boolean; onRespond: (response: 'accepted' | 'declined') => void }) {
  return <div className="flex flex-col gap-3 rounded-md border-2 border-foreground/15 bg-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 items-center gap-3"><Avatar name={invite.sender.display_name} avatarId={invite.sender.avatar_id} avatarUrl={invite.sender.avatar_url} size="sm" /><div className="min-w-0"><p className="truncate text-sm font-bold">{invite.sender.display_name} challenged you</p><p className="text-xs text-muted-foreground">{invite.match?.question_count ?? 5} questions · private Sprint{invite.match?.wager_xp ? ` · ${invite.match.wager_xp} XP stake each` : ' · no stake'}</p></div></div><div className="flex gap-2 sm:shrink-0"><Button variant="ghost" size="sm" onClick={() => onRespond('declined')} disabled={busy}>Decline</Button><Button variant="accent" size="sm" onClick={() => onRespond('accepted')} loading={busy}>Accept <ArrowRight className="size-3.5" aria-hidden /></Button></div></div>
}

function SearchSection({ search, setSearch, searchResults, busy, onAddFriend, onRespondRequest }: { search: string; setSearch: (value: string) => void; searchResults: SocialProfile[]; busy: string | null; onAddFriend: (profile: SocialProfile) => void; onRespondRequest: (id: string, response: 'accepted' | 'declined' | 'cancelled') => void }) {
  return <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2"><Search className="size-5 text-coral" aria-hidden /> Find learners</CardTitle>
      <CardDescription>Search by display name, then open a profile or manage the connection here.</CardDescription>
      <div className="relative mt-3"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden /><Input value={search} onChange={(event) => setSearch(event.target.value)} className="pl-9" placeholder="Search a name" aria-label="Search learners" /></div>
    </CardHeader>
    <CardContent>{search.trim().length < 2 ? <EmptyPanel icon={UserPlus} title="Find your next rival" detail="Type at least two letters to discover a learner." /> : searchResults.length ? <div className="grid gap-2">{searchResults.map((profile) => <div key={profile.id} className="flex items-center justify-between gap-3 rounded-md border-2 border-foreground/10 p-3">
      <Link href={`/profile/${profile.id}`} className="flex min-w-0 items-center gap-3 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-foreground"><Avatar name={profile.display_name} avatarId={profile.avatar_id} avatarUrl={profile.avatar_url} size="sm" /><span className="min-w-0"><span className="block truncate text-sm font-bold">{profile.display_name}</span><span className="block text-xs text-muted-foreground">{presenceLabel(profile)}</span></span></Link>
      <RelationshipButton profile={profile} busy={busy} onAddFriend={onAddFriend} onRespondRequest={onRespondRequest} />
    </div>)}</div> : <EmptyPanel icon={Search} title="No learners found" detail="Try a different display name." />}</CardContent>
  </Card>
}

function CircleSection({ friends, requests, busy, onRespondRequest, onChallenge }: { friends: Friendship[]; requests?: { incoming: Friendship[]; outgoing: Friendship[] }; busy: string | null; onRespondRequest: (id: string, response: 'accepted' | 'declined' | 'cancelled') => void; onChallenge: (friend: Friendship) => void }) {
  return <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Inbox className="size-5 text-coral" aria-hidden /> Friend requests</CardTitle><CardDescription>Accept trusted learners before inviting them to a duel.</CardDescription></CardHeader>
      <CardContent className="space-y-3">{requests?.incoming.length ? requests.incoming.map((request) => <div key={request.id} className="flex items-center justify-between gap-3 rounded-md border-2 border-coral/30 bg-coral/5 p-3"><Link href={`/profile/${request.other_user.id}`} className="flex min-w-0 items-center gap-2 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-foreground"><Avatar name={request.other_user.display_name} avatarId={request.other_user.avatar_id} avatarUrl={request.other_user.avatar_url} size="sm" /><p className="truncate text-sm font-bold">{request.other_user.display_name}</p></Link><div className="flex shrink-0 gap-1"><Button variant="ghost" size="sm" onClick={() => onRespondRequest(request.id, 'declined')} disabled={busy === `request-${request.id}`}>No</Button><Button variant="accent" size="sm" onClick={() => onRespondRequest(request.id, 'accepted')} loading={busy === `request-${request.id}`}>Accept</Button></div></div>) : <EmptyPanel icon={Inbox} title="No requests waiting" detail="New friend requests will appear here." />}</CardContent>
    </Card>
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Users className="size-5 text-mint" aria-hidden /> Your circle</CardTitle><CardDescription>Friends can challenge you privately. Presence is compact and optional.</CardDescription></CardHeader>
      <CardContent>{friends.length ? <div className="grid gap-2">{friends.map((friend) => <div key={friend.id} className="flex items-center justify-between gap-3 rounded-md border-2 border-foreground/10 p-3"><Link href={`/profile/${friend.other_user.id}`} className="flex min-w-0 items-center gap-3 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-foreground"><span className="relative"><Avatar name={friend.other_user.display_name} avatarId={friend.other_user.avatar_id} avatarUrl={friend.other_user.avatar_url} size="sm" />{friend.other_user.presence === 'online' || friend.other_user.presence === 'in_combat' ? <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-card bg-mint" /> : null}</span><span className="min-w-0"><span className="block truncate text-sm font-bold">{friend.other_user.display_name}</span><span className="block text-xs text-muted-foreground">{presenceLabel(friend.other_user)}</span></span></Link><Button variant="coral" size="sm" className="shrink-0" onClick={() => onChallenge(friend)} loading={busy === `challenge-${friend.other_user.id}`}><Swords className="size-3.5" aria-hidden /> Challenge</Button></div>)}</div> : <EmptyPanel icon={Users} title="No friends yet" detail="Search the Friends tab to build your circle." />}</CardContent>
    </Card>
  </div>
}

function RelationshipButton({ profile, busy, onAddFriend, onRespondRequest }: { profile: SocialProfile; busy: string | null; onAddFriend: (profile: SocialProfile) => void; onRespondRequest: (id: string, response: 'accepted' | 'declined' | 'cancelled') => void }) {
  const relationship = profile.relationship ?? 'none'
  const relationshipId = profile.relationship_id ?? null
  if (relationship === 'blocked') return <Button variant="ghost" size="sm" disabled>Unavailable</Button>
  if (relationship === 'friends') return <Button variant="outline" size="sm" disabled><UserCheck className="size-3.5" aria-hidden /> Friends</Button>
  if (relationship === 'incoming_pending') return <Button variant="accent" size="sm" className="shrink-0" onClick={() => { if (relationshipId) onRespondRequest(relationshipId, 'accepted') }} loading={busy === `request-${relationshipId}`} disabled={!relationshipId}><UserCheck className="size-3.5" aria-hidden /> Accept</Button>
  if (relationship === 'outgoing_pending') return <Button variant="outline" size="sm" className="shrink-0" onClick={() => { if (relationshipId) onRespondRequest(relationshipId, 'cancelled') }} loading={busy === `request-${relationshipId}`} disabled={!relationshipId}><Clock3 className="size-3.5" aria-hidden /> Cancel</Button>
  return <Button variant="outline" size="sm" className="shrink-0" onClick={() => onAddFriend(profile)} loading={busy === `add-${profile.id}`}><UserPlus className="size-3.5" aria-hidden /> Add</Button>
}

function HistorySection({ history, loading, userId, onOpen }: { history: CombatMatch[]; loading: boolean; userId?: string; onOpen: (match: CombatMatch) => void }) {
  return <Card><CardHeader><CardTitle className="flex items-center gap-2"><History className="size-5 text-coral" aria-hidden /> Match history</CardTitle><CardDescription>Your recent private duels, kept compact so learning stays the main thing.</CardDescription></CardHeader><CardContent>{loading ? <LoadingLine /> : history.length ? <div className="grid gap-2">{history.map((match) => { const me = match.players.find((player) => player.user_id === userId) ?? match.players.find((player) => player.user_id === match.host_id); const opponent = match.players.find((player) => player.user_id !== me?.user_id); return <button key={match.id} type="button" onClick={() => onOpen(match)} className="flex items-center justify-between gap-3 rounded-md border-2 border-foreground/10 p-3 text-left transition-colors hover:bg-muted"><div className="flex min-w-0 items-center gap-3"><Avatar name={opponent?.profile.display_name ?? 'Player'} avatarId={opponent?.profile.avatar_id} avatarUrl={opponent?.profile.avatar_url} size="sm" /><div className="min-w-0"><p className="truncate text-sm font-bold">vs {opponent?.profile.display_name ?? 'Player'}</p><p className="text-xs text-muted-foreground">{statusLabel(match)} · {match.question_count} questions · {match.wager_xp ? `${match.wager_xp} XP stake` : 'no stake'}</p></div></div><div className="flex items-center gap-3"><span className="text-sm font-heading font-bold">{me?.correct_count ?? 0}–{opponent?.correct_count ?? 0}</span><ChevronRight className="size-4 text-muted-foreground" aria-hidden /></div></button> })}</div> : <EmptyPanel icon={Clock3} title="No matches yet" detail="Your first duel will appear here when it ends." />}</CardContent></Card>
}

function RuleLine({ title, detail }: { title: string; detail: string }) { return <div><p className="font-heading text-sm font-bold text-foreground">{title}</p><p className="mt-0.5 text-xs leading-5">{detail}</p></div> }
function EmptyPanel({ icon: Icon, title, detail }: { icon: typeof Inbox; title: string; detail: string }) { return <div className="rounded-md border-2 border-dashed border-foreground/15 bg-muted/20 px-4 py-7 text-center"><Icon className="mx-auto size-6 text-muted-foreground" aria-hidden /><p className="mt-2 font-heading text-sm font-bold">{title}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div> }
function LoadingLine() { return <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" aria-hidden /> Loading Combat data…</div> }
