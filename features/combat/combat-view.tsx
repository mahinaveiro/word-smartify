'use client'

import * as React from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowRight,
  BookOpen,
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
  UserMinus,
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
import { useBooks } from '@/hooks/use-data'
import { cn } from '@/lib/utils'
import type { CombatInvite, CombatMatch, CombatPreset, CombatQuestionSource, Friendship, SocialProfile } from '@/types/database'
import {
  loadFriends,
  loadHistory,
  loadRequests,
  readCombat,
  postCombat,
  postSocial,
  searchSocialUsers,
} from './combat-api'

const PRESET_COPY: Record<CombatPreset, { title: string; detail: string; questions: string }> = {
  sprint: { title: 'Sprint', detail: 'Fast and focused', questions: '5 questions · 10s reply grace' },
  standard: { title: 'Standard', detail: 'A proper head-to-head', questions: '10 questions · 10s reply grace' },
  custom: { title: 'Custom', detail: 'Tune the length', questions: '3–20 questions · 10s reply grace' },
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
  const [section, setSection] = React.useState<'overview' | 'match' | 'friends' | 'circle'>('overview')
  const [createOpen, setCreateOpen] = React.useState(false)
  const [joinOpen, setJoinOpen] = React.useState(false)
  const [preset, setPreset] = React.useState<CombatPreset>('sprint')
  const [customQuestions, setCustomQuestions] = React.useState(8)
  const [wagerXp, setWagerXp] = React.useState<0 | 100>(0)
  const [questionSource, setQuestionSource] = React.useState<CombatQuestionSource>({ mode: 'mixed' })
  const [levelFrom, setLevelFrom] = React.useState(1)
  const [levelTo, setLevelTo] = React.useState(20)
  const [bookId, setBookId] = React.useState('')
  const [letter, setLetter] = React.useState('')
  const [friendToChallenge, setFriendToChallenge] = React.useState<Friendship | null>(null)
  const [joinCode, setJoinCode] = React.useState('')
  const [search, setSearch] = React.useState('')
  const [busy, setBusy] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [notice, setNotice] = React.useState<string | null>(null)

  const friends = useSWR(user ? ['combat-friends', user.id] : null, () => loadFriends())
  const requests = useSWR(user ? ['combat-requests', user.id] : null, () => loadRequests())
  const invites = useSWR<CombatInvite[]>(user ? ['combat-invites', user.id] : null, () => readCombat<CombatInvite[]>({ view: 'invites' }))
  const history = useSWR(user ? ['combat-history', user.id] : null, () => loadHistory())
  const searchResults = useSWR<SocialProfile[]>(user && search.trim().length >= 2 ? ['combat-search', user.id, search.trim()] : null, () => searchSocialUsers(search))
  const books = useBooks()

  React.useEffect(() => {
    if (!user) return
    void postSocial({ action: 'presence', state: 'in_combat' }).catch(() => undefined)
    return () => { void postSocial({ action: 'presence', state: 'online' }).catch(() => undefined) }
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
    if (questionSource.mode === 'book' && !bookId) {
      setError('Choose a book before creating a book-sourced match.')
      return
    }
    if (questionSource.mode === 'letter' && !letter) {
      setError('Choose a starting letter before creating a letter-sourced match.')
      return
    }
    const source: Record<string, unknown> = questionSource.mode === 'level'
      ? { mode: 'level', levelFrom: Math.min(levelFrom, levelTo), levelTo: Math.max(levelFrom, levelTo) }
      : questionSource.mode === 'book'
        ? { mode: 'book', ...(bookId ? { bookId } : {}) }
        : questionSource.mode === 'letter'
          ? { mode: 'letter', ...(letter ? { letter: letter.toLowerCase().slice(0, 1) } : {}) }
          : { mode: questionSource.mode }
    await run('create', async () => {
      const match = await postCombat<CombatMatch>({
        action: 'create',
        preset: selectedPreset,
        questionCount: selectedPreset === 'custom' ? customQuestions : selectedPreset === 'standard' ? 10 : 5,
        timeLimitSeconds: 15,
        wagerXp: selectedWager,
        questionSource: source,
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
    setQuestionSource({ mode: 'mixed' })
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

  const removeFriend = async (profile: SocialProfile) => {
    if (!profile.relationship_id) return
    await run(`remove-${profile.id}`, async () => {
      await postSocial({ action: 'remove_friend', friendshipId: profile.relationship_id })
      setNotice(`${profile.display_name} was removed from your friends.`)
      await Promise.all([friends.mutate(), requests.mutate(), searchResults.mutate()])
    })
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 pb-28 md:gap-6 md:pb-10">
      {section === 'overview' ? <section className="relative hidden overflow-hidden rounded-lg border-2 border-foreground bg-foreground px-5 py-6 text-primary-foreground shadow-brutal sm:block sm:px-7 sm:py-8">
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
      </section> : null}

      {error ? <div role="alert" className="flex items-start gap-2 rounded-md border-2 border-destructive bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive"><ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden />{error}<button className="ml-auto" onClick={() => setError(null)} aria-label="Dismiss error"><X className="size-4" aria-hidden /></button></div> : null}
      {notice ? <div role="status" className="flex items-start gap-2 rounded-md border-2 border-mint bg-mint/15 px-4 py-3 text-sm font-semibold"><Check className="mt-0.5 size-4 shrink-0" aria-hidden />{notice}</div> : null}

      <div className="flex justify-center overflow-x-auto" role="tablist" aria-label="Combat sections">
        <div className="flex min-w-max items-center gap-1 rounded-lg border-2 border-foreground/10 bg-muted/30 p-1">
          <TabButton active={section === 'overview'} onClick={() => setSection('overview')}>Overview</TabButton>
          <TabButton active={section === 'friends'} onClick={() => setSection('friends')} icon={Search}>Friends</TabButton>
          <TabButton active={section === 'match'} onClick={() => setSection('match')} icon={Swords}>Match</TabButton>
          <TabButton active={section === 'circle'} onClick={() => setSection('circle')} badge={requests.data?.incoming.length ?? 0} icon={Users}>Circle</TabButton>
        </div>
      </div>

      {section === 'overview' ? <div className="grid gap-5"><MatchSection onQuickDuel={() => void createMatch('sprint')} onCreate={() => setCreateOpen(true)} onJoin={() => setJoinOpen(true)} onChallenge={() => setSection('circle')} busy={busy} /><HistorySection history={history.data ?? []} loading={history.isLoading} userId={user?.id} onOpen={(match) => router.push(`/combat/${match.id}`)} /></div> : null}
      {section === 'match' ? <MatchSection onQuickDuel={() => void createMatch('sprint')} onCreate={() => setCreateOpen(true)} onJoin={() => setJoinOpen(true)} onChallenge={() => setSection('circle')} busy={busy} /> : null}

      {section === 'friends' ? <SearchSection search={search} setSearch={setSearch} searchResults={searchResults.data ?? []} busy={busy} onAddFriend={(profile) => void addFriend(profile)} onRemoveFriend={(profile) => void removeFriend(profile)} onRespondRequest={(id, response) => void respondToRequest(id, response)} /> : null}
      {section === 'circle' ? <CircleSection invites={invites.data ?? []} invitesLoading={invites.isLoading} friends={friends.data ?? []} requests={requests.data} busy={busy} onRespondInvite={(invite, response) => void respondToInvite(invite, response)} onRespondRequest={(id, response) => void respondToRequest(id, response)} onChallenge={(friend) => void challengeFriend(friend)} /> : null}

      <Modal className="max-h-[88svh] max-w-[min(92vw,30rem)] overflow-y-auto" open={createOpen} onClose={() => { setCreateOpen(false); setFriendToChallenge(null) }} title={friendToChallenge ? `Challenge ${friendToChallenge.other_user.display_name}` : 'Create a private match'} description={friendToChallenge ? 'Choose the rules together. They must accept the exact stake before joining.' : 'Pick the rules and question source before you enter the room.'} footer={<><Button variant="ghost" size="sm" onClick={() => { setCreateOpen(false); setFriendToChallenge(null) }}>Cancel</Button><Button size="sm" onClick={() => void createMatch(preset, wagerXp, friendToChallenge?.other_user.id)} loading={busy === 'create'} disabled={questionSource.mode === 'book' && !bookId || questionSource.mode === 'letter' && !letter}>{friendToChallenge ? 'Send challenge' : 'Create match'} <ArrowRight className="size-4" aria-hidden /></Button></>}>
        <div className="grid gap-3">
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {([{ mode: 'mixed', label: 'Mixed' }, { mode: 'level', label: 'Levels' }, { mode: 'book', label: 'Book' }, { mode: 'letter', label: 'Letter' }, { mode: 'smart', label: 'Smart' }] as const).map((source) => <button key={source.mode} type="button" onClick={() => setQuestionSource({ mode: source.mode })} className={cn('rounded-md border-2 border-foreground px-2 py-2 text-xs font-bold transition-colors', questionSource.mode === source.mode ? 'bg-mint shadow-brutal-sm' : 'bg-card hover:bg-muted')}>{source.label}</button>)}
          </div>
          {questionSource.mode === 'level' ? <div className="grid grid-cols-2 gap-2 rounded-md border-2 border-foreground/15 bg-muted/40 p-3"><div><Label htmlFor="combat-level-from">From level</Label><Input id="combat-level-from" type="number" min={1} max={104} value={levelFrom} onChange={(event) => setLevelFrom(Math.min(104, Math.max(1, Number(event.target.value) || 1)))} /></div><div><Label htmlFor="combat-level-to">To level</Label><Input id="combat-level-to" type="number" min={1} max={104} value={levelTo} onChange={(event) => setLevelTo(Math.min(104, Math.max(1, Number(event.target.value) || 1)))} /></div></div> : null}
          {questionSource.mode === 'book' ? <div className="rounded-md border-2 border-foreground/15 bg-muted/40 p-3"><Label htmlFor="combat-book">Book</Label><select id="combat-book" value={bookId} onChange={(event) => setBookId(event.target.value)} className="mt-1 h-10 w-full rounded-md border-2 border-foreground bg-background px-3 text-sm font-semibold outline-none focus-visible:outline-2 focus-visible:outline-foreground"><option value="">Choose a book</option>{(books.data ?? []).map((book) => <option key={book.id} value={book.id}>{book.name}</option>)}</select></div> : null}
          {questionSource.mode === 'letter' ? <div className="rounded-md border-2 border-foreground/15 bg-muted/40 p-3"><Label htmlFor="combat-letter">Starting letter</Label><Input id="combat-letter" value={letter} maxLength={1} onChange={(event) => setLetter(event.target.value.replace(/[^a-z]/gi, '').slice(0, 1).toUpperCase())} placeholder="A" className="mt-1 uppercase" /></div> : null}
          {questionSource.mode === 'smart' ? <p className="rounded-md border-2 border-mint/40 bg-mint/10 p-3 text-xs leading-5 text-muted-foreground"><BookOpen className="mr-1 inline size-3.5 text-mint-foreground" aria-hidden /> Smart mode selects only words both players have learned or mastered after they join. If there are not enough shared questions, the match will not start.</p> : null}
          {(Object.keys(PRESET_COPY) as CombatPreset[]).map((item) => <button key={item} type="button" onClick={() => setPreset(item)} className={cn('rounded-md border-2 border-foreground p-3 text-left transition-colors sm:p-4', preset === item ? 'bg-mint shadow-brutal-sm' : 'bg-card hover:bg-muted')}><div className="flex items-start justify-between gap-3"><div><p className="font-heading font-bold">{PRESET_COPY[item].title}</p><p className="mt-1 text-sm text-muted-foreground">{PRESET_COPY[item].detail}</p></div><span className="text-xs font-semibold text-muted-foreground">{PRESET_COPY[item].questions}</span></div></button>)}
          {preset === 'custom' ? <div className="rounded-md border-2 border-foreground/15 bg-muted/40 p-3"><Label htmlFor="combat-question-count">Questions</Label><Input id="combat-question-count" type="number" min={3} max={20} value={customQuestions} onChange={(event) => setCustomQuestions(Math.min(20, Math.max(3, Number(event.target.value) || 3)))} /></div> : null}
          <div className="grid gap-2 rounded-md border-2 border-foreground/15 bg-muted/40 p-3"><p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Stake</p><div className="grid gap-2 sm:grid-cols-2"><button type="button" onClick={() => setWagerXp(0)} className={cn('rounded-md border-2 px-3 py-3 text-left', wagerXp === 0 ? 'border-foreground bg-card shadow-brutal-sm' : 'border-foreground/15 bg-background hover:bg-card')}><p className="text-sm font-bold">Practice match</p><p className="mt-1 text-xs text-muted-foreground">No XP at risk</p></button><button type="button" onClick={() => setWagerXp(100)} className={cn('rounded-md border-2 px-3 py-3 text-left', wagerXp === 100 ? 'border-foreground bg-mint/25 shadow-brutal-sm' : 'border-foreground/15 bg-background hover:bg-mint/10')}><p className="flex items-center gap-1.5 text-sm font-bold"><Coins className="size-4 text-coral" aria-hidden />100 XP wager</p><p className="mt-1 text-xs text-muted-foreground">Winner receives 200 XP</p></button></div><p className="text-xs leading-5 text-muted-foreground">The stake is reserved before play. Your opponent sees and accepts the exact amount before joining. A draw, cancellation, expiry, or protected no-contest refunds both players.</p></div><p className="text-xs leading-5 text-muted-foreground">Questions are selected from the shared eligible pool. The correct answer is never sent to your device during the match.</p>
          <p className="text-xs leading-5 text-muted-foreground">There is no normal countdown. After either player submits, the other has 10 seconds to answer before the server closes the round.</p>
        </div>
      </Modal>

      <Modal open={joinOpen} onClose={() => setJoinOpen(false)} title="Join by private code" description="Ask your friend for the code shown in their waiting room." footer={<><Button variant="ghost" size="sm" onClick={() => setJoinOpen(false)}>Cancel</Button><Button size="sm" onClick={() => void joinMatch()} loading={busy === 'join'} disabled={joinCode.trim().length < 6}>Join match <ArrowRight className="size-4" aria-hidden /></Button></>}>
        <div className="space-y-3"><Label htmlFor="combat-join-code">Match code</Label><Input id="combat-join-code" value={joinCode} maxLength={6} autoComplete="off" className="text-center font-heading text-2xl font-black uppercase tracking-[0.25em]" placeholder="ABC123" onChange={(event) => setJoinCode(event.target.value.replace(/[^a-z0-9]/gi, '').slice(0, 6).toUpperCase())} /><p className="text-xs text-muted-foreground">Private matches expire after 30 minutes if nobody joins.</p></div>
      </Modal>

    </div>
  )
}

function MatchSection({ onQuickDuel, onCreate, onJoin, onChallenge, busy }: { onQuickDuel: () => void; onCreate: () => void; onJoin: () => void; onChallenge: () => void; busy: string | null }) {
  return <div className="grid gap-4">
    <div className="rounded-lg border-2 border-foreground bg-muted/30 px-4 py-4 sm:px-6 sm:py-5"><p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Match desk</p><h2 className="mt-1 font-heading text-2xl font-black">Choose your next duel.</h2><p className="mt-1 max-w-xl text-sm text-muted-foreground">Start a quick sprint, tune the rules, join a private room, or challenge someone from your circle.</p></div>
    <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
      <ActionCard icon={Zap} title="Quick duel" detail="Start a 5-question Sprint" accent="coral" onClick={onQuickDuel} loading={busy === 'create'} />
      <ActionCard icon={Swords} title="Create match" detail="Choose the pace yourself" accent="mint" onClick={onCreate} />
      <ActionCard icon={Link2} title="Join by code" detail="Enter a private 6-character code" accent="ink" onClick={onJoin} />
      <ActionCard icon={Users} title="Challenge a friend" detail="Invite from your trusted circle" accent="sand" onClick={onChallenge} />
    </div>
  </div>
}

function ActionCard({ icon: Icon, title, detail, accent, onClick, loading }: { icon: typeof Swords; title: string; detail: string; accent: 'coral' | 'mint' | 'ink' | 'sand'; onClick: () => void; loading?: boolean }) {
  const colors = { coral: 'bg-coral/15', mint: 'bg-mint/15', ink: 'bg-foreground text-primary-foreground', sand: 'bg-muted' }
  return <button type="button" onClick={onClick} disabled={loading} className={cn('group rounded-lg border-2 border-foreground p-3 text-left shadow-brutal transition-transform hover:-translate-y-0.5 disabled:opacity-70 sm:p-4', colors[accent])}><span className="flex items-start justify-between gap-2"><span className={cn('grid size-9 place-items-center rounded-md border-2 border-foreground bg-card text-foreground shadow-brutal-sm sm:size-10', accent === 'ink' && 'bg-primary text-primary-foreground')}><Icon className="size-4 sm:size-5" aria-hidden /></span>{loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />}</span><p className="mt-3 font-heading text-sm font-bold sm:mt-4 sm:text-base">{title}</p><p className={cn('mt-1 text-[11px] leading-4 sm:text-xs', accent === 'ink' ? 'text-primary-foreground/70' : 'text-muted-foreground')}>{detail}</p></button>
}

function TabButton({ active, badge, icon: Icon, children, onClick }: { active: boolean; badge?: number; icon?: typeof Swords; children: React.ReactNode; onClick: () => void }) {
  return <button type="button" role="tab" aria-selected={active} onClick={onClick} className={cn('inline-flex items-center gap-1.5 rounded-md px-2.5 py-2 text-xs font-heading font-bold transition-colors sm:px-3 sm:text-sm', active ? 'bg-foreground text-primary-foreground shadow-brutal-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}>{Icon ? <Icon className="size-3.5 sm:size-4" aria-hidden /> : null}<span>{children}</span>{badge ? <span className="rounded-full bg-coral px-1.5 py-0.5 text-[10px] text-coral-foreground">{badge}</span> : null}</button>
}

function InviteRow({ invite, busy, onRespond }: { invite: CombatInvite; busy: boolean; onRespond: (response: 'accepted' | 'declined') => void }) {
  return <div className="flex flex-col gap-3 rounded-md border-2 border-foreground/15 bg-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 items-center gap-3"><Avatar name={invite.sender.display_name} avatarId={invite.sender.avatar_id} avatarUrl={invite.sender.avatar_url} size="sm" /><div className="min-w-0"><p className="truncate text-sm font-bold">{invite.sender.display_name} challenged you</p><p className="text-xs text-muted-foreground">{invite.match?.question_count ?? 5} questions · private Sprint{invite.match?.wager_xp ? ` · ${invite.match.wager_xp} XP stake each` : ' · no stake'}</p></div></div><div className="flex gap-2 sm:shrink-0"><Button variant="ghost" size="sm" onClick={() => onRespond('declined')} disabled={busy}>Decline</Button><Button variant="accent" size="sm" onClick={() => onRespond('accepted')} loading={busy}>Accept <ArrowRight className="size-3.5" aria-hidden /></Button></div></div>
}

function SearchSection({ search, setSearch, searchResults, busy, onAddFriend, onRemoveFriend, onRespondRequest }: { search: string; setSearch: (value: string) => void; searchResults: SocialProfile[]; busy: string | null; onAddFriend: (profile: SocialProfile) => void; onRemoveFriend: (profile: SocialProfile) => void; onRespondRequest: (id: string, response: 'accepted' | 'declined' | 'cancelled') => void }) {
  return <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2"><Search className="size-5 text-coral" aria-hidden /> Find learners</CardTitle>
      <CardDescription>Search by display name, then open a profile or manage the connection here.</CardDescription>
      <div className="relative mt-3"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden /><Input value={search} onChange={(event) => setSearch(event.target.value)} className="pl-9" placeholder="Search a name" aria-label="Search learners" /></div>
    </CardHeader>
    <CardContent>{search.trim().length < 2 ? <EmptyPanel icon={UserPlus} title="Find your next rival" detail="Type at least two letters to discover a learner." /> : searchResults.length ? <div className="grid gap-2">{searchResults.map((profile) => <div key={profile.id} className="flex min-w-0 items-center gap-3 rounded-md border-2 border-foreground/10 p-3">
      <Avatar name={profile.display_name} avatarId={profile.avatar_id} avatarUrl={profile.avatar_url} size="sm" /><div className="flex min-w-0 flex-1 items-center gap-2"><Link href={`/profile/${profile.id}`} className="min-w-0 flex-1 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-foreground"><span className="block truncate text-sm font-bold">{profile.display_name}</span><span className="block text-xs text-muted-foreground">{presenceLabel(profile)}</span></Link><RelationshipButton profile={profile} busy={busy} onAddFriend={onAddFriend} onRemoveFriend={onRemoveFriend} onRespondRequest={onRespondRequest} /></div>
    </div>)}</div> : <EmptyPanel icon={Search} title="No learners found" detail="Try a different display name." />}</CardContent>
  </Card>
}

function CircleSection({ invites, invitesLoading, friends, requests, busy, onRespondInvite, onRespondRequest, onChallenge }: { invites: CombatInvite[]; invitesLoading: boolean; friends: Friendship[]; requests?: { incoming: Friendship[]; outgoing: Friendship[] }; busy: string | null; onRespondInvite: (invite: CombatInvite, response: 'accepted' | 'declined') => void; onRespondRequest: (id: string, response: 'accepted' | 'declined' | 'cancelled') => void; onChallenge: (friend: Friendship) => void }) {
  return <div className="grid gap-5">
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Users className="size-5 text-mint" aria-hidden /> Your circle</CardTitle><CardDescription>Friends can challenge you privately. Presence is compact and optional.</CardDescription></CardHeader>
      <CardContent>{friends.length ? <div className="grid gap-2">{friends.map((friend) => <div key={friend.id} className="flex items-center justify-between gap-3 rounded-md border-2 border-foreground/10 p-3"><Link href={`/profile/${friend.other_user.id}`} className="flex min-w-0 items-center gap-3 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-foreground"><span className="relative"><Avatar name={friend.other_user.display_name} avatarId={friend.other_user.avatar_id} avatarUrl={friend.other_user.avatar_url} size="sm" />{friend.other_user.presence === 'online' || friend.other_user.presence === 'in_combat' ? <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-card bg-mint" /> : null}</span><span className="min-w-0"><span className="block truncate text-sm font-bold">{friend.other_user.display_name}</span><span className="block text-xs text-muted-foreground">{presenceLabel(friend.other_user)}</span></span></Link><Button variant="coral" size="sm" className="shrink-0" onClick={() => onChallenge(friend)} loading={busy === `challenge-${friend.other_user.id}`}><Swords className="size-3.5" aria-hidden /> Challenge</Button></div>)}</div> : <EmptyPanel icon={Users} title="No friends yet" detail="Search the Friends tab to build your circle." />}</CardContent>
    </Card>
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3"><div><CardTitle className="flex items-center gap-2"><Inbox className="size-5 text-coral" aria-hidden /> Invitations</CardTitle><CardDescription>Friend challenges stay private until you accept.</CardDescription></div><span className="rounded-full bg-muted px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{invites.length}</span></CardHeader>
      <CardContent>{invitesLoading ? <LoadingLine /> : invites.length ? <div className="grid gap-3">{invites.slice(0, 3).map((invite) => <InviteRow key={invite.id} invite={invite} busy={busy === `invite-${invite.id}`} onRespond={(response) => onRespondInvite(invite, response)} />)}</div> : <EmptyPanel icon={Inbox} title="No invitations" detail="Friend challenges will appear here." />}</CardContent>
    </Card>
    <details className="group rounded-lg border-2 border-foreground/15 bg-card">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 font-heading font-bold [&::-webkit-details-marker]:hidden"><span className="flex items-center gap-2"><Inbox className="size-5 text-coral" aria-hidden /> Friend requests {requests?.incoming.length ? <span className="rounded-full bg-coral px-1.5 py-0.5 text-[10px] text-coral-foreground">{requests.incoming.length}</span> : null}</span><span className="text-xs text-muted-foreground transition-transform group-open:rotate-180">⌄</span></summary>
      <div className="border-t-2 border-foreground/10 p-4"><p className="mb-3 text-sm text-muted-foreground">Accept trusted learners before inviting them to a duel.</p>{requests?.incoming.length ? <div className="grid gap-2">{requests.incoming.map((request) => <div key={request.id} className="flex items-center justify-between gap-3 rounded-md border-2 border-coral/30 bg-coral/5 p-3"><Link href={`/profile/${request.other_user.id}`} className="flex min-w-0 items-center gap-2 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-foreground"><Avatar name={request.other_user.display_name} avatarId={request.other_user.avatar_id} avatarUrl={request.other_user.avatar_url} size="sm" /><p className="truncate text-sm font-bold">{request.other_user.display_name}</p></Link><div className="flex shrink-0 gap-1"><Button variant="ghost" size="sm" onClick={() => onRespondRequest(request.id, 'declined')} disabled={busy === `request-${request.id}`}>No</Button><Button variant="accent" size="sm" onClick={() => onRespondRequest(request.id, 'accepted')} loading={busy === `request-${request.id}`}>Accept</Button></div></div>)}</div> : <EmptyPanel icon={Inbox} title="No requests waiting" detail="New friend requests will appear here." />}</div>
    </details>
  </div>
}

function RelationshipButton({ profile, busy, onAddFriend, onRemoveFriend, onRespondRequest }: { profile: SocialProfile; busy: string | null; onAddFriend: (profile: SocialProfile) => void; onRemoveFriend: (profile: SocialProfile) => void; onRespondRequest: (id: string, response: 'accepted' | 'declined' | 'cancelled') => void }) {
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const relationship = profile.relationship ?? 'none'
  const relationshipId = profile.relationship_id ?? null
  if (relationship === 'blocked') return <Button variant="ghost" size="sm" disabled>Unavailable</Button>
  const compactClass = 'size-8 shrink-0 rounded-full p-0 sm:h-8 sm:w-auto sm:rounded-md sm:px-2.5'
  if (relationship === 'friends') return <>
    <Button variant="outline" size="sm" className={compactClass} aria-label={`Unfriend ${profile.display_name}`} onClick={() => setConfirmOpen(true)} loading={busy === `remove-${profile.id}`} disabled={!relationshipId || busy === `remove-${profile.id}`}><UserMinus className="size-3.5" aria-hidden /><span className="hidden sm:inline">Unfriend</span></Button>
    <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title={`Unfriend ${profile.display_name}?`} description="They will be removed from your friends list. You can send a new request later." footer={<><Button variant="ghost" size="sm" onClick={() => setConfirmOpen(false)}>Keep friend</Button><Button variant="coral" size="sm" onClick={() => { setConfirmOpen(false); onRemoveFriend(profile) }} loading={busy === `remove-${profile.id}`}>Unfriend <UserMinus className="size-3.5" aria-hidden /></Button></>}>
      <p className="text-sm text-muted-foreground">This only removes the friendship. It does not block the learner or affect your Combat history.</p>
    </Modal>
  </>
  if (relationship === 'incoming_pending') return <Button variant="accent" size="sm" className={compactClass} aria-label={`Accept ${profile.display_name}'s friend request`} onClick={() => { if (relationshipId) onRespondRequest(relationshipId, 'accepted') }} loading={busy === `request-${relationshipId}`} disabled={!relationshipId}><UserCheck className="size-3.5" aria-hidden /><span className="hidden sm:inline">Accept</span></Button>
  if (relationship === 'outgoing_pending') return <Button variant="outline" size="sm" className={compactClass} aria-label={`Cancel friend request to ${profile.display_name}`} onClick={() => { if (relationshipId) onRespondRequest(relationshipId, 'cancelled') }} loading={busy === `request-${relationshipId}`} disabled={!relationshipId}><Clock3 className="size-3.5" aria-hidden /><span className="hidden sm:inline">Cancel</span></Button>
  return <Button variant="outline" size="sm" className={compactClass} aria-label={`Add ${profile.display_name} as a friend`} onClick={() => onAddFriend(profile)} loading={busy === `add-${profile.id}`}><UserPlus className="size-3.5" aria-hidden /><span className="hidden sm:inline">Add</span></Button>
}

function HistorySection({ history, loading, userId, onOpen }: { history: CombatMatch[]; loading: boolean; userId?: string; onOpen: (match: CombatMatch) => void }) {
  return <Card><CardHeader><CardTitle className="flex items-center gap-2"><History className="size-5 text-coral" aria-hidden /> Match history</CardTitle><CardDescription>Your recent private duels, kept compact so learning stays the main thing.</CardDescription></CardHeader><CardContent>{loading ? <LoadingLine /> : history.length ? <div className="grid gap-2">{history.map((match) => { const me = match.players.find((player) => player.user_id === userId) ?? match.players.find((player) => player.user_id === match.host_id); const opponent = match.players.find((player) => player.user_id !== me?.user_id); return <button key={match.id} type="button" onClick={() => onOpen(match)} className="flex items-center justify-between gap-3 rounded-md border-2 border-foreground/10 p-3 text-left transition-colors hover:bg-muted"><div className="flex min-w-0 items-center gap-3"><Avatar name={opponent?.profile.display_name ?? 'Player'} avatarId={opponent?.profile.avatar_id} avatarUrl={opponent?.profile.avatar_url} size="sm" /><div className="min-w-0"><p className="truncate text-sm font-bold">vs {opponent?.profile.display_name ?? 'Player'}</p><p className="text-xs text-muted-foreground">{statusLabel(match)} · {match.question_count} questions · {match.wager_xp ? `${match.wager_xp} XP stake` : 'no stake'}</p></div></div><div className="flex items-center gap-3"><span className="text-sm font-heading font-bold">{me?.correct_count ?? 0}–{opponent?.correct_count ?? 0}</span><ChevronRight className="size-4 text-muted-foreground" aria-hidden /></div></button> })}</div> : <EmptyPanel icon={Clock3} title="No matches yet" detail="Your first duel will appear here when it ends." />}</CardContent></Card>
}

function RuleLine({ title, detail }: { title: string; detail: string }) { return <div><p className="font-heading text-sm font-bold text-foreground">{title}</p><p className="mt-0.5 text-xs leading-5">{detail}</p></div> }
function EmptyPanel({ icon: Icon, title, detail }: { icon: typeof Inbox; title: string; detail: string }) { return <div className="rounded-md border-2 border-dashed border-foreground/15 bg-muted/20 px-4 py-7 text-center"><Icon className="mx-auto size-6 text-muted-foreground" aria-hidden /><p className="mt-2 font-heading text-sm font-bold">{title}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div> }
function LoadingLine() { return <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" aria-hidden /> Loading Combat data…</div> }
