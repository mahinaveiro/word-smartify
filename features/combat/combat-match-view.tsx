'use client'

import * as React from 'react'
import Image from 'next/image'
import useSWR from 'swr'
import { useRouter } from 'next/navigation'
import type { RealtimeChannel } from '@supabase/supabase-js'
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Coins,
  MessageCircle,
  ClipboardCopy,
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
import { loadMatch, loadMatchMessages, loadMatchQuestion, loadMatchResult, postCombat, type CombatMessageRecord } from './combat-api'

type QuickMessage = { id: string; text: string; senderId: string | null }
const QUICK_MESSAGES = ['Good luck!', 'Nice one!', 'I’m ready!', 'That was close!']
const CLOSED_STATUSES = ['completed', 'draw', 'cancelled', 'expired', 'abandoned', 'no_contest'] as const

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
  const [clockMs, setClockMs] = React.useState(() => Date.now())
  const [copied, setCopied] = React.useState(false)
  const [isOffline, setIsOffline] = React.useState(false)
  const [showLeaveConfirm, setShowLeaveConfirm] = React.useState(false)
  const [quickMessages, setQuickMessages] = React.useState<QuickMessage[]>([])
  const messageChannel = React.useRef<RealtimeChannel | null>(null)
  const seenMessageIds = React.useRef(new Set<string>())

  const match = useSWR<CombatMatch>(['combat-match', matchId], () => loadMatch(matchId), {
    refreshInterval: 5000,
    revalidateOnFocus: true,
  })
  const currentMatch = match.data
  const currentPosition = currentMatch?.current_question_index ?? 0
  const question = useSWR<CombatQuestion | null>(
    currentMatch?.status === 'active' ? ['combat-question', matchId, currentPosition] : null,
    () => loadMatchQuestion(matchId, currentPosition),
    { revalidateOnFocus: false, keepPreviousData: false },
  )
  const closedMatch = currentMatch && CLOSED_STATUSES.includes(currentMatch.status as typeof CLOSED_STATUSES[number])
  const closedResult = useSWR<CombatResult | null>(closedMatch ? ['combat-result', matchId] : null, () => loadMatchResult(matchId), {
    revalidateOnFocus: false,
  })
  const persistedMessages = useSWR(['combat-messages', matchId], () => loadMatchMessages(matchId), {
    refreshInterval: 15000,
    revalidateOnFocus: true,
  })

  const refresh = React.useCallback(() => {
    void match.mutate()
  }, [match])

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
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'combat_match_messages', filter: `match_id=eq.${matchId}` }, ({ new: payload }) => {
        const data = payload as { id?: unknown; message?: unknown; sender_id?: unknown }
        if (typeof data.message !== 'string' || data.message.length === 0 || typeof data.id !== 'string') return
        if (seenMessageIds.current.has(data.id)) return
        seenMessageIds.current.add(data.id)
        setQuickMessages((messages) => [...messages.slice(-3), {
          id: data.id as string,
          text: data.message as string,
          senderId: typeof data.sender_id === 'string' ? data.sender_id : null,
        }])
      })
      .subscribe()
    messageChannel.current = channel
    return () => {
      messageChannel.current = null
      void client.removeChannel(channel)
    }
  }, [matchId, refresh])

  React.useEffect(() => {
    persistedMessages.data?.forEach((record) => seenMessageIds.current.add(record.id))
  }, [persistedMessages.data])

  const persistedQuickMessages = React.useMemo<QuickMessage[]>(() => (persistedMessages.data ?? []).slice(-4).map((record: CombatMessageRecord) => ({
    id: record.id,
    text: record.message,
    senderId: record.sender_id,
  })), [persistedMessages.data])
  const visibleQuickMessages = quickMessages.length > 0 ? quickMessages : persistedQuickMessages

  const roundGraceDeadline = currentMatch?.round_grace_deadline ? new Date(currentMatch.round_grace_deadline).getTime() : null
  const submissionCount = currentMatch?.current_question_submissions?.length ?? 0
  const hasOpponentSubmission = Boolean(currentMatch?.opponent_id && currentMatch.current_question_submissions?.includes(currentMatch.opponent_id))

  React.useEffect(() => {
    if (currentMatch?.status !== 'active') return
    const interval = window.setInterval(() => setClockMs(Date.now()), roundGraceDeadline ? 200 : 1000)
    return () => window.clearInterval(interval)
  }, [currentMatch?.status, currentPosition, roundGraceDeadline])

  React.useEffect(() => {
    if (currentMatch?.status !== 'active' || !user?.id || isOffline) return
    const syncHeartbeat = async () => {
      try {
        const synced = await postCombat<CombatMatch>({ action: 'heartbeat', matchId })
        await match.mutate(synced, false)
      } catch {
        // Transient failures are retried by the next interval and reflected by the browser connection state.
      }
    }
    void syncHeartbeat()
    const interval = window.setInterval(() => void syncHeartbeat(), 5000)
    return () => window.clearInterval(interval)
  }, [currentMatch?.status, isOffline, match, matchId, user?.id])

  const graceRemainingMs = roundGraceDeadline ? Math.max(0, roundGraceDeadline - clockMs) : null

  const freshQuestion = question.data?.position === currentPosition ? question.data : null
  const selectedForQuestion = selectedPosition === currentPosition ? selected : null
  const hasSubmittedForQuestion = submittedPosition === currentPosition || Boolean(user?.id && currentMatch?.current_question_submissions?.includes(user.id))
  const opponentLastSeen = currentMatch?.players.find((player) => player.user_id !== user?.id)?.last_seen_at
  const opponentOffline = currentMatch?.status === 'active' && Boolean(opponentLastSeen && clockMs - new Date(opponentLastSeen).getTime() > 15000)

  const run = React.useCallback(async (key: string, action: () => Promise<void>) => {
    setBusy(key)
    setError(null)
    try {
      await action()
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Something went wrong.')
    } finally {
      setBusy(null)
    }
  }, [])

  const toggleReady = () => {
    if (!currentMatch) return
    const me = currentMatch.players.find((player) => player.user_id === user?.id)
    const myReady = me?.is_ready ?? false
    void run('ready', async () => {
      await postCombat({ action: 'ready', matchId, ready: !myReady })
      await match.mutate()
    })
  }

  const start = () => void run('start', async () => {
    await postCombat({ action: 'start', matchId })
    await match.mutate()
  })

  const selectAnswer = React.useCallback((answerValue: string | null) => {
    if (!currentMatch || !freshQuestion || busy === 'answer' || hasSubmittedForQuestion) return
    setSelected(answerValue)
    setSelectedPosition(currentPosition)
  }, [busy, currentMatch, currentPosition, freshQuestion, hasSubmittedForQuestion])

  const submitAnswer = React.useCallback(() => {
    if (!currentMatch || !freshQuestion || busy === 'answer' || hasSubmittedForQuestion) return
    const activeQuestion = freshQuestion
    const answerValue = selectedForQuestion
    setSubmittedPosition(currentPosition)
    void run('answer', async () => {
      try {
        const response = await postCombat<{ next_position: number; match: CombatMatch; result: CombatResult | null }>({
          action: 'answer',
          matchId,
          questionId: activeQuestion.question_id,
          selectedAnswer: answerValue,
          responseTimeMs: Math.max(0, Math.min(60000, Date.now() - new Date((currentMatch.current_question_started_at ?? currentMatch.started_at) as string).getTime())),
        })
        if (response.result) setResult(response.result)
        await match.mutate(response.match, false)
      } catch (submitError) {
        setSubmittedPosition((position) => position === currentPosition ? null : position)
        throw submitError
      }
    })
  }, [busy, currentMatch, currentPosition, freshQuestion, hasSubmittedForQuestion, match, matchId, run, selectedForQuestion])

  const sendQuickMessage = React.useCallback((text: string) => {
    if (!QUICK_MESSAGES.includes(text) || busy !== null) return
    void run('quick-message', async () => {
      const message = await postCombat<{ id: string; match_id: string; sender_id: string; message: string; created_at: string }>({ action: 'quick_message', matchId, message: text })
      seenMessageIds.current.add(message.id)
      setQuickMessages((messages) => [...messages.slice(-3), { id: message.id, text: message.message, senderId: message.sender_id }])
      await persistedMessages.mutate()
    })
  }, [busy, matchId, persistedMessages, run])

  const answerRef = React.useRef<() => void>(() => undefined)
  React.useEffect(() => {
    answerRef.current = submitAnswer
  }, [submitAnswer])

  React.useEffect(() => {
    if (currentMatch?.status !== 'active' || graceRemainingMs !== 0 || !freshQuestion || hasSubmittedForQuestion || busy !== null) return
    const timeout = window.setTimeout(() => answerRef.current(), 0)
    return () => window.clearTimeout(timeout)
  }, [busy, currentMatch?.status, currentPosition, freshQuestion, graceRemainingMs, hasSubmittedForQuestion])

  const requestExit = () => {
    if (!currentMatch) return
    if (currentMatch.status === 'active' || currentMatch.wager_xp === 100) setShowLeaveConfirm(true)
    else router.push('/combat')
  }

  const confirmExit = () => {
    setShowLeaveConfirm(false)
    if (!currentMatch) return
    if (currentMatch.status === 'waiting' || currentMatch.status === 'ready') {
      void run('cancel', async () => {
        await postCombat({ action: 'cancel', matchId })
        router.push('/combat')
      })
      return
    }
    if (currentMatch.status === 'active') {
      void run('leave', async () => {
        await postCombat({ action: 'leave', matchId })
        router.push('/combat')
      })
      return
    }
    router.push('/combat')
  }

  const copyCode = async () => {
    if (!currentMatch) return
    await navigator.clipboard?.writeText(currentMatch.join_code).catch(() => undefined)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1400)
  }

  if (match.isLoading && !currentMatch) return <div className="flex min-h-[45vh] items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" aria-hidden /> Loading match room…</div>
  if (!currentMatch) return <div className="mx-auto max-w-md py-12"><Card><CardContent className="p-6 text-center"><XCircle className="mx-auto size-8 text-destructive" aria-hidden /><h1 className="mt-3 font-heading text-xl font-bold">Match unavailable</h1><p className="mt-2 text-sm text-muted-foreground">This room may have expired or you may no longer be a participant.</p><Button className="mt-5" onClick={() => router.push('/combat')}>Back to Combat</Button></CardContent></Card></div>

  const rematch = () => void run('rematch', async () => {
    const rematchMatch = await postCombat<CombatMatch>({
      action: 'create',
      preset: currentMatch.preset,
      questionCount: currentMatch.question_count,
      timeLimitSeconds: currentMatch.time_limit_seconds,
      wagerXp: currentMatch.wager_xp,
      questionSource: currentMatch.question_source,
    })
    const opponentId = currentMatch.players.find((player) => player.user_id !== user?.id)?.user_id
    if (opponentId) await postCombat({ action: 'invite_friend', matchId: rematchMatch.id, recipientId: opponentId })
    router.push(`/combat/${rematchMatch.id}`)
  })

  if (result) return <CombatResultPanel result={result} userId={user?.id} onBack={() => router.push('/combat')} onRematch={rematch} rematchBusy={busy === 'rematch'} />
  if (closedResult.data) return <CombatResultPanel result={closedResult.data} userId={user?.id} onBack={() => router.push('/combat')} onRematch={rematch} rematchBusy={busy === 'rematch'} />

  const isHost = currentMatch.host_id === user?.id
  const myPlayer = currentMatch.players.find((player) => player.user_id === user?.id) ?? currentMatch.players[0]
  const opponent = currentMatch.players.find((player) => player.id !== myPlayer?.id)
  const bothReady = currentMatch.players.length === 2 && currentMatch.players.every((player) => player.is_ready)

  return <div className="mx-auto flex min-h-dvh w-full max-w-4xl flex-col gap-3 px-3 pb-5 pt-3 sm:gap-4 sm:px-5 sm:pt-5 md:gap-6 md:px-0 md:pb-10">
    <div className="flex items-center justify-between gap-3"><Button variant="ghost" size="sm" className="h-8 px-2 sm:h-9 sm:px-3" onClick={requestExit}><ArrowLeft className="size-4" aria-hidden /><span className="hidden sm:inline">Combat</span><span className="sr-only">Leave match</span></Button><div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground"><span className={cn('size-2 rounded-full', isOffline ? 'bg-coral' : 'bg-mint')} />{isOffline ? 'Reconnecting…' : 'Live'}<span className="hidden sm:inline"> · Private room</span></div></div>
    {isOffline ? <div role="status" className="rounded-md border-2 border-coral/40 bg-coral/10 px-4 py-3 text-sm font-semibold text-coral-foreground">You are offline. Reconnect to keep your answer state synchronized.</div> : null}
    {!isOffline && opponentOffline ? <div role="status" className="rounded-md border-2 border-coral/40 bg-coral/10 px-4 py-3 text-sm font-semibold text-coral-foreground">Your opponent disconnected. Their 15-second return window is still open.</div> : null}
    {error ? <div role="alert" className="flex items-start gap-2 rounded-md border-2 border-destructive bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive"><ShieldAlert className="size-4 shrink-0" aria-hidden />{error}<button className="ml-auto" onClick={() => setError(null)} aria-label="Dismiss error"><XCircle className="size-4" aria-hidden /></button></div> : null}
    {currentMatch.status === 'waiting' || currentMatch.status === 'ready' ? <LobbyPanel match={currentMatch} userId={user?.id} isHost={isHost} opponent={opponent} bothReady={bothReady} busy={busy} copied={copied} onCopy={() => void copyCode()} onReady={toggleReady} onStart={start} onCancel={() => void run('cancel', async () => { await postCombat({ action: 'cancel', matchId }); router.push('/combat') })} /> : null}
    {currentMatch.status === 'active' ? <ActiveMatchPanel match={currentMatch} question={freshQuestion} loading={question.isLoading || !freshQuestion} selected={selectedForQuestion} remainingMs={graceRemainingMs} opponentSubmitted={hasOpponentSubmission} onSelect={selectAnswer} onSubmit={submitAnswer} hasSubmitted={hasSubmittedForQuestion} onRefresh={refresh} onReport={() => setShowReport(true)} onQuickMessage={sendQuickMessage} quickMessage={visibleQuickMessages.at(-1)} busy={busy} myPlayer={myPlayer} otherPlayer={opponent} /> : null}
    {CLOSED_STATUSES.includes(currentMatch.status as typeof CLOSED_STATUSES[number]) ? <FinishedPanel match={currentMatch} onBack={() => router.push('/combat')} /> : null}
    <Modal open={showReport} onClose={() => setShowReport(false)} title="Report this match" description="Use this for a broken question, connection issue, cheating concern, or harassment."><ReportForm matchId={matchId} onDone={() => setShowReport(false)} /></Modal>
    <Modal open={showLeaveConfirm} onClose={() => setShowLeaveConfirm(false)} title="Leave this match?" description={currentMatch.status === 'active' ? 'Leaving ends your run. In a wagered match, your 100 XP stake may be lost.' : 'Leaving will close this private room and settle any protected stake safely.'} className="max-w-sm">
      <div className="flex flex-col gap-3"><div className="rounded-md border-2 border-coral/40 bg-coral/10 p-3 text-sm leading-5"><p className="font-heading font-bold">Your opponent is waiting.</p><p className="mt-1 text-muted-foreground">Only leave if you are sure. You can return to Combat history afterward.</p></div><div className="grid grid-cols-2 gap-2"><Button variant="outline" size="sm" onClick={() => setShowLeaveConfirm(false)}>Stay</Button><Button variant="accent" size="sm" onClick={confirmExit} loading={busy === 'cancel' || busy === 'leave'}>Leave match</Button></div></div>
    </Modal>
  </div>
}

function LobbyPanel({ match, userId, isHost, opponent, bothReady, busy, copied, onCopy, onReady, onStart, onCancel }: { match: CombatMatch; userId?: string; isHost: boolean; opponent?: CombatMatch['players'][number]; bothReady: boolean; busy: string | null; copied: boolean; onCopy: () => void; onReady: () => void; onStart: () => void; onCancel: () => void }) {
  const me = match.players.find((player) => player.user_id === userId) ?? match.players[0]
  const wagered = match.wager_xp === 100
  return <>
    <section className="rounded-lg border-2 border-foreground bg-foreground px-4 py-5 text-primary-foreground shadow-brutal sm:px-8 sm:py-8"><div className="flex flex-col items-center text-center"><span className="grid size-12 place-items-center rounded-full border-2 border-primary-foreground/30 bg-coral text-coral-foreground sm:size-14"><SwordsIcon /></span><p className="mt-3 text-[10px] font-bold uppercase tracking-[0.16em] text-primary-foreground/65 sm:mt-4 sm:text-xs">{match.status === 'ready' ? 'Both players found' : 'Waiting room'}</p><h1 className="mt-1 font-heading text-2xl font-black sm:mt-2 sm:text-3xl">{match.status === 'ready' ? 'Lock in your readiness' : 'Bring a friend into the ring'}</h1><p className="mt-2 max-w-md text-xs leading-5 text-primary-foreground/70 sm:text-sm sm:leading-6">{match.status === 'ready' ? 'The match starts only after both players are ready.' : 'Share this private code. It expires in 30 minutes and is never listed publicly.'}</p><div className={cn('mt-4 flex max-w-md items-center gap-3 rounded-md border-2 px-3 py-2 text-left text-xs', wagered ? 'border-mint/40 bg-mint/10 text-primary-foreground' : 'border-primary-foreground/15 bg-primary-foreground/10 text-primary-foreground/75')}><Coins className={cn('size-4 shrink-0', wagered ? 'text-mint' : 'text-primary-foreground/55')} aria-hidden /><div><p className="font-bold">{wagered ? '100 XP wager each' : 'Practice match'}</p><p className="mt-0.5 text-primary-foreground/65">{wagered ? 'Winner receives 200 XP. Draws and protected no-contests refund both stakes.' : 'No XP is at risk. Focus on building your vocabulary.'}</p></div></div>{isHost ? <button type="button" onClick={onCopy} className="mt-4 inline-flex items-center gap-2 rounded-md border-2 border-primary-foreground/30 bg-primary-foreground/10 px-4 py-2 font-heading text-xl font-black tracking-[0.2em] text-primary-foreground transition-colors hover:bg-primary-foreground/20 sm:mt-5 sm:px-5 sm:py-3 sm:text-2xl" aria-label="Copy private match code">{match.join_code}<span className="ml-1 text-primary-foreground/60">{copied ? <Check className="size-5" aria-hidden /> : <ClipboardCopy className="size-5" aria-hidden />}</span></button> : <p className="mt-4 text-xs font-semibold text-primary-foreground/70 sm:mt-5 sm:text-sm">Private match · {match.question_count} questions</p>}</div></section>
    <div className="grid gap-2 sm:grid-cols-2 sm:gap-4"><PlayerLobbyCard player={me} label="Host" /><PlayerLobbyCard player={opponent} label="Opponent" empty={!opponent} /></div>
    <Card><CardContent className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4"><div><p className="font-heading font-bold">{opponent ? (bothReady ? 'Both players are ready' : 'Ready when you are') : 'Waiting for the second player'}</p><p className="text-xs text-muted-foreground sm:text-sm">{opponent ? 'Same questions, same progression, no hidden answer key.' : 'Send the code to a friend, then stay on this screen.'}</p>{wagered ? <p className="mt-1 text-xs font-semibold text-mint-foreground">{match.wager_status === 'reserved' ? 'Both stakes are reserved safely.' : 'Stake is being secured before play begins.'}</p> : null}</div><div className="flex flex-wrap gap-2"><Button variant="ghost" size="sm" onClick={onCancel} disabled={!isHost || busy === 'cancel'}>{isHost ? <><LogOut className="size-4" aria-hidden /> Cancel</> : 'Leave'}</Button>{opponent ? <Button variant="accent" size="sm" onClick={onReady} loading={busy === 'ready'}><Check className="size-4" aria-hidden />{me?.is_ready ? 'Unready' : 'Ready'}</Button> : null}{isHost && bothReady ? <Button size="sm" onClick={onStart} loading={busy === 'start'}>Start <Sparkles className="size-4" aria-hidden /></Button> : null}</div></CardContent></Card>
  </>
}

function PlayerLobbyCard({ player, label, empty }: { player?: CombatMatch['players'][number]; label: string; empty?: boolean }) {
  return <Card className={cn('min-h-24', empty && 'border-dashed bg-muted/20 shadow-none')}><CardContent className="flex h-full items-center gap-3 p-3 sm:p-4">{player ? <><Avatar name={player.profile.display_name} avatarId={player.profile.avatar_id} avatarUrl={player.profile.avatar_url} size="md" /><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground sm:text-xs">{label}</p><p className="truncate font-heading font-bold">{player.profile.display_name}</p><p className={cn('mt-1 text-xs font-semibold', player.is_ready ? 'text-mint-foreground' : 'text-muted-foreground')}>{player.is_ready ? 'Ready' : 'Not ready'}</p></div></> : <div className="flex items-center gap-3 text-muted-foreground"><span className="grid size-10 place-items-center rounded-full border-2 border-dashed border-foreground/20"><Users className="size-5" aria-hidden /></span><div><p className="text-[10px] font-bold uppercase tracking-wide">Opponent</p><p className="text-sm font-semibold">Waiting to join</p></div></div>}</CardContent></Card>
}

function ActiveMatchPanel({ match, question, loading, selected, hasSubmitted, remainingMs, opponentSubmitted, onSelect, onSubmit, onRefresh, onReport, onQuickMessage, quickMessage, busy, myPlayer, otherPlayer }: { match: CombatMatch; question: CombatQuestion | null; loading: boolean; selected: string | null; hasSubmitted: boolean; remainingMs: number | null; opponentSubmitted: boolean; onSelect: (answer: string | null) => void; onSubmit: () => void; onRefresh: () => void; onReport: () => void; onQuickMessage: (message: string) => void; quickMessage?: QuickMessage; busy: string | null; myPlayer?: CombatMatch['players'][number]; otherPlayer?: CombatMatch['players'][number] }) {
  const graceSeconds = remainingMs === null ? null : Math.ceil(remainingMs / 1000)
  const mySubmitted = hasSubmitted
  return <div className="relative flex min-h-[calc(100dvh-3.25rem)] flex-col pb-12 sm:min-h-0 sm:pb-0">
    <div className="mb-2 flex items-center justify-between gap-3 sm:mb-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground sm:text-xs">Round {match.current_question_index + 1} of {match.question_count}</p><p className="mt-1 text-xs font-semibold text-muted-foreground sm:text-sm">{opponentSubmitted && !mySubmitted ? 'Your opponent moved first.' : mySubmitted ? 'Answer locked.' : 'Choose your answer.'}</p></div><div className="flex items-center gap-1"><button type="button" onClick={onReport} className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Report match"><ShieldAlert className="size-4" aria-hidden /></button></div></div>
    <Card className="mx-auto flex min-h-[62svh] w-full max-w-2xl flex-none shadow-brutal-sm sm:min-h-0 sm:flex-none sm:shadow-brutal"><CardContent className="flex min-h-[62svh] flex-col p-3 sm:min-h-0 sm:p-6"><div className="mb-3 flex items-center justify-between gap-2 sm:mb-5"><p className="flex min-w-0 items-center gap-1.5 truncate text-[11px] font-semibold text-muted-foreground sm:text-sm"><MessageCircle className="size-3.5 shrink-0" aria-hidden />{quickMessage ? quickMessage.text : 'Keep it friendly.'}</p><div className="flex shrink-0 gap-1.5">{QUICK_MESSAGES.map((message) => <button key={message} type="button" disabled={busy === 'quick-message'} onClick={() => onQuickMessage(message)} className="rounded-full border border-foreground/20 bg-card px-2 py-1 text-[10px] font-bold text-muted-foreground transition-colors hover:bg-muted disabled:cursor-wait disabled:opacity-60 sm:px-2.5">{message === 'Good luck!' ? 'GL' : message === 'That was close!' ? 'Close' : message.replace('!', '')}</button>)}</div></div>{graceSeconds !== null && !mySubmitted ? <div className="pointer-events-none fixed inset-0 z-30 grid place-items-center bg-foreground/15 px-6 backdrop-blur-[1px]"><div className="rounded-lg border-2 border-foreground bg-card px-6 py-5 text-center shadow-brutal"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Opponent submitted</p><p className="mt-1 font-heading text-5xl font-black tabular-nums text-coral">{graceSeconds}</p><p className="mt-1 text-xs font-semibold text-muted-foreground">Submit before the round closes</p></div></div> : null}{loading ? <div className="flex min-h-[45vh] flex-1 items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" aria-hidden /> Loading the shared question…</div> : question ? <div className="flex min-h-[50svh] flex-col justify-center sm:min-h-0"><p className="font-heading text-lg font-bold leading-snug sm:text-2xl">{question.question}</p><div className="mt-4 grid gap-2 sm:mt-6 sm:grid-cols-2 sm:gap-3">{question.options.map((option, index) => <button key={`${question.question_id}-${option}`} type="button" disabled={hasSubmitted || busy === 'answer'} onClick={() => onSelect(option)} className={cn('flex min-h-11 items-start gap-2 rounded-md border-2 border-foreground bg-card p-2.5 text-left text-sm font-semibold leading-5 shadow-brutal-sm transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-80 motion-reduce:transition-none sm:min-h-14 sm:p-3', selected === option && 'border-foreground bg-mint shadow-none')}><span className="inline-grid size-6 shrink-0 place-items-center rounded-full border-2 border-foreground text-xs font-black">{String.fromCharCode(65 + index)}</span><span className="min-w-0 break-words">{option}</span></button>)}</div><div className="mt-3 flex items-center justify-between gap-3 sm:mt-5"><div className="min-w-0">{hasSubmitted ? <p className="text-xs font-semibold text-mint-foreground">Waiting for the other player…</p> : <button type="button" disabled={hasSubmitted || busy === 'answer'} onClick={() => onSelect(null)} className="text-xs font-bold text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">Skip this question</button>}</div><Button type="button" size="sm" variant="accent" disabled={hasSubmitted || busy === 'answer'} onClick={onSubmit} loading={busy === 'answer'}>{match.current_question_index + 1 === match.question_count ? 'Submit' : 'Next'} <Check className="size-4" aria-hidden /></Button></div></div> : <div className="rounded-md border-2 border-dashed border-foreground/15 p-6 text-center"><p className="font-heading font-bold">Waiting for the next round</p><p className="mt-1 text-sm text-muted-foreground">The other player may still be submitting an answer.</p><Button variant="outline" size="sm" className="mt-4" onClick={onRefresh}><RefreshCw className="size-4" aria-hidden /> Refresh</Button></div>}</CardContent></Card>
    <div className="pointer-events-none absolute bottom-0 left-0 flex items-center gap-2"><PresenceAvatar player={myPlayer} active={mySubmitted} label="You" /></div><div className="pointer-events-none absolute bottom-0 right-0 flex items-center gap-2"><PresenceAvatar player={otherPlayer} active={opponentSubmitted} label="Opponent" /></div>
    <p className="mt-2 text-center text-[10px] text-muted-foreground sm:mt-4 sm:text-xs">One shared question. The first submission gives the other player a 10-second grace window.</p>
  </div>
}

function PresenceAvatar({ player, active, label }: { player?: CombatMatch['players'][number]; active: boolean; label: string }) {
  return <div className="flex flex-col items-center gap-1"><span className={cn('rounded-full border-2 p-0.5 transition-colors', active ? 'border-mint bg-mint/35' : 'border-foreground/35 bg-muted grayscale')}><Avatar name={player?.profile.display_name ?? label} avatarId={player?.profile.avatar_id} avatarUrl={player?.profile.avatar_url} size="sm" className="size-9" /></span><span className="sr-only">{label} {active ? 'has submitted' : 'is choosing'}</span></div>
}

function FinishedPanel({ match, onBack }: { match: CombatMatch; onBack: () => void }) {
  return <div className="mx-auto max-w-md py-8"><Card><CardContent className="p-6 text-center"><span className="mx-auto grid size-14 place-items-center rounded-full border-2 border-foreground bg-muted shadow-brutal-sm">{match.status === 'completed' ? <Trophy className="size-7" aria-hidden /> : <TimerReset className="size-7" aria-hidden />}</span><h1 className="mt-4 font-heading text-2xl font-black">{match.status === 'completed' ? 'Match complete' : match.status === 'draw' ? 'It’s a draw' : 'Match closed'}</h1><p className="mt-2 text-sm text-muted-foreground">This room is no longer accepting answers. Your result will remain in Combat history.</p><Button className="mt-5" onClick={onBack}>Back to Combat</Button></CardContent></Card></div>
}

function CombatResultPanel({ result, userId, onBack, onRematch, rematchBusy }: { result: CombatResult; userId?: string; onBack: () => void; onRematch: () => void; rematchBusy: boolean }) {
  const won = result.outcome === 'win'
  const draw = result.outcome === 'draw'
  const [shareMessage, setShareMessage] = React.useState<string | null>(null)
  const wagered = result.wager_xp === 100
  const myPlayer = result.match.players.find((player) => player.user_id === userId) ?? result.match.players[0]
  const opponent = result.match.players.find((player) => player.user_id !== myPlayer?.user_id) ?? result.match.players[1]
  const winnerId = result.winner_id ?? (won ? myPlayer?.user_id : result.outcome === 'loss' ? opponent?.user_id : null)
  const winner = result.match.players.find((player) => player.user_id === winnerId)
  const outcomeReason = draw ? 'Both players finished with the same result.' : result.outcome === 'cancelled' ? 'This private room was cancelled before a result was recorded.' : result.outcome === 'expired' ? 'The room expired before the duel could begin.' : result.outcome === 'no_contest' ? 'The duel was closed fairly without awarding a winner.' : won ? result.my_score === result.opponent_score ? 'You won the speed tiebreak.' : 'You finished with more correct answers.' : 'Your opponent finished ahead this time.'
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
    } catch {
      setShareMessage(null)
    }
  }
  return <div className="mx-auto flex w-full max-w-2xl flex-col gap-2 px-1 pb-6 sm:gap-5 sm:px-0 sm:pb-20">
    <section className={cn('relative overflow-hidden rounded-lg border-2 border-foreground px-2.5 py-3 shadow-brutal sm:px-8 sm:py-7', won ? 'bg-mint/20' : draw ? 'bg-muted' : 'bg-coral/10')}><div className="pointer-events-none absolute -right-10 -top-12 size-32 rounded-full border-[14px] border-coral/30" /><div className="pointer-events-none absolute -bottom-16 -left-8 size-36 rounded-full border-[12px] border-mint/30" /><div className="relative text-center"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground sm:text-xs">{won ? 'Victory secured' : draw ? 'Dead even' : result.outcome === 'loss' ? 'Good fight' : 'Combat result'}</p><h1 className="mt-1 font-heading text-xl font-black tracking-tight sm:text-4xl">{won ? 'You own this round.' : draw ? 'No one backed down.' : result.outcome === 'loss' ? 'A close one.' : 'The duel is over.'}</h1><p className="mx-auto mt-1.5 max-w-xl text-xs leading-5 text-muted-foreground sm:mt-2 sm:text-sm sm:leading-6">{outcomeReason} {wagerReason}</p></div>{winner ? <div className="relative mx-auto mt-2 size-20 sm:mt-5 sm:size-32"><div className="absolute -inset-2 rounded-full border-2 border-coral/50 sm:-inset-3" /><div className="absolute inset-1 rounded-full border-4 border-foreground bg-coral p-1.5 shadow-brutal-md sm:inset-2"><Avatar name={winner.profile.display_name} avatarId={winner.profile.avatar_id} avatarUrl={winner.profile.avatar_url} size="xl" className="size-full text-3xl sm:text-4xl" /></div><Image src="/assets/crown.gif" alt="" width={128} height={88} unoptimized className="pointer-events-none absolute left-1/2 top-0 z-10 h-auto w-[124%] max-w-none -translate-x-1/2 -translate-y-[6%] object-contain" /></div> : <div className="relative mx-auto mt-3 grid size-16 place-items-center rounded-full border-2 border-foreground bg-card shadow-brutal-sm sm:mt-5 sm:size-20"><Users className="size-7 sm:size-9" aria-hidden /></div>}<div className="relative mt-5 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-2 sm:mt-7 sm:gap-5"><ResultPlayerLane player={myPlayer} score={result.my_score} accuracy={result.my_accuracy} isWinner={Boolean(winnerId && winnerId === myPlayer?.user_id)} label="You" align="right" /><div className="flex flex-col items-center gap-1 pb-3"><span className="grid size-9 place-items-center rounded-full border-2 border-foreground bg-foreground font-heading text-[10px] font-black text-primary-foreground shadow-brutal-sm sm:size-10 sm:text-xs">VS</span><span className="font-heading text-lg font-black tabular-nums">{result.my_score} : {result.opponent_score}</span></div><ResultPlayerLane player={opponent} score={result.opponent_score} accuracy={result.opponent_accuracy} isWinner={Boolean(winnerId && winnerId === opponent?.user_id)} label="Opponent" align="left" /></div><div className="relative mt-4 flex flex-wrap justify-center gap-2"><Button type="button" size="sm" variant="outline" className="bg-card" onClick={() => void handleShare()}><Share2 className="size-4" aria-hidden /> Share result</Button></div>{shareMessage ? <p className="relative mt-2 text-center text-xs font-semibold text-muted-foreground" role="status" aria-live="polite">{shareMessage}</p> : null}</section>
    {wagered ? <div className="flex items-center justify-between gap-3 rounded-md border-2 border-foreground/15 bg-muted/30 px-3 py-2.5 sm:px-4 sm:py-3"><div className="flex min-w-0 items-center gap-2"><Coins className="size-4 shrink-0 text-coral" aria-hidden /><div className="min-w-0"><p className="text-sm font-bold">XP wager</p><p className="text-xs text-muted-foreground">{result.wager_status === 'refunded' ? 'Refunded to both players' : '100 XP each · 200 XP winner payout'}</p></div></div><span className={cn('shrink-0 font-heading font-black', result.my_xp_delta > 0 ? 'text-mint-foreground' : result.my_xp_delta < 0 ? 'text-coral-foreground' : 'text-muted-foreground')}>{result.my_xp_delta > 0 ? '+' : ''}{result.my_xp_delta} XP</span></div> : null}
    {result.missed_questions.length ? <Card><CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="size-5 text-mint-foreground" aria-hidden /> Review your misses</CardTitle></CardHeader><CardContent className="space-y-2">{result.missed_questions.map((item, index) => <div key={item.id} className="rounded-md border-2 border-foreground/10 p-3"><p className="text-xs font-bold text-muted-foreground">Question {index + 1}</p><p className="mt-1 text-sm font-semibold leading-5">{item.question}</p><div className="mt-3 grid gap-2 text-xs sm:grid-cols-2"><div className="rounded-md bg-coral/10 p-2"><p className="font-bold uppercase tracking-wide text-muted-foreground">Your answer</p><p className="mt-1 font-semibold">{item.selected_answer ?? 'Skipped'}</p></div><div className="rounded-md bg-mint/15 p-2"><p className="font-bold uppercase tracking-wide text-muted-foreground">Correct answer</p><p className="mt-1 font-semibold">{item.correct_answer}</p></div></div>{item.explanation ? <p className="mt-3 text-sm leading-5 text-muted-foreground">{item.explanation}</p> : null}</div>)}</CardContent></Card> : <div className="flex items-center justify-center gap-2 text-sm font-semibold text-mint-foreground"><CheckCircle2 className="size-4" aria-hidden /> No missed questions to review</div>}
    <div className="flex gap-2"><Button className="min-w-0 flex-1 px-2 text-xs sm:px-3 sm:text-sm" variant="outline" onClick={onBack}><ArrowLeft className="size-4 shrink-0" aria-hidden /> <span className="truncate">Back to Combat</span></Button><Button className="min-w-0 flex-1 px-2 text-xs sm:px-3 sm:text-sm" variant="accent" onClick={onRematch} loading={rematchBusy}><SwordsIcon /> Rematch</Button></div>
  </div>
}

function ResultPlayerLane({ player, score, accuracy, isWinner, label, align }: { player?: CombatMatch['players'][number]; score: number; accuracy: number; isWinner: boolean; label: string; align: 'left' | 'right' }) {
  const textAlign = align === 'right' ? 'text-right items-end' : 'text-left items-start'
  return <div className={cn('flex min-w-0 flex-col gap-1.5', textAlign, isWinner && 'motion-safe:-translate-y-1')}><div className="relative"><Avatar name={player?.profile.display_name ?? label} avatarId={player?.profile.avatar_id} avatarUrl={player?.profile.avatar_url} size="md" className={cn(isWinner ? 'border-4 border-coral shadow-brutal-sm' : 'border-2 border-foreground/20', 'size-10 bg-card sm:size-11')} /></div><div className="min-w-0 max-w-full"><p className="truncate font-heading text-xs font-black sm:text-base">{player?.profile.display_name ?? label}</p><p className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground sm:text-[10px]">{isWinner ? 'Winner' : label}</p></div><div className={cn('rounded-md border-2 px-2 py-1', isWinner ? 'border-foreground bg-coral text-coral-foreground' : 'border-foreground/15 bg-card')}><span className="font-heading text-xl font-black tabular-nums sm:text-3xl">{score}</span><span className="ml-1 text-[9px] font-bold uppercase sm:text-[10px]">{accuracy}%</span></div></div>
}

function ReportForm({ matchId, onDone }: { matchId: string; onDone: () => void }) {
  const [reason, setReason] = React.useState('question')
  const [note, setNote] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const submit = async () => {
    setBusy(true)
    setError(null)
    try {
      await postCombat({ action: 'report', matchId, reason, note })
      onDone()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Report could not be sent.')
    } finally {
      setBusy(false)
    }
  }
  return <div className="space-y-4"><div className="grid gap-2">{[['question', 'Broken question'], ['connection', 'Connection issue'], ['cheating', 'Cheating concern'], ['harassment', 'Harassment'], ['other', 'Other']].map(([value, label]) => <button key={value} type="button" onClick={() => setReason(value)} className={cn('rounded-md border-2 border-foreground/15 px-3 py-2 text-left text-sm font-semibold', reason === value ? 'border-foreground bg-mint/20' : 'hover:bg-muted')}>{label}</button>)}</div><textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={500} rows={3} placeholder="Optional note" className="w-full resize-none rounded-md border-2 border-foreground bg-card p-3 text-sm outline-none focus-visible:shadow-brutal-sm" />{error ? <p className="text-xs font-semibold text-destructive">{error}</p> : null}<div className="flex justify-end"><Button size="sm" onClick={() => void submit()} loading={busy}>Send report</Button></div></div>
}

function SwordsIcon() {
  return <Swords className="size-7" aria-hidden />
}
