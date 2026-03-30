import {BarChart3, Coins, History, Settings, ShieldCheck, Trophy, User, Wallet, Zap} from 'lucide-react';
import type {Dispatch, ReactNode, SetStateAction} from 'react';
import {useEffect, useRef, useState} from 'react';
import clubIcon from './assets/card-suits/club.svg';
import diamondIcon from './assets/card-suits/diamond.svg';
import heartIcon from './assets/card-suits/heart.svg';
import spadeIcon from './assets/card-suits/spade.svg';
import {analyzeHand, canDouble, canSplit, compareHands, createHand, createShuffledDeck, dealerShouldReveal, drawCard, formatResult, getExposedCards, getRecommendation, shouldDealerHit, summarizeHand, type Card, type Hand, type SessionStats} from './blackjack';
import {ActionButton, Badge, BettingChipRack, CasinoChip, Chip, ChipButton, EmptySlot, IconButton, InlineStat, Metric, Panel, ProgressRow, SmallMetric, StatRow, SummaryTile, ToggleRow} from './ui-kit';

type Phase = 'betting' | 'player' | 'dealer' | 'round-over';
type TableState = {shoe: Card[]; dealerCards: Card[]; playerHands: Hand[]; activeHandIndex: number; phase: Phase; message: string; stats: SessionStats; roundNumber: number; bankroll: number; pendingBet: number; pendingChips: number[]};
type HistoryEntry = {id: string; roundNumber: number; headline: string; message: string; bankroll: number; delta: number; timestamp: string};
type UISettings = {showBasicStrategy: boolean; bankruptcyAlert: boolean; confirmEarlyExit: boolean; landscapeControlsLeft: boolean};

const STARTING_BANKROLL = 50;
const CHIP_VALUES = [1, 5, 10, 25, 50];
const SHUFFLE_AT = 15;
const DECK_COUNT = 1;
const INITIAL_MESSAGE = '칩을 눌러 베팅을 쌓은 뒤 새 라운드를 시작하세요.';
const INITIAL_STATS: SessionStats = {rounds: 0, wins: 0, losses: 0, pushes: 0, blackjacks: 0};
const DEFAULT_SETTINGS: UISettings = {showBasicStrategy: false, bankruptcyAlert: true, confirmEarlyExit: true, landscapeControlsLeft: true};

function createInitialTableState(message = INITIAL_MESSAGE): TableState {
  return {
    shoe: createShuffledDeck(DECK_COUNT),
    dealerCards: [],
    playerHands: [],
    activeHandIndex: 0,
    phase: 'betting',
    message,
    stats: INITIAL_STATS,
    roundNumber: 1,
    bankroll: STARTING_BANKROLL,
    pendingBet: 0,
    pendingChips: [],
  };
}

export default function App() {
  const [showStatsView, setShowStatsView] = useState(false);
  const [showHistoryView, setShowHistoryView] = useState(false);
  const [showSettingsView, setShowSettingsView] = useState(false);
  const [showRoundOverOverlay, setShowRoundOverOverlay] = useState(false);
  const [isLandscapeLayout, setIsLandscapeLayout] = useState(false);
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);
  const [settings, setSettings] = useState<UISettings>(DEFAULT_SETTINGS);
  const lastLoggedRoundRef = useRef(0);
  const [table, setTable] = useState<TableState>(createInitialTableState());

  useEffect(() => {
    if (table.phase !== 'round-over') {
      setShowRoundOverOverlay(false);
      return;
    }
    const timer = window.setTimeout(() => {
      setShowRoundOverOverlay(true);
    }, 1400);
    return () => window.clearTimeout(timer);
  }, [table.phase, table.roundNumber]);

  useEffect(() => {
    if (settings.bankruptcyAlert && table.bankroll === 0 && table.phase === 'round-over' && showRoundOverOverlay) {
      const timer = window.setTimeout(() => {
        window.alert('칩을 모두 잃었습니다. 결과를 확인하고 다시 시작할 수 있습니다.');
      }, 150);
      return () => window.clearTimeout(timer);
    }
  }, [settings.bankruptcyAlert, showRoundOverOverlay, table.bankroll, table.phase]);

  useEffect(() => {
    const updateLayout = () => {
      setIsLandscapeLayout(window.innerWidth >= 1024 && window.innerWidth > window.innerHeight);
    };
    updateLayout();
    window.addEventListener('resize', updateLayout);
    return () => window.removeEventListener('resize', updateLayout);
  }, []);

  const dealerRevealed = table.dealerCards.length > 0 && dealerShouldReveal(table.dealerCards, table.phase === 'betting' ? 'round-over' : table.phase);
  const activeHand = table.playerHands[table.activeHandIndex] ?? null;
  const exposedCards = getExposedCards(table.playerHands, table.dealerCards, dealerRevealed);
  const analysis = activeHand ? analyzeHand(activeHand, table.shoe, exposedCards) : null;
  const recommendation = activeHand && table.dealerCards[0] ? getRecommendation(activeHand, table.dealerCards[0]) : null;
  const dealerSummary = table.dealerCards.length > 0 ? summarizeHand(table.dealerCards) : null;
  const played = table.stats.wins + table.stats.losses + table.stats.pushes;
  const winRate = played === 0 ? 0 : table.stats.wins / played;
  const liveBet = table.playerHands.reduce((sum, hand) => sum + hand.bet, 0);
  const currentRoundNumber = Math.max(table.roundNumber - (table.phase === 'round-over' ? 1 : 0), 1);
  const useLandscapeControlDock = settings.landscapeControlsLeft && isLandscapeLayout;
  const useWidePlayerZone = isLandscapeLayout;
  const sessionResults = {
    wins: Math.max(table.stats.wins - table.stats.blackjacks, 0),
    losses: table.stats.losses,
    pushes: table.stats.pushes,
    blackjacks: table.stats.blackjacks,
  };
  const roundPayout = table.phase === 'round-over' ? table.playerHands.reduce((sum, hand) => sum + payoutOf(hand), 0) : 0;
  const roundWager = table.playerHands.reduce((sum, hand) => sum + hand.bet, 0);
  const roundNet = table.phase === 'round-over' ? roundPayout - roundWager : 0;
  const sessionNet = table.bankroll - STARTING_BANKROLL;
  const averageRoundNet = table.stats.rounds === 0 ? 0 : sessionNet / table.stats.rounds;
  const bestRound = historyEntries.reduce<HistoryEntry | null>((best, entry) => (!best || entry.delta > best.delta ? entry : best), null);
  const worstRound = historyEntries.reduce<HistoryEntry | null>((worst, entry) => (!worst || entry.delta < worst.delta ? entry : worst), null);

  useEffect(() => {
    if (table.phase !== 'round-over' || table.playerHands.length === 0 || currentRoundNumber === lastLoggedRoundRef.current) {
      return;
    }
    lastLoggedRoundRef.current = currentRoundNumber;
    pushHistory(setHistoryEntries, table, currentRoundNumber, roundNet);
  }, [currentRoundNumber, roundNet, table]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#153725_0%,_#08110c_45%,_#040706_100%)] text-zinc-100">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(16,185,129,0.08),transparent_35%,rgba(250,204,21,0.05)_70%,transparent)]" />
      {showStatsView ? (
        <StatsOverlay
          roundNumber={currentRoundNumber}
          message={table.message}
          bankroll={table.bankroll}
          dealerTotal={dealerSummary?.total ?? null}
          roundWager={roundWager}
          roundPayout={roundPayout}
          roundNet={roundNet}
          sessionResults={sessionResults}
          stats={table.stats}
          winRate={winRate}
          hands={table.playerHands}
          historyEntries={historyEntries}
          sessionNet={sessionNet}
          averageRoundNet={averageRoundNet}
          bestRound={bestRound}
          worstRound={worstRound}
          isBankrupt={table.bankroll === 0}
          onClose={() => setShowStatsView(false)}
        />
      ) : null}
      {showHistoryView ? <HistoryOverlay entries={historyEntries} onClose={() => setShowHistoryView(false)} /> : null}
      {showSettingsView ? <SettingsOverlay settings={settings} onClose={() => setShowSettingsView(false)} onChange={setSettings} /> : null}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/30 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[106rem] items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.35)]"><Zap className="h-5 w-5 fill-current text-black" /></div>
            <div><p className="text-[10px] uppercase tracking-[0.35em] text-emerald-300/80">어정규쌤의 확률 실습 테이블</p><h1 className="text-lg font-black uppercase tracking-[0.2em] text-white">Openjacks</h1></div>
          </div>
          <div className="hidden items-center gap-8 md:flex"><Metric label="라운드" value={`#${table.roundNumber}`} accent="text-emerald-300" /><Metric label="보유 칩" value={money(table.bankroll)} accent="text-amber-300" /><Metric label="대기 베팅" value={money(table.pendingBet)} accent="text-white" /></div>
          <div className="flex items-center gap-2"><IconButton icon={<History className="h-5 w-5" />} onClick={() => setShowHistoryView(true)} /><IconButton icon={<Settings className="h-5 w-5" />} onClick={() => setShowSettingsView(true)} /></div>
        </div>
      </header>

      <main className="relative mx-auto grid max-w-[106rem] gap-6 px-4 py-8 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <section className="flex min-w-0 flex-col gap-6">
          <div className={useLandscapeControlDock ? 'grid gap-6 xl:grid-cols-[19rem_minmax(0,1fr)] xl:items-start' : 'flex flex-col gap-6'}>
            {useLandscapeControlDock ? (
              <ControlDock
                table={table}
                activeHand={activeHand}
                compact
                onAddChip={(chip) => setTable((current) => addChip(current, chip))}
                onResetBet={() => setTable((current) => ({...current, pendingBet: 0, pendingChips: []}))}
                onHit={() => setTable((current) => hitCurrentHand(current))}
                onStand={() => setTable((current) => standCurrentHand(current))}
                onDouble={() => setTable((current) => doubleCurrentHand(current))}
                onSplit={() => setTable((current) => splitCurrentHand(current))}
                onEarlyExit={() => {
                  if (settings.confirmEarlyExit && !window.confirm('현재 세션을 조기 종료하고 새 게임을 시작할까요? 올려둔 칩은 정리되고 1라운드부터 다시 시작합니다.')) return;
                  setShowStatsView(false);
                  setHistoryEntries([]);
                  setTable((current) => endSessionEarly(current));
                }}
                onStartRound={() => setTable((current) => startRound(current))}
              />
            ) : null}
            <div className="relative overflow-hidden rounded-[2rem] border border-emerald-400/20 bg-[#0d2c1f] p-4 shadow-[0_30px_120px_rgba(0,0,0,0.45)] sm:p-8">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.35)_100%)] opacity-90" />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),transparent_22%,transparent_75%,rgba(0,0,0,0.25))]" />
              <div className="relative flex min-h-[34rem] flex-col justify-between gap-8 rounded-[1.6rem] border border-white/8 px-4 py-8 sm:px-8">
                {table.phase === 'round-over' && showRoundOverOverlay ? <RoundOver table={table} onReplay={() => { setShowStatsView(false); setTable((current) => current.bankroll > 0 ? prepareNextRound(current) : restartSessionAfterBust()); }} replayLabel="한번 더 하기" onStats={() => setShowStatsView(true)} /> : null}
                <div className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 text-center opacity-20 md:block"><p className="text-5xl font-black uppercase tracking-[0.16em] text-white">Blackjack</p><p className="mt-3 text-xs font-bold uppercase tracking-[0.6em] text-white/80">Pays 3 To 2</p><div className="mx-auto mt-5 h-px w-56 bg-white/40" /><p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.4em] text-white/80">Dealer stands on all 17s</p></div>
                <div className="relative z-10 flex flex-col items-center gap-4">
                  <Badge icon={<History className="h-3 w-3" />} label="딜러" value={table.dealerCards.length === 0 ? '-' : dealerRevealed && dealerSummary ? String(dealerSummary.total) : `${rankLabel(table.dealerCards[0])}+?`} tone="slate" />
                  <div className="flex flex-wrap justify-center gap-3">
                    {table.dealerCards.length === 0 ? <EmptySlot label="베팅 후 새 라운드를 시작하세요." /> : table.dealerCards.map((card, index) => <TableCard key={card.id} card={card} hidden={!dealerRevealed && index === 1} delay={index * 0.08} />)}
                  </div>
                </div>
                <div className={useWidePlayerZone ? 'relative z-10 grid w-full gap-4 md:grid-cols-2' : 'relative z-10 flex w-full flex-col gap-4'}>
                  {table.phase === 'betting' && table.pendingChips.length > 0 ? <div className={useWidePlayerZone ? 'md:col-span-2' : ''}><BettingChipRack chips={table.pendingChips} totalLabel={money(table.pendingBet)} /></div> : null}
                  {table.playerHands.length === 0 ? <div className={useWidePlayerZone ? 'md:col-span-2' : ''}><EmptySlot label="아래 칩으로 베팅을 먼저 쌓아주세요." /></div> : table.playerHands.map((hand, index) => <HandPanel key={hand.id} hand={hand} index={index} active={table.phase === 'player' && index === table.activeHandIndex} multi={table.playerHands.length > 1} />)}
                </div>
              </div>
            </div>
          </div>

        </section>

        <aside className="flex flex-col gap-6">
          {showStatsView ? <Panel title="라운드 통계" icon={<BarChart3 className="h-5 w-5 text-emerald-300" />} badge="결과 화면"><StatRow label="현재 메시지" value={table.message} color="text-zinc-100" multiline /><StatRow label="진행 라운드" value={`#${Math.max(table.roundNumber - (table.phase === 'round-over' ? 1 : 0), 1)}`} color="text-zinc-100" /><StatRow label="보유 칩" value={money(table.bankroll)} color="text-amber-300" /><StatRow label="총 플레이" value={String(table.stats.rounds)} color="text-zinc-100" /><StatRow label="승리" value={String(table.stats.wins)} color="text-emerald-300" /><StatRow label="패배" value={String(table.stats.losses)} color="text-rose-300" /><StatRow label="무승부" value={String(table.stats.pushes)} color="text-zinc-100" /><StatRow label="블랙잭" value={String(table.stats.blackjacks)} color="text-amber-300" /><StatRow label="승률" value={percent(winRate)} color="text-zinc-100" /><button type="button" onClick={() => setShowStatsView(false)} className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black tracking-[0.18em] text-white transition hover:bg-white/10">닫기</button></Panel> : null}
          {settings.showBasicStrategy ? <Panel title="기본 전략" icon={<ShieldCheck className="h-5 w-5 text-emerald-400" />} badge="실시간"><div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/8 p-4"><p className="text-[11px] font-bold uppercase tracking-[0.35em] text-emerald-300">추천 액션</p><p className="mt-2 text-3xl font-black uppercase tracking-[0.18em] text-white">{recommendation ? actionLabel(recommendation.action) : '대기'}</p><p className="mt-3 text-sm leading-6 text-zinc-300">{recommendation?.reason ?? '라운드를 시작하면 현재 손패 기준의 추천 액션을 보여줍니다.'}</p></div><div className="grid grid-cols-2 gap-3"><SmallMetric label="안전 확률" value={analysis ? percent(analysis.safeProbability) : '-'} color="text-emerald-300" /><SmallMetric label="버스트 확률" value={analysis ? percent(analysis.bustProbability) : '-'} color="text-zinc-100" /></div></Panel> : null}
          <Panel title="분석 자료" icon={<BarChart3 className="h-5 w-5 text-emerald-300" />}><StatRow label="현재 메시지" value={table.message} color="text-zinc-100" multiline /><StatRow label="보유 칩" value={money(table.bankroll)} color="text-amber-300" /><StatRow label="대기 베팅" value={money(table.pendingBet)} color="text-zinc-100" /><StatRow label="플레이 중 베팅" value={money(liveBet)} color="text-zinc-100" /><StatRow label="남은 카드" value={analysis ? String(analysis.remainingCards) : String(table.shoe.length)} color="text-zinc-100" /><StatRow label="하이카드 비율" value={analysis ? percent(analysis.highCardRatio) : '-'} color="text-zinc-100" /><StatRow label="로우카드 비율" value={analysis ? percent(analysis.lowCardRatio) : '-'} color="text-zinc-100" /><StatRow label="러닝 카운트" value={analysis ? signed(analysis.runningCount) : '-'} color="text-emerald-300" /><StatRow label="트루 카운트" value={analysis ? signed(analysis.trueCount, 1) : '-'} color="text-amber-300" /></Panel>
          <Panel title="세션 통계" icon={<Trophy className="h-5 w-5 text-amber-300" />}><StatRow label="플레이 라운드" value={String(table.stats.rounds)} color="text-zinc-100" /><StatRow label="승리" value={String(table.stats.wins)} color="text-emerald-300" /><StatRow label="패배" value={String(table.stats.losses)} color="text-rose-300" /><StatRow label="무승부" value={String(table.stats.pushes)} color="text-zinc-100" /><StatRow label="블랙잭" value={String(table.stats.blackjacks)} color="text-amber-300" /><StatRow label="승률" value={percent(winRate)} color="text-zinc-100" /></Panel>
          <Panel title="칩 현황" icon={<Wallet className="h-5 w-5 text-amber-300" />}><StatRow label="초기 칩" value={money(STARTING_BANKROLL)} color="text-zinc-100" /><StatRow label="현재 스택" value={money(table.bankroll)} color="text-amber-300" /><StatRow label="칩 선택" value="$1 / $5 / $10 / $25 / $50" color="text-zinc-100" /></Panel>
        </aside>
        {useLandscapeControlDock ? null : (
          <div className="lg:col-span-2">
            <ControlDock
              table={table}
              activeHand={activeHand}
              compact={false}
              onAddChip={(chip) => setTable((current) => addChip(current, chip))}
              onResetBet={() => setTable((current) => ({...current, pendingBet: 0, pendingChips: []}))}
              onHit={() => setTable((current) => hitCurrentHand(current))}
              onStand={() => setTable((current) => standCurrentHand(current))}
              onDouble={() => setTable((current) => doubleCurrentHand(current))}
              onSplit={() => setTable((current) => splitCurrentHand(current))}
              onEarlyExit={() => {
                if (settings.confirmEarlyExit && !window.confirm('현재 세션을 조기 종료하고 새 게임을 시작할까요? 올려둔 칩은 정리되고 1라운드부터 다시 시작합니다.')) return;
                setShowStatsView(false);
                setHistoryEntries([]);
                setTable((current) => endSessionEarly(current));
              }}
              onStartRound={() => setTable((current) => startRound(current))}
            />
          </div>
        )}
      </main>
    </div>
  );
}

function addChip(table: TableState, chip: number): TableState { if (table.phase !== 'betting' || table.pendingBet + chip > table.bankroll) return table; const pendingBet = table.pendingBet + chip; return {...table, pendingBet, pendingChips: [...table.pendingChips, chip], message: `${money(chip)} 칩을 올렸습니다. 현재 베팅은 ${money(pendingBet)} 입니다.`}; }

function startRound(table: TableState): TableState {
  if (table.phase !== 'betting' || table.pendingBet <= 0 || table.pendingBet > table.bankroll) return table;
  let shoe = table.shoe.length <= SHUFFLE_AT ? createShuffledDeck(DECK_COUNT) : table.shoe;
  const p1 = drawCard(shoe); shoe = p1.shoe; const d1 = drawCard(shoe); shoe = d1.shoe; const p2 = drawCard(shoe); shoe = p2.shoe; const d2 = drawCard(shoe); shoe = d2.shoe;
  const hand = createHand([p1.card, p2.card], table.pendingBet);
  const next: TableState = {...table, shoe, dealerCards: [d1.card, d2.card], playerHands: [hand], activeHandIndex: 0, phase: 'player', bankroll: table.bankroll - table.pendingBet, pendingBet: 0, pendingChips: [], message: `${money(hand.bet)} 베팅으로 새 라운드를 시작했습니다.`};
  return hand.blackjack || summarizeHand(next.dealerCards).isBlackjack ? settleRound({...next, phase: 'dealer', message: '초기 블랙잭 여부를 확인합니다.'}) : next;
}

function hitCurrentHand(table: TableState): TableState {
  if (table.phase !== 'player') return table;
  const hand = table.playerHands[table.activeHandIndex];
  if (!hand || hand.isSplitAces) return table;
  const draw = drawCard(table.shoe);
  const cards = [...hand.cards, draw.card];
  const summary = summarizeHand(cards);
  const playerHands = [...table.playerHands];
  playerHands[table.activeHandIndex] = {...hand, cards, busted: summary.isBust, stood: summary.isBust || summary.total === 21, blackjack: false};
  return advanceTurn({...table, shoe: draw.shoe, playerHands, message: summary.isBust ? `손패 ${table.activeHandIndex + 1} 이(가) 버스트했습니다.` : `손패 ${table.activeHandIndex + 1} 에 ${rankLabel(draw.card)} 카드가 추가되었습니다.`});
}

function standCurrentHand(table: TableState): TableState { if (table.phase !== 'player') return table; const hand = table.playerHands[table.activeHandIndex]; if (!hand) return table; const playerHands = [...table.playerHands]; playerHands[table.activeHandIndex] = {...hand, stood: true}; return advanceTurn({...table, playerHands, message: `손패 ${table.activeHandIndex + 1} 이(가) 스탠드했습니다.`}); }

function doubleCurrentHand(table: TableState): TableState {
  if (table.phase !== 'player') return table;
  const hand = table.playerHands[table.activeHandIndex];
  if (!hand || !canDouble(hand, table.phase) || table.bankroll < hand.bet) return table;
  const draw = drawCard(table.shoe);
  const cards = [...hand.cards, draw.card];
  const summary = summarizeHand(cards);
  const playerHands = [...table.playerHands];
  playerHands[table.activeHandIndex] = {...hand, cards, bet: hand.bet * 2, doubled: true, busted: summary.isBust, stood: true, blackjack: false};
  return advanceTurn({...table, shoe: draw.shoe, bankroll: table.bankroll - hand.bet, playerHands, message: summary.isBust ? '더블다운 후 버스트했습니다.' : `더블다운으로 ${rankLabel(draw.card)} 을(를) 받았습니다.`});
}

function splitCurrentHand(table: TableState): TableState {
  if (table.phase !== 'player') return table;
  const hand = table.playerHands[table.activeHandIndex];
  if (!hand || !canSplit(hand, table.phase, table.playerHands.length) || table.bankroll < hand.bet) return table;
  const draw1 = drawCard(table.shoe); const draw2 = drawCard(draw1.shoe);
  const left = splitHand([hand.cards[0], draw1.card], hand.bet); const right = splitHand([hand.cards[1], draw2.card], hand.bet);
  const splitAces = hand.cards[0].rank === 'A' && hand.cards[1].rank === 'A';
  const playerHands = [...table.playerHands];
  playerHands.splice(table.activeHandIndex, 1, {...left, isSplitAces: splitAces, stood: splitAces || left.stood}, {...right, isSplitAces: splitAces, stood: splitAces || right.stood});
  return advanceTurn({...table, shoe: draw2.shoe, bankroll: table.bankroll - hand.bet, playerHands, message: splitAces ? 'A 분할 완료. 각 손패에 카드 1장씩만 배분하고 종료합니다.' : `스플릿 완료. ${money(hand.bet)} 이 추가로 반영되었습니다.`});
}

function splitHand(cards: Card[], bet: number): Hand { const hand = createHand(cards, bet); const summary = summarizeHand(cards); return {...hand, blackjack: false, stood: summary.total === 21, busted: summary.isBust}; }
function advanceTurn(table: TableState): TableState { const current = table.playerHands[table.activeHandIndex]; if (!current || (!current.stood && !current.busted)) return table; const nextIndex = table.playerHands.findIndex((hand, index) => index > table.activeHandIndex && !hand.stood && !hand.busted); return nextIndex >= 0 ? {...table, activeHandIndex: nextIndex, message: `${table.message} 이제 손패 ${nextIndex + 1} 차례입니다.`} : settleRound({...table, phase: 'dealer', message: `${table.message} 딜러 턴을 시작합니다.`}); }

function settleRound(table: TableState): TableState {
  let shoe = table.shoe; const dealerCards = [...table.dealerCards];
  while (shouldDealerHit(dealerCards)) { const draw = drawCard(shoe); dealerCards.push(draw.card); shoe = draw.shoe; }
  const dealerSummary = summarizeHand(dealerCards);
  const playerHands = table.playerHands.map((hand) => ({...hand, result: compareHands(summarizeHand(hand.cards), dealerSummary), stood: true}));
  const payout = playerHands.reduce((sum, hand) => sum + payoutOf(hand), 0);
  const statsDelta = playerHands.reduce((acc, hand) => { if (hand.result === 'win') acc.wins += 1; if (hand.result === 'lose') acc.losses += 1; if (hand.result === 'push') acc.pushes += 1; if (hand.result === 'blackjack') { acc.wins += 1; acc.blackjacks += 1; } return acc; }, {wins: 0, losses: 0, pushes: 0, blackjacks: 0});
  return {...table, shoe, dealerCards, playerHands, phase: 'round-over', bankroll: table.bankroll + payout, pendingBet: 0, roundNumber: table.roundNumber + 1, stats: {rounds: table.stats.rounds + 1, wins: table.stats.wins + statsDelta.wins, losses: table.stats.losses + statsDelta.losses, pushes: table.stats.pushes + statsDelta.pushes, blackjacks: table.stats.blackjacks + statsDelta.blackjacks}, message: `${roundSummary(playerHands, dealerSummary.total)} 정산 금액은 ${money(payout)} 입니다.`};
}

function prepareNextRound(table: TableState): TableState { return table.phase !== 'round-over' || table.bankroll <= 0 ? table : {...table, dealerCards: [], playerHands: [], activeHandIndex: 0, phase: 'betting', pendingBet: 0, pendingChips: [], message: INITIAL_MESSAGE}; }
function endSessionEarly(table: TableState): TableState {
  const refunded = table.pendingBet + table.playerHands.reduce((sum, hand) => sum + hand.bet, 0);
  return createInitialTableState(refunded > 0 ? `조기 종료 후 ${money(refunded)} 칩을 정리하고 새 게임을 시작합니다.` : '조기 종료 후 새 게임을 시작합니다.');
}
function restartSessionAfterBust(): TableState { return createInitialTableState('칩 스택을 다시 채워 새 게임을 시작합니다.'); }
function payoutOf(hand: Hand): number { if (hand.result === 'push') return hand.bet; if (hand.result === 'win') return hand.bet * 2; if (hand.result === 'blackjack') return hand.bet * 2.5; return 0; }
function roundHeadline(hands: Hand[]): string { const results = hands.map((hand) => hand.result).filter(Boolean); if (results.length === 0) return '결과 확인'; if (results.every((result) => result === 'push')) return '무승부'; if (results.every((result) => result === 'lose')) return '패배'; if (results.every((result) => result === 'win' || result === 'blackjack')) return '승리'; return '결과 확인'; }
function roundSummary(hands: Hand[], dealerTotal: number): string { return `딜러 최종 합은 ${dealerTotal}입니다. ${hands.map((hand, index) => `손패 ${index + 1}: ${formatResult(hand.result)}`).join(' / ')}.`; }
function money(value: number): string { return `$${value.toLocaleString()}`; }
function signedMoney(value: number): string { return `${value >= 0 ? '+' : '-'}$${Math.abs(value).toLocaleString()}`; }
function percent(value: number): string { return `${(value * 100).toFixed(1)}%`; }
function signed(value: number, digits = 0): string { return `${value >= 0 ? '+' : ''}${value.toFixed(digits)}`; }
function actionLabel(action: 'Hit' | 'Stand' | 'Double' | 'Split'): string { if (action === 'Hit') return '히트'; if (action === 'Stand') return '스탠드'; if (action === 'Double') return '더블'; return '스플릿'; }
function rankLabel(card?: Card): string { return card ? `${card.rank}${suitLabel(card.suit)}` : '?'; }
function suitLabel(suit: Card['suit']): string { if (suit === 'spades') return '스페이드'; if (suit === 'hearts') return '하트'; if (suit === 'diamonds') return '다이아'; return '클로버'; }
function suitIcon(suit: Card['suit']): string { if (suit === 'spades') return spadeIcon; if (suit === 'hearts') return heartIcon; if (suit === 'diamonds') return diamondIcon; return clubIcon; }
function pushHistory(setHistoryEntries: Dispatch<SetStateAction<HistoryEntry[]>>, table: TableState, roundNumber: number, delta: number) { const headline = roundHeadline(table.playerHands); const entry: HistoryEntry = {id: `${roundNumber}-${Date.now()}`, roundNumber, headline, message: table.message, bankroll: table.bankroll, delta, timestamp: new Date().toLocaleTimeString('ko-KR', {hour: '2-digit', minute: '2-digit'})}; setHistoryEntries((current) => [entry, ...current]); }

function RoundOver({table, onReplay, replayLabel, onStats}: {table: TableState; onReplay: () => void; replayLabel: string; onStats: () => void}) { const headline = roundHeadline(table.playerHands); return <div className="absolute inset-0 z-20 flex items-center justify-center rounded-[1.6rem] bg-black/55 p-6 backdrop-blur-sm"><div className="w-full max-w-md rounded-[1.6rem] border border-white/10 bg-[#08110c]/95 p-6 text-center shadow-2xl"><p className="text-[11px] font-bold uppercase tracking-[0.34em] text-emerald-300">{headline}</p><p className="mt-3 text-2xl font-black text-white">{headline} 결과입니다</p><p className="mt-3 text-sm leading-6 text-zinc-300">{table.message}</p>{table.bankroll <= 0 ? <p className="mt-3 text-sm font-bold text-rose-300">칩 스택이 바닥났습니다. 통계를 확인하거나 새 세션으로 다시 시작하세요.</p> : null}<div className="mt-6 grid gap-3 sm:grid-cols-2"><button type="button" onClick={onReplay} className="rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-black tracking-[0.18em] text-black transition hover:bg-emerald-400">{replayLabel}</button><button type="button" onClick={onStats} className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-black tracking-[0.18em] text-white transition hover:bg-white/10">통계 보기</button></div></div></div>; }
function StatsOverlay({roundNumber, message, bankroll, dealerTotal, roundWager, roundPayout, roundNet, sessionResults, stats, winRate, hands, historyEntries, sessionNet, averageRoundNet, bestRound, worstRound, isBankrupt, onClose}: {roundNumber: number; message: string; bankroll: number; dealerTotal: number | null; roundWager: number; roundPayout: number; roundNet: number; sessionResults: {wins: number; losses: number; pushes: number; blackjacks: number}; stats: SessionStats; winRate: number; hands: Hand[]; historyEntries: HistoryEntry[]; sessionNet: number; averageRoundNet: number; bestRound: HistoryEntry | null; worstRound: HistoryEntry | null; isBankrupt: boolean; onClose: () => void}) { const sessionResultTotal = Math.max(sessionResults.wins + sessionResults.losses + sessionResults.pushes + sessionResults.blackjacks, 1); return <div className="fixed inset-0 z-[80] bg-black/70 p-4 backdrop-blur-md"><div className="mx-auto flex h-full max-w-7xl flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-[#07110d]/95 shadow-2xl"><div className="flex items-center justify-between border-b border-white/10 px-6 py-4"><div><p className="text-[11px] font-bold uppercase tracking-[0.34em] text-emerald-300">{isBankrupt ? '세션 종료 통계' : '통계 보기'}</p><h2 className="mt-1 text-2xl font-black text-white">{isBankrupt ? `파산으로 종료된 전체 통계 · 라운드 #${roundNumber}` : `라운드 #${roundNumber} 결과 분석`}</h2></div><button type="button" onClick={onClose} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-black tracking-[0.18em] text-white transition hover:bg-white/10">닫기</button></div><div className="grid flex-1 gap-6 overflow-auto p-6 lg:grid-cols-[1.2fr_1fr]"><section className="space-y-6"><div className={`rounded-[1.5rem] border p-5 ${isBankrupt ? 'border-rose-400/20 bg-rose-500/8' : 'border-white/10 bg-white/5'}`}><p className={`text-[11px] font-bold uppercase tracking-[0.32em] ${isBankrupt ? 'text-rose-300' : 'text-zinc-500'}`}>{isBankrupt ? '마지막 라운드 + 세션 종료' : '요약'}</p><p className="mt-3 text-sm leading-7 text-zinc-200">{message}</p>{isBankrupt ? <p className="mt-3 text-sm font-bold text-rose-200">칩 스택이 $0이 되어 이번 라운드와 전체 라운드 통계를 함께 표시합니다.</p> : null}<div className="mt-5 grid gap-3 sm:grid-cols-4"><SummaryTile label="딜러 합계" value={dealerTotal === null ? '-' : String(dealerTotal)} color="text-white" /><SummaryTile label="총 베팅" value={money(roundWager)} color="text-amber-300" /><SummaryTile label="정산 금액" value={money(roundPayout)} color="text-emerald-300" /><SummaryTile label="순손익" value={signedMoney(roundNet)} color={roundNet >= 0 ? 'text-emerald-300' : 'text-rose-300'} /></div></div><div className="grid gap-4 md:grid-cols-2">{hands.map((hand, index) => <div key={hand.id} className="rounded-[1.5rem] border border-white/10 bg-black/20 p-5"><div className="flex items-center justify-between gap-3"><div><p className="text-[11px] font-bold uppercase tracking-[0.28em] text-zinc-500">손패 {index + 1}</p><p className="mt-2 text-xl font-black text-white">{summarizeHand(hand.cards).total}</p></div><div className="text-right"><p className="text-[11px] font-bold uppercase tracking-[0.28em] text-zinc-500">결과</p><p className="mt-2 text-base font-black text-white">{formatResult(hand.result)}</p></div></div><div className="mt-4 grid gap-2 text-sm text-zinc-300"><InlineStat label="베팅" value={money(hand.bet)} /><InlineStat label="카드 수" value={String(hand.cards.length)} /><InlineStat label="상태" value={`${hand.busted ? '버스트 ' : ''}${hand.blackjack ? '블랙잭 ' : ''}${hand.doubled ? '더블 ' : ''}${hand.isSplitAces ? 'A 분할' : ''}`.trim() || '일반'} /></div></div>)}</div><div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5"><div className="flex items-center justify-between gap-3"><p className="text-[11px] font-bold uppercase tracking-[0.32em] text-zinc-500">전체 라운드 기록</p><span className="rounded-full border border-white/10 bg-black/20 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-zinc-400">{historyEntries.length} rounds</span></div><div className="mt-4 space-y-3">{historyEntries.length === 0 ? <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-5 text-sm text-zinc-400">기록된 라운드가 없습니다.</div> : historyEntries.map((entry) => <div key={entry.id} className="rounded-2xl border border-white/10 bg-black/20 p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-[11px] font-bold uppercase tracking-[0.28em] text-zinc-500">라운드 #{entry.roundNumber}</p><p className="mt-1 text-base font-black text-white">{entry.headline}</p></div><div className="text-right"><p className={`font-mono text-sm font-bold ${entry.delta >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{signedMoney(entry.delta)}</p><p className="mt-1 text-xs text-zinc-500">{entry.timestamp}</p></div></div><p className="mt-3 text-sm leading-6 text-zinc-300">{entry.message}</p><div className="mt-3 flex items-center justify-between text-sm"><span className="text-zinc-500">종료 후 칩 스택</span><span className="font-mono text-amber-300">{money(entry.bankroll)}</span></div></div>)}</div></div></section><aside className="space-y-6"><div className="rounded-[1.5rem] border border-emerald-400/20 bg-emerald-500/8 p-5"><p className="text-[11px] font-bold uppercase tracking-[0.32em] text-emerald-300">전체 결과 분포</p><div className="mt-4 space-y-3"><ProgressRow label="승리" count={sessionResults.wins} color="bg-emerald-400" total={sessionResultTotal} /><ProgressRow label="패배" count={sessionResults.losses} color="bg-rose-400" total={sessionResultTotal} /><ProgressRow label="무승부" count={sessionResults.pushes} color="bg-zinc-300" total={sessionResultTotal} /><ProgressRow label="블랙잭" count={sessionResults.blackjacks} color="bg-amber-300" total={sessionResultTotal} /></div></div><div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5"><p className="text-[11px] font-bold uppercase tracking-[0.32em] text-zinc-500">전체 라운드 누적</p><div className="mt-5 grid gap-3 sm:grid-cols-2"><SummaryTile label="총 라운드" value={String(stats.rounds)} color="text-white" /><SummaryTile label="누적 손익" value={signedMoney(sessionNet)} color={sessionNet >= 0 ? 'text-emerald-300' : 'text-rose-300'} /><SummaryTile label="평균 손익" value={signedMoney(averageRoundNet)} color={averageRoundNet >= 0 ? 'text-emerald-300' : 'text-rose-300'} /><SummaryTile label="현재 칩 스택" value={money(bankroll)} color="text-amber-300" /></div><div className="mt-5 space-y-3"><InlineStat label="총 승리" value={String(stats.wins)} /><InlineStat label="총 패배" value={String(stats.losses)} /><InlineStat label="총 무승부" value={String(stats.pushes)} /><InlineStat label="총 블랙잭" value={String(stats.blackjacks)} /><InlineStat label="승률" value={percent(winRate)} /><InlineStat label="최고 수익 라운드" value={bestRound ? `#${bestRound.roundNumber} ${signedMoney(bestRound.delta)}` : '-'} /><InlineStat label="최대 손실 라운드" value={worstRound ? `#${worstRound.roundNumber} ${signedMoney(worstRound.delta)}` : '-'} /></div></div><div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5"><p className="text-[11px] font-bold uppercase tracking-[0.32em] text-zinc-500">해석 포인트</p><ul className="mt-4 space-y-3 text-sm leading-6 text-zinc-300"><li>이번 판의 총 베팅과 정산 금액 차이로 기대값 개념을 바로 볼 수 있습니다.</li><li>전체 라운드 기록을 함께 보면 파산 직전까지의 흐름과 변동 폭을 한 번에 확인할 수 있습니다.</li><li>누적 결과 분포는 마지막 한 판이 아니라 세션 전체 손패 기준으로 집계됩니다.</li></ul></div></aside></div></div></div>; }
function HistoryOverlay({entries, onClose}: {entries: HistoryEntry[]; onClose: () => void}) { return <div className="fixed inset-0 z-[80] bg-black/70 p-4 backdrop-blur-md"><div className="mx-auto flex h-full max-w-3xl flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-[#07110d]/95 shadow-2xl"><div className="flex items-center justify-between border-b border-white/10 px-6 py-4"><div><p className="text-[11px] font-bold uppercase tracking-[0.34em] text-emerald-300">기록 보기</p><h2 className="mt-1 text-2xl font-black text-white">전체 라운드 기록</h2></div><button type="button" onClick={onClose} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-black tracking-[0.18em] text-white transition hover:bg-white/10">닫기</button></div><div className="flex-1 space-y-3 overflow-auto p-6">{entries.length === 0 ? <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-8 text-center text-zinc-400">아직 기록이 없습니다.</div> : entries.map((entry) => <div key={entry.id} className="rounded-2xl border border-white/10 bg-white/5 p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-[11px] font-bold uppercase tracking-[0.28em] text-zinc-500">라운드 #{entry.roundNumber}</p><p className="mt-1 text-lg font-black text-white">{entry.headline}</p></div><div className="text-right"><p className="font-mono text-sm font-bold text-white">{signedMoney(entry.delta)}</p><p className="mt-1 text-xs text-zinc-500">{entry.timestamp}</p></div></div><p className="mt-3 text-sm leading-6 text-zinc-300">{entry.message}</p><div className="mt-3 flex items-center justify-between text-sm"><span className="text-zinc-500">종료 후 칩 스택</span><span className="font-mono text-amber-300">{money(entry.bankroll)}</span></div></div>)}</div></div></div>; }
function ControlDock({table, activeHand, compact, onAddChip, onResetBet, onHit, onStand, onDouble, onSplit, onEarlyExit, onStartRound}: {table: TableState; activeHand: Hand | null; compact: boolean; onAddChip: (chip: number) => void; onResetBet: () => void; onHit: () => void; onStand: () => void; onDouble: () => void; onSplit: () => void; onEarlyExit: () => void; onStartRound: () => void}) {
  const canUseDouble = !!activeHand && table.phase !== 'betting' && canDouble(activeHand, table.phase) && table.bankroll >= activeHand.bet;
  const canUseSplit = !!activeHand && table.phase !== 'betting' && canSplit(activeHand, table.phase, table.playerHands.length) && table.bankroll >= activeHand.bet;
  return <div className={`flex flex-col gap-4 ${compact ? 'xl:sticky xl:top-24' : ''}`}>
    <div className="rounded-[1.75rem] border border-white/8 bg-black/20 p-5">
      <div className="flex flex-col gap-4">
        <div><p className="text-[11px] font-bold uppercase tracking-[0.34em] text-zinc-500">베팅 칩</p><p className="mt-2 text-sm text-zinc-300">$1, $5, $10, $25, $50 칩을 올려 베팅을 쌓습니다.</p></div>
        <div className="flex flex-wrap gap-3">{CHIP_VALUES.map((chip) => <ChipButton key={chip} value={chip} label={money(chip)} onClick={() => onAddChip(chip)} disabled={table.phase !== 'betting' || table.pendingBet + chip > table.bankroll} />)}<ChipButton label="초기화" onClick={onResetBet} disabled={table.phase !== 'betting' || table.pendingBet === 0} subtle /></div>
        {table.pendingChips.length > 0 ? <div className="rounded-2xl border border-white/10 bg-black/20 p-3"><div className="mb-3 flex items-center justify-between gap-3"><span className="text-[10px] font-bold uppercase tracking-[0.28em] text-zinc-500">올린 칩</span><span className="font-mono text-sm font-bold text-amber-300">{money(table.pendingBet)}</span></div><div className="flex flex-wrap gap-2">{table.pendingChips.map((chip, index) => <CasinoChip key={`${chip}-${index}`} value={chip} label={money(chip)} compact />)}</div></div> : null}
      </div>
    </div>
    <div className={`grid gap-3 ${compact ? 'grid-cols-1' : 'grid-cols-2 sm:grid-cols-4'}`}>
      <ActionButton label="히트" sub="카드 추가" onClick={onHit} disabled={table.phase !== 'player'} />
      <ActionButton label="스탠드" sub="턴 종료" onClick={onStand} disabled={table.phase !== 'player'} />
      <ActionButton label="더블" sub="베팅 2배" onClick={onDouble} disabled={!canUseDouble} />
      <ActionButton label="스플릿" sub={canUseSplit ? '가능' : '불가'} onClick={onSplit} disabled={!canUseSplit} />
    </div>
    <button type="button" onClick={onEarlyExit} disabled={table.phase === 'round-over'} className={`rounded-2xl px-8 py-3 text-sm font-black tracking-[0.24em] transition ${table.phase !== 'round-over' ? 'border border-rose-400/30 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20' : 'cursor-not-allowed bg-white/10 text-zinc-500'}`}>조기 종료하기</button>
    <button type="button" onClick={onStartRound} disabled={table.phase !== 'betting' || table.pendingBet === 0} className={`rounded-2xl px-12 py-4 text-sm font-black uppercase tracking-[0.35em] transition active:scale-[0.98] ${table.phase === 'betting' && table.pendingBet > 0 ? 'bg-emerald-500 text-black hover:bg-emerald-400' : 'cursor-not-allowed bg-white/10 text-zinc-500'}`}>새 라운드</button>
  </div>;
}
function SettingsOverlay({settings, onClose, onChange}: {settings: UISettings; onClose: () => void; onChange: Dispatch<SetStateAction<UISettings>>}) { return <div className="fixed inset-0 z-[80] bg-black/70 p-4 backdrop-blur-md"><div className="mx-auto flex h-full max-w-2xl flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-[#07110d]/95 shadow-2xl"><div className="flex items-center justify-between border-b border-white/10 px-6 py-4"><div><p className="text-[11px] font-bold uppercase tracking-[0.34em] text-emerald-300">설정</p><h2 className="mt-1 text-2xl font-black text-white">테이블 옵션</h2></div><button type="button" onClick={onClose} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-black tracking-[0.18em] text-white transition hover:bg-white/10">닫기</button></div><div className="flex-1 space-y-4 overflow-auto p-6"><ToggleRow label="기본 전략 보기" desc="오른쪽 패널의 기본 전략 카드 표시를 켜고 끕니다." checked={settings.showBasicStrategy} onToggle={() => onChange((current) => ({...current, showBasicStrategy: !current.showBasicStrategy}))} /><ToggleRow label="가로 모드 왼쪽 조작" desc="가로 비율이 긴 화면에서는 베팅과 액션 버튼을 게임판 왼쪽에 배치합니다." checked={settings.landscapeControlsLeft} onToggle={() => onChange((current) => ({...current, landscapeControlsLeft: !current.landscapeControlsLeft}))} /><ToggleRow label="파산 팝업" desc="칩 스택이 $0이 되면 파산 알림을 표시합니다." checked={settings.bankruptcyAlert} onToggle={() => onChange((current) => ({...current, bankruptcyAlert: !current.bankruptcyAlert}))} /><ToggleRow label="조기 종료 확인" desc="조기 종료 전에 한 번 더 확인합니다." checked={settings.confirmEarlyExit} onToggle={() => onChange((current) => ({...current, confirmEarlyExit: !current.confirmEarlyExit}))} /></div></div></div>; }
function HandPanel({hand, index, active, multi}: {key?: string; hand: Hand; index: number; active: boolean; multi: boolean}) { const summary = summarizeHand(hand.cards); return <div className={`rounded-[1.4rem] border p-4 ${active ? 'border-emerald-400/30 bg-black/20' : 'border-white/8 bg-black/10'}`}><div className="mb-3 flex items-center justify-between gap-3"><Badge icon={<User className="h-3 w-3" />} label={multi ? `손패 ${index + 1}` : '플레이어'} value={String(summary.total)} tone="emerald" /><div className="text-right"><p className="text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-500">베팅 {money(hand.bet)}</p><p className="mt-1 text-[11px] font-bold uppercase tracking-[0.25em] text-zinc-400">{formatResult(hand.result)}</p></div></div><div className="flex flex-wrap gap-3">{hand.cards.map((card, cardIndex) => <TableCard key={card.id} card={card} delay={0.12 + cardIndex * 0.08} />)}</div><div className="mt-3 flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-[0.24em] text-zinc-400">{active ? <Chip label="현재 턴" active /> : null}{hand.doubled ? <Chip label="더블" /> : null}{hand.blackjack ? <Chip label="블랙잭" /> : null}{hand.busted ? <Chip label="버스트" /> : null}{hand.isSplitAces ? <Chip label="A 분할" /> : null}</div></div>; }
function TableCard({card, hidden, delay}: {key?: string; card: Card; hidden?: boolean; delay: number}) { if (hidden) return <div className="relative flex h-28 w-20 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 shadow-2xl" style={{animationDelay: `${delay}s`}}><div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,rgba(255,255,255,0.07)_0px,rgba(255,255,255,0.07)_2px,transparent_2px,transparent_10px)] opacity-20" /><div className="flex h-16 w-12 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-500/10"><Zap className="h-6 w-6 text-emerald-300" /></div></div>; const icon = suitIcon(card.suit); const suit = suitLabel(card.suit); const red = card.suit === 'hearts' || card.suit === 'diamonds'; return <div className="group relative flex h-28 w-20 cursor-pointer flex-col justify-between overflow-hidden rounded-2xl bg-white p-2 text-zinc-900 shadow-2xl transition hover:-translate-y-2" style={{animationDelay: `${delay}s`}}><div className={`text-lg font-black leading-none ${red ? 'text-rose-600' : 'text-zinc-900'}`}>{card.rank}<div className="mt-0.5 flex h-4 items-center"><img src={icon} alt={suit} className="h-3.5 w-3.5" /></div></div><div className="absolute left-1/2 top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center opacity-10 transition group-hover:scale-110"><img src={icon} alt="" aria-hidden="true" className="h-8 w-8" /></div><div className={`self-end rotate-180 text-lg font-black leading-none ${red ? 'text-rose-600' : 'text-zinc-900'}`}>{card.rank}<div className="mt-0.5 flex h-4 items-center"><img src={icon} alt={suit} className="h-3.5 w-3.5" /></div></div></div>; }
