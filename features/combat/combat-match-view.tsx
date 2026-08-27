'use client'

import * as React from 'react'
import useSWR from 'swr'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Coins,
  ClipboardCopy,
  Crown,
  Loader2,
  LogOut,
  RefreshCw,
  Share2,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Swords,
  TimerReset,
  Trophy,
  Users,
  XCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Modal } from '@/components/ui/modal'
import { Avatar } from '@/features/shared/avatar'
import { useAuth } from '@/features/auth/auth-provider'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { CombatMatch, CombatQuestion, CombatResult } from '@/types/database'
import { loadMatch, loadMatchQuestion, loadMatchResult, postCombat } from './combat-api'

export function CombatMatchView({ matchId }: { matchId: string }) {
  const router = useRouter()
  const { user } = useAuth()
  const [error, setError] = React.useState<string | null>(null)
  const [result, setResult] = React.useState<CombatResult | null>(null)
  const [selected, setSelected] = React.useState<string | null>(null)
  const [selectedPosition, setSelectedPosition] = React.useState<number | null>(null)
  const [submittedPosition, setSubmittedPosition] = React.useState<number | null>(null)
  const [busy, setBusy] = React.useState<string | null>(null)
  const [showReport, setShowReport] = React.useState(false)
  const [remainingMs, setRemainingMs] = React.useState<number | null>(null)
  const [copied, setCopied] = React.useState(false)
  const [isOffline, setIsOffline] = React.useState(false)
  const match = useSWR<CombatMatch>(['combat-match', matchId], () => loadMatch(matchId), { refreshInterval: 5000, revalidateOnFocus: true })
  const currentMatch = match.data
  const currentPosition = currentMatch?.current_question_index ?? 0
  const question = useSWR<CombatQuestion | null>(currentMatch?.status === 'active' ? ['combat-question', matchId, currentPosition] : null, () => loadMatchQuestion(matchId, currentPosition), { revalidateOnFocus: false })
  const closedMatch = currentMatch && ['completed', 'draw', 'cancelled', 'expired', 'abandoned', 'no_contest'].includes(currentMatch.status)
  const closedResult = useSWR<CombatResult | null>(closedMatch ? ['combat-result', matchId] : null, () => loadMatchResult(matchId), { revalidateOnFocus: false })

  const refresh = React.useCallback(() => { void match.mutate() }, [match])

  React.useEffect(() => {
    const updateConnection = () => setIsOffline(!window.navigator.onLine)
    updateConnection()
    window.addEventListener('online', updateConnection)
    window.addEventListener('offline', updateConnection)
    return () => {
      window.removeEventListener('online', updateConnection)
      window.removeEventListener('offline', updateConnection)
    }
  }, [])

  React.useEffect(() => {
    const client = createClient()
    const channel = client
      .channel(`combat-match-${matchId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'combat_matches', filter: `id=eq.${matchId}` }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'combat_match_players', filter: `match_id=eq.${matchId}` }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'combat_match_answers', filter: `match_id=eq.${matchId}` }, refresh)
      .subscribe()
    return () => { void client.removeChannel(channel) }
  }, [matchId, refresh])

  React.useEffect(() => {
    if (currentMatch?.status !== 'active' || !(currentMatch.current_question_started_at ?? currentMatch.started_at)) return
    const update = () => {
      const roundStart = new Date((currentMatch.current_question_started_at ?? currentMatch.started_at) as string).getTime()
      setRemainingMs(Math.max(0, roundStart + currentMatch.time_limit_seconds * 1000 - Date.now()))
    }
    update()
    const interval = window.setInterval(update, 200)
    return () => window.clearInterval(interval)
  }, [currentMatch?.current_question_started_at, currentMatch?.status, currentMatch?.started_at, currentMatch?.time_limit_seconds, currentPosition])

  const selectedForQuestion = selectedPosition === currentPosition ? selected : null
  const hasSubmittedForQuestion = submittedPosition === currentPosition

  const run = React.useCallback(async (key: string, action: () => Promise<void>) => {
    setBusy(key)
    setError(null)
    try { await action() } catch (actionError) { setError(actionError instanceof Error ? actionError.message : 'Something went wrong.') } finally { setBusy(null) }
  }, [])

  const toggleReady = () => {
    if (!currentMatch) return
    const me = currentMatch.players.find((player) => player.user_id === user?.id)
    const myReady = me?.is_ready ?? false
    void run('ready', async () => { await postCombat({ action: 'ready', matchId, ready: !myReady }); await match.mutate() })
  }

  const start = () => void run('start', async () => { await postCombat({ action: 'start', matchId }); await match.mutate() })

  const answer = React.useCallback((answerValue: string | null) => {
    if (!currentMatch || !question.data || busy === 'answer' || hasSubmittedForQuestion) return
    setSelected(answerValue)
    setSelectedPosition(currentPosition)
    setSubmittedPosition(currentPosition)
    const responseTimeMs = Math.max(0, currentMatch.time_limit_seconds * 1000 - (remainingMs ?? currentMatch.time_limit_seconds * 1000))
    void run('answer', async () => {
      const response = await postCombat<{ next_position: number; match: CombatMatch; result: CombatResult | null }>({ action: 'answer', matchId, questionId: question.data?.question_id, selectedAnswer: answerValue, responseTimeMs })
      if (response.result) setResult(response.result)
      await match.mutate(response.match, false)
    })
  }, [busy, currentMatch, currentPosition, hasSubmittedForQuestion, match, matchId, question.data, remainingMs, run])

  const answerRef = React.useRef<(answerValue: string | null) => void>(() => undefined)
  React.useEffect(() => { answerRef.current = answer }, [answer])

  React.useEffect(() => {
    if (currentMatch?.status !== 'active' || remainingMs !== 0 || !question.data || hasSubmittedForQuestion || busy !== null) return
    const timeout = window.setTimeout(() => answerRef.current(null), 0)
    return () => window.clearTimeout(timeout)
  }, [busy, currentMatch?.status, currentPosition, hasSubmittedForQuestion, question.data, question.data?.id, remainingMs])

  const copyCode = async () => {
    if (!currentMatch) return
    await navigator.clipboard?.writeText(currentMatch.join_code).catch(() => undefined)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1400)
  }

  if (match.isLoading && !currentMatch) return <div className="flex min-h-[45vh] items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" aria-hidden /> Loading match room…</div>
  if (!currentMatch) return <div className="mx-auto max-w-md py-12"><Card><CardContent className="p-6 text-center"><XCircle className="mx-auto size-8 text-destructive" aria-hidden /><h1 className="mt-3 font-heading text-xl font-bold">Match unavailable</h1><p className="mt-2 text-sm text-muted-foreground">This room may have expired or you may no longer be a participant.</p><Button className="mt-5" onClick={() => router.push('/combat')}>Back to Combat</Button></CardContent></Card></div>
  const rematch = () => void run('rematch', async () => {
    if (!currentMatch) return
    const rematchMatch = await postCombat<CombatMatch>({ action: 'create', preset: currentMatch.preset, questionCount: currentMatch.question_count, timeLimitSeconds: currentMatch.time_limit_seconds, wagerXp: currentMatch.wager_xp })
    const opponentId = currentMatch.players.find((player) => player.user_id !== user?.id)?.user_id
    if (opponentId) await postCombat({ action: 'invite_friend', matchId: rematchMatch.id, recipientId: opponentId })
    router.push(`/combat/${rematchMatch.id}`)
  })

  if (result) return <CombatResultPanel result={result} onBack={() => router.push('/combat')} onRematch={rematch} rematchBusy={busy === 'rematch'} />
  if (closedResult.data) return <CombatResultPanel result={closedResult.data} onBack={() => router.push('/combat')} onRematch={rematch} rematchBusy={busy === 'rematch'} />

  const isHost = currentMatch.host_id === user?.id
  const myPlayer = currentMatch.players.find((player) => player.user_id === user?.id) ?? currentMatch.players[0]
  const opponent = currentMatch.players.find((player) => player.id !== myPlayer?.id)
  const otherPlayer = opponent
  const bothReady = currentMatch.players.length === 2 && currentMatch.players.every((player) => player.is_ready)

  return <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 pb-28 md:gap-6 md:pb-10">
    <div className="flex items-center justify-between gap-3"><Button variant="ghost" size="sm" onClick={() => router.push('/combat')}><ArrowLeft className="size-4" aria-hidden /> Combat</Button><div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground"><span className={cn('size-2 rounded-full', isOffline ? 'bg-coral' : 'bg-mint')} /> {isOffline ? 'Reconnecting…' : 'Live'} <span className="hidden sm:inline">· Private room</span></div></div>
    {isOffline ? <div role="status" className="rounded-md border-2 border-coral/40 bg-coral/10 px-4 py-3 text-sm font-semibold text-coral-foreground">You are offline. The shared timer keeps running, and the room will refresh when your connection returns.</div> : null}{error ? <div role="alert" className="flex items-start gap-2 rounded-md border-2 border-destructive bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive"><ShieldAlert className="size-4 shrink-0" aria-hidden />{error}<button className="ml-auto" onClick={() => setError(null)} aria-label="Dismiss error"><XCircle className="size-4" aria-hidden /></button></div> : null}
    {currentMatch.status === 'waiting' || currentMatch.status === 'ready' ? <LobbyPanel match={currentMatch} userId={user?.id} isHost={isHost} opponent={opponent} bothReady={bothReady} busy={busy} copied={copied} onCopy={() => void copyCode()} onReady={toggleReady} onStart={start} onCancel={() => void run('cancel', async () => { await postCombat({ action: 'cancel', matchId }); router.push('/combat') })} /> : null}
    {currentMatch.status === 'active' ? <ActiveMatchPanel match={currentMatch} question={question.data ?? null} loading={question.isLoading} selected={selectedForQuestion} remainingMs={currentMatch.status === 'active' ? remainingMs : null} onAnswer={answer} hasSubmitted={hasSubmittedForQuestion} onRefresh={refresh} onReport={() => setShowReport(true)} busy={busy} myPlayer={myPlayer} otherPlayer={otherPlayer} /> : null}
    {['completed', 'draw', 'cancelled', 'expired', 'abandoned', 'no_contest'].includes(currentMatch.status) ? <FinishedPanel match={currentMatch} onBack={() => router.push('/combat')} /> : null}
    <Modal open={showReport} onClose={() => setShowReport(false)} title="Report this match" description="Use this for a broken question, connection issue, cheating concern, or harassment."><ReportForm matchId={matchId} onDone={() => setShowReport(false)} /></Modal>
  </div>
}

function LobbyPanel({ match, userId, isHost, opponent, bothReady, busy, copied, onCopy, onReady, onStart, onCancel }: { match: CombatMatch; userId?: string; isHost: boolean; opponent?: CombatMatch['players'][number]; bothReady: boolean; busy: string | null; copied: boolean; onCopy: () => void; onReady: () => void; onStart: () => void; onCancel: () => void }) {
  const me = match.players.find((player) => player.user_id === userId) ?? match.players[0]
  const wagered = match.wager_xp === 100
  return <><section className="rounded-lg border-2 border-foreground bg-foreground px-5 py-6 text-primary-foreground shadow-brutal sm:px-8 sm:py-8"><div className="flex flex-col items-center text-center"><span className="grid size-14 place-items-center rounded-full border-2 border-primary-foreground/30 bg-coral text-coral-foreground shadow-brutal-sm"><SwordsIcon /></span><p className="mt-4 text-xs font-bold uppercase tracking-[0.16em] text-primary-foreground/65">{match.status === 'ready' ? 'Both players found' : 'Waiting room'}</p><h1 className="mt-2 font-heading text-3xl font-black">{match.status === 'ready' ? 'Lock in your readiness' : 'Bring a friend into the ring'}</h1><p className="mt-2 max-w-md text-sm leading-6 text-primary-foreground/70">{match.status === 'ready' ? 'The match starts only after both players are ready.' : 'Share this private code. It expires in 30 minutes and is never listed publicly.'}</p><div className={cn('mt-5 flex max-w-md items-center gap-3 rounded-md border-2 px-3 py-2 text-left text-xs', wagered ? 'border-mint/40 bg-mint/10 text-primary-foreground' : 'border-primary-foreground/15 bg-primary-foreground/10 text-primary-foreground/75')}><Coins className={cn('size-4 shrink-0', wagered ? 'text-mint' : 'text-primary-foreground/55')} aria-hidden /><div><p className="font-bold">{wagered ? '100 XP wager each' : 'Practice match'}</p><p className="mt-0.5 text-primary-foreground/65">{wagered ? 'Winner receives 200 XP. Draws, cancellations, and protected no-contests refund both stakes.' : 'No XP is at risk. Focus on building your vocabulary.'}</p></div></div>{isHost ? <button type="button" onClick={onCopy} className="mt-5 inline-flex items-center gap-2 rounded-md border-2 border-primary-foreground/30 bg-primary-foreground/10 px-5 py-3 font-heading text-2xl font-black tracking-[0.24em] text-primary-foreground transition-colors hover:bg-primary-foreground/20" aria-label="Copy private match code">{match.join_code}<span className="ml-1 text-primary-foreground/60">{copied ? <Check className="size-5" aria-hidden /> : <ClipboardCopy className="size-5" aria-hidden />}</span></button> : <p className="mt-5 text-sm font-semibold text-primary-foreground/70">Private match · {match.question_count} questions</p>}</div></section><div className="grid gap-4 sm:grid-cols-2"><PlayerLobbyCard player={me} label="Host" /><PlayerLobbyCard player={opponent} label="Opponent" empty={!opponent} /></div><Card><CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-heading font-bold">{opponent ? (bothReady ? 'Both players are ready' : 'Ready when you are') : 'Waiting for the second player'}</p><p className="text-sm text-muted-foreground">{opponent ? 'Your answers will use the same question set and shared round deadlines.' : 'Send the code to a friend, then stay on this screen.'}</p>{wagered ? <p className="mt-1 text-xs font-semibold text-mint-foreground">{match.wager_status === 'reserved' ? 'Both stakes are reserved safely.' : 'Stake is being secured before play begins.'}</p> : null}</div><div className="flex flex-wrap gap-2"><Button variant="ghost" size="sm" onClick={onCancel} disabled={!isHost || busy === 'cancel'}>{isHost ? <><LogOut className="size-4" aria-hidden /> Cancel</> : 'Leave'}</Button>{opponent ? <Button variant="accent" size="sm" onClick={onReady} loading={busy === 'ready'}><Check className="size-4" aria-hidden />{me?.is_ready ? 'Unready' : 'Ready'}</Button> : null}{isHost && bothReady ? <Button size="sm" onClick={onStart} loading={busy === 'start'}>Start match <Sparkles className="size-4" aria-hidden /></Button> : null}</div></CardContent></Card></>
}

function PlayerLobbyCard({ player, label, empty }: { player?: CombatMatch['players'][number]; label: string; empty?: boolean }) { return <Card className={cn('min-h-28', empty && 'border-dashed bg-muted/20 shadow-none')}><CardContent className="flex h-full items-center gap-3 p-4">{player ? <><Avatar name={player.profile.display_name} avatarId={player.profile.avatar_id} avatarUrl={player.profile.avatar_url} size="md" /><div className="min-w-0"><p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</p><p className="truncate font-heading font-bold">{player.profile.display_name}</p><p className={cn('mt-1 text-xs font-semibold', player.is_ready ? 'text-mint-foreground' : 'text-muted-foreground')}>{player.is_ready ? 'Ready' : 'Not ready'}</p></div></> : <div className="flex items-center gap-3 text-muted-foreground"><span className="grid size-11 place-items-center rounded-full border-2 border-dashed border-foreground/20"><Users className="size-5" aria-hidden /></span><div><p className="text-xs font-bold uppercase tracking-wide">Opponent</p><p className="text-sm font-semibold">Waiting to join</p></div></div>}</CardContent></Card> }

function ActiveMatchPanel({ match, question, loading, selected, hasSubmitted, remainingMs, onAnswer, onRefresh, onReport, busy, myPlayer, otherPlayer }: { match: CombatMatch; question: CombatQuestion | null; loading: boolean; selected: string | null; hasSubmitted: boolean; remainingMs: number | null; onAnswer: (answer: string | null) => void; onRefresh: () => void; onReport: () => void; busy: string | null; myPlayer?: CombatMatch['players'][number]; otherPlayer?: CombatMatch['players'][number] }) {
  const seconds = remainingMs === null ? match.time_limit_seconds : Math.ceil(remainingMs / 1000)
  const timerPercent = Math.min(100, Math.max(0, ((remainingMs ?? match.time_limit_seconds * 1000) / (match.time_limit_seconds * 1000)) * 100))
  return <><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Round {match.current_question_index + 1} of {match.question_count}</p><h1 className="font-heading text-2xl font-black">Stay sharp.</h1></div><button type="button" onClick={onReport} className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Report match"><ShieldAlert className="size-4" aria-hidden /></button></div><ScoreStrip myPlayer={myPlayer} otherPlayer={otherPlayer} /><Card><CardContent className="p-4 sm:p-6"><div className="mb-5 flex items-center justify-between gap-3"><div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground"><TimerReset className="size-4" aria-hidden /> Shared timer</div><span className={cn('font-heading text-2xl font-black tabular-nums', seconds <= 5 && 'text-coral')}>{seconds}s</span></div><div className="mb-6 h-2 overflow-hidden rounded-full border-2 border-foreground bg-muted"><div className={cn('h-full bg-mint motion-safe:transition-[width] motion-safe:duration-200 motion-reduce:transition-none', seconds <= 5 && 'bg-coral')} style={{ width: `${timerPercent}%` }} /></div>{loading ? <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" aria-hidden /> Loading the shared question…</div> : question ? <div><p className="max-w-2xl font-heading text-xl font-bold leading-snug sm:text-2xl">{question.question}</p><div className="mt-6 grid gap-3 sm:grid-cols-2">{question.options.map((option, index) => <button key={`${question.id}-${option}`} type="button" disabled={hasSubmitted || busy === 'answer'} onClick={() => onAnswer(option)} className={cn('flex min-h-14 items-start gap-2 rounded-md border-2 border-foreground bg-card p-3 text-left text-sm font-semibold leading-5 shadow-brutal-sm transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-80 motion-reduce:transition-none', selected === option && 'border-foreground bg-mint shadow-none') }><span className="inline-grid size-6 shrink-0 place-items-center rounded-full border-2 border-foreground text-xs font-black">{String.fromCharCode(65 + index)}</span><span className="min-w-0 break-words">{option}</span></button>)}</div><button type="button" disabled={hasSubmitted || busy === 'answer'} onClick={() => onAnswer(null)} className="mx-auto mt-5 block text-xs font-bold text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">Skip this question</button></div> : <div className="rounded-md border-2 border-dashed border-foreground/15 p-6 text-center"><p className="font-heading font-bold">Waiting for the next round</p><p className="mt-1 text-sm text-muted-foreground">The other player may still be submitting an answer.</p><Button variant="outline" size="sm" className="mt-4" onClick={onRefresh}><RefreshCw className="size-4" aria-hidden /> Refresh</Button></div>}</CardContent></Card><p className="text-center text-xs text-muted-foreground">Correct answers decide the winner. Total answer time only breaks a tie.</p></>
}

function ScoreStrip({ myPlayer, otherPlayer }: { myPlayer?: CombatMatch['players'][number]; otherPlayer?: CombatMatch['players'][number] }) { return <div className="grid grid-cols-2 gap-3"><div className="rounded-md border-2 border-foreground bg-mint/15 p-3"><p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">You</p><p className="mt-1 font-heading text-2xl font-black">{myPlayer?.correct_count ?? 0}</p><p className="text-xs text-muted-foreground">correct</p></div><div className="rounded-md border-2 border-foreground bg-muted p-3 text-right"><p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Opponent</p><p className="mt-1 font-heading text-2xl font-black">{otherPlayer?.correct_count ?? 0}</p><p className="text-xs text-muted-foreground">correct</p></div></div> }

function FinishedPanel({ match, onBack }: { match: CombatMatch; onBack: () => void }) { return <div className="mx-auto max-w-md py-8"><Card><CardContent className="p-6 text-center"><span className="mx-auto grid size-14 place-items-center rounded-full border-2 border-foreground bg-muted shadow-brutal-sm">{match.status === 'completed' ? <Trophy className="size-7" aria-hidden /> : <TimerReset className="size-7" aria-hidden />}</span><h1 className="mt-4 font-heading text-2xl font-black">{match.status === 'completed' ? 'Match complete' : match.status === 'draw' ? 'It’s a draw' : 'Match closed'}</h1><p className="mt-2 text-sm text-muted-foreground">This room is no longer accepting answers. Your result will remain in Combat history.</p><Button className="mt-5" onClick={onBack}>Back to Combat</Button></CardContent></Card></div> }

function CombatResultPanel({ result, onBack, onRematch, rematchBusy }: { result: CombatResult; onBack: () => void; onRematch: () => void; rematchBusy: boolean }) {
  const won = result.outcome === 'win'
  const draw = result.outcome === 'draw'
  const [shareMessage, setShareMessage] = React.useState<string | null>(null)
  const wagered = result.wager_xp === 100
  const outcomeReason = draw ? 'Both players finished with the same result.' : result.outcome === 'cancelled' ? 'This private room was cancelled before a result was recorded.' : result.outcome === 'expired' ? 'The room expired before the duel could begin.' : result.outcome === 'no_contest' ? 'The duel was closed fairly without awarding a winner.' : won ? result.my_score === result.opponent_score ? 'You won the speed tiebreak after matching the correct-answer count.' : 'You finished with more correct answers.' : 'Your opponent finished ahead this time. The next round is yours to take.'
  const wagerReason = !wagered ? 'Practice match · no XP was at risk.' : result.wager_status === 'refunded' ? 'Both 100 XP stakes were refunded.' : result.wager_status === 'settled' && result.my_xp_delta > 0 ? 'You received 200 XP, for a net gain of 100 XP.' : result.wager_status === 'settled' && result.my_xp_delta < 0 ? 'Your 100 XP stake went to the winner.' : 'The 100 XP stakes were settled without a net change.'
  const handleShare = async () => {
    setShareMessage(null)
    const text = `Word Smartify Combat: ${won ? 'Victory' : draw ? 'Draw' : 'Good fight'} — ${result.my_score}-${result.opponent_score}.`
    try {
      const share = (navigator as unknown as { share?: (data: { title: string; text: string }) => Promise<void> }).share
      if (typeof share === 'function') {
        await share({ title: 'Word Smartify Combat', text })
        setShareMessage('Ready to share.')
      } else {
        await navigator.clipboard.writeText(text)
        setShareMessage('Result copied.')
      }
    } catch { setShareMessage(null) }
  }
  return <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 pb-20"><section className={cn('relative overflow-hidden rounded-lg border-2 border-foreground px-5 py-8 text-center shadow-brutal sm:px-8', won ? 'bg-mint/25' : draw ? 'bg-muted' : 'bg-coral/15')}><div className="pointer-events-none absolute -right-8 -top-8 size-28 rounded-full border-[12px] border-foreground/10" /><span className="relative mx-auto grid size-16 place-items-center rounded-full border-2 border-foreground bg-card shadow-brutal-sm">{won ? <Crown className="size-8 text-coral" aria-hidden /> : draw ? <Users className="size-8" aria-hidden /> : <Sparkles className="size-8" aria-hidden />}</span><p className="relative mt-4 text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">{won ? 'Victory' : draw ? 'Dead even' : 'Good fight'}</p><h1 className="relative mt-1 font-heading text-3xl font-black">{won ? 'You owned the round.' : draw ? 'No one backed down.' : 'Your next duel starts here.'}</h1><p className="relative mt-2 text-sm text-muted-foreground">{outcomeReason} {wagerReason} Your learning progress stays safe.</p><div className="relative mt-5 flex justify-center"><Button type="button" size="sm" variant="outline" className="bg-card" onClick={() => void handleShare}><Share2 className="size-4" aria-hidden /> Share result</Button></div>{shareMessage ? <p className="relative mt-2 text-xs font-semibold text-muted-foreground" role="status" aria-live="polite">{shareMessage}</p> : null}</section><Card><CardContent className="grid grid-cols-2 gap-3 p-4 sm:p-6"><div className="rounded-md border-2 border-foreground bg-mint/15 p-4 text-center"><p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">You</p><p className="mt-1 font-heading text-4xl font-black">{result.my_score}</p><p className="text-xs text-muted-foreground">{result.my_accuracy}% accuracy</p></div><div className="rounded-md border-2 border-foreground bg-muted p-4 text-center"><p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Opponent</p><p className="mt-1 font-heading text-4xl font-black">{result.opponent_score}</p><p className="text-xs text-muted-foreground">{result.opponent_accuracy}% accuracy</p></div></CardContent></Card>{wagered ? <div className="flex items-center justify-between gap-3 rounded-md border-2 border-foreground/15 bg-muted/30 px-4 py-3"><div className="flex min-w-0 items-center gap-2"><Coins className="size-4 shrink-0 text-coral" aria-hidden /><div className="min-w-0"><p className="text-sm font-bold">XP wager</p><p className="text-xs text-muted-foreground">{result.wager_status === 'refunded' ? 'Refunded to both players' : '100 XP each · 200 XP winner payout'}</p></div></div><span className={cn('shrink-0 font-heading font-black', result.my_xp_delta > 0 ? 'text-mint-foreground' : result.my_xp_delta < 0 ? 'text-coral-foreground' : 'text-muted-foreground')}>{result.my_xp_delta > 0 ? '+' : ''}{result.my_xp_delta} XP</span></div> : null}{result.missed_questions.length ? <Card><CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="size-5 text-mint-foreground" aria-hidden /> Review your misses</CardTitle></CardHeader><CardContent className="space-y-2">{result.missed_questions.map((item, index) => <div key={item.id} className="rounded-md border-2 border-foreground/10 p-3"><p className="text-xs font-bold text-muted-foreground">Question {index + 1}</p><p className="mt-1 text-sm font-semibold leading-5">{item.question}</p><div className="mt-3 grid gap-2 text-xs sm:grid-cols-2"><div className="rounded-md bg-coral/10 p-2"><p className="font-bold uppercase tracking-wide text-muted-foreground">Your answer</p><p className="mt-1 font-semibold">{item.selected_answer ?? 'Skipped'}</p></div><div className="rounded-md bg-mint/15 p-2"><p className="font-bold uppercase tracking-wide text-muted-foreground">Correct answer</p><p className="mt-1 font-semibold">{item.correct_answer}</p></div></div>{item.explanation ? <p className="mt-3 text-sm leading-5 text-muted-foreground">{item.explanation}</p> : null}</div>)}</CardContent></Card> : <div className="flex items-center justify-center gap-2 text-sm font-semibold text-mint-foreground"><CheckCircle2 className="size-4" aria-hidden /> No missed questions to review</div>}<div className="grid gap-2 sm:grid-cols-2"><Button variant="outline" onClick={onBack}><ArrowLeft className="size-4" aria-hidden /> Back to Combat</Button><Button variant="accent" onClick={onRematch} loading={rematchBusy}><SwordsIcon /> Rematch</Button></div></div> }

function ReportForm({ matchId, onDone }: { matchId: string; onDone: () => void }) { const [reason, setReason] = React.useState('question'); const [note, setNote] = React.useState(''); const [busy, setBusy] = React.useState(false); const [error, setError] = React.useState<string | null>(null); const submit = async () => { setBusy(true); setError(null); try { await postCombat({ action: 'report', matchId, reason, note }); onDone() } catch (submitError) { setError(submitError instanceof Error ? submitError.message : 'Report could not be sent.') } finally { setBusy(false) } }; return <div className="space-y-4"><div className="grid gap-2">{[['question', 'Broken question'], ['connection', 'Connection issue'], ['cheating', 'Cheating concern'], ['harassment', 'Harassment'], ['other', 'Other']].map(([value, label]) => <button key={value} type="button" onClick={() => setReason(value)} className={cn('rounded-md border-2 border-foreground/15 px-3 py-2 text-left text-sm font-semibold', reason === value ? 'border-foreground bg-mint/20' : 'hover:bg-muted')}>{label}</button>)}</div><textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={500} rows={3} placeholder="Optional note" className="w-full resize-none rounded-md border-2 border-foreground bg-card p-3 text-sm outline-none focus-visible:shadow-brutal-sm" />{error ? <p className="text-xs font-semibold text-destructive">{error}</p> : null}<div className="flex justify-end"><Button size="sm" onClick={() => void submit()} loading={busy}>Send report</Button></div></div> }
function SwordsIcon() { return <Swords className="size-7" aria-hidden /> }
