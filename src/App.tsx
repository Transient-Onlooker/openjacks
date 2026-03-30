import {BarChart3, Coins, History, Settings, ShieldCheck, Trophy, User, Wallet, Zap} from 'lucide-react';
import {motion} from 'motion/react';
import type {ReactNode} from 'react';
import {useState} from 'react';
import {
  analyzeHand,
  canDouble,
  canSplit,
  compareHands,
  createHand,
  createShuffledDeck,
  dealerShouldReveal,
  drawCard,
  formatResult,
  getExposedCards,
  getRecommendation,
  shouldDealerHit,
  summarizeHand,
  type Card,
  type Hand,
  type SessionStats,
} from './blackjack';

type Phase = 'betting' | 'player' | 'dealer' | 'round-over';

type TableState = {
  shoe: Card[];
  dealerCards: Card[];
  playerHands: Hand[];
  activeHandIndex: number;
  phase: Phase;
  message: string;
  stats: SessionStats;
  roundNumber: number;
  bankroll: number;
  pendingBet: number;
};

const STARTING_BANKROLL = 1000;
const CHIP_VALUES = [100, 200, 300, 500];
const SHUFFLE_AT = 15;
const DECK_COUNT = 1;
const INITIAL_STATS: SessionStats = {rounds: 0, wins: 0, losses: 0, pushes: 0, blackjacks: 0};

export default function App() {
  const [table, setTable] = useState<TableState>(() => ({
    shoe: createShuffledDeck(DECK_COUNT),
    dealerCards: [],
    playerHands: [],
    activeHandIndex: 0,
    phase: 'betting',
    message: '칩을 눌러 베팅을 쌓은 뒤 새 라운드를 시작하세요.',
    stats: INITIAL_STATS,
    roundNumber: 1,
    bankroll: STARTING_BANKROLL,
    pendingBet: 0,
  }));

  const dealerRevealed =
    table.dealerCards.length > 0 &&
    dealerShouldReveal(table.dealerCards, table.phase === 'betting' ? 'round-over' : table.phase);
  const exposedCards = getExposedCards(table.playerHands, table.dealerCards, dealerRevealed);
  const activeHand = table.playerHands[table.activeHandIndex] ?? null;
  const dealerSummary = table.dealerCards.length > 0 ? summarizeHand(table.dealerCards) : null;
  const analysis = activeHand ? analyzeHand(activeHand, table.shoe, exposedCards) : null;
  const recommendation =
    activeHand && table.dealerCards[0] ? getRecommendation(activeHand, table.dealerCards[0]) : null;
  const played = table.stats.wins + table.stats.losses + table.stats.pushes;
  const winRate = played === 0 ? 0 : table.stats.wins / played;
  const liveBet = table.playerHands.reduce((sum, hand) => sum + hand.bet, 0);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#153725_0%,_#08110c_45%,_#040706_100%)] text-zinc-100">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(16,185,129,0.08),transparent_35%,rgba(250,204,21,0.05)_70%,transparent)]" />

      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/30 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.35)]">
              <Zap className="h-5 w-5 fill-current text-black" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.35em] text-emerald-300/80">실전 테이블</p>
              <h1 className="text-lg font-black uppercase tracking-[0.2em] text-white">Openjacks</h1>
            </div>
          </div>
          <div className="hidden items-center gap-8 md:flex">
            <Metric label="라운드" value={`#${table.roundNumber}`} accent="text-emerald-300" />
            <Metric label="보유금" value={money(table.bankroll)} accent="text-amber-300" />
            <Metric label="대기 베팅" value={money(table.pendingBet)} accent="text-white" />
          </div>
          <div className="flex items-center gap-2">
            <IconButton icon={<History className="h-5 w-5" />} />
            <IconButton icon={<Settings className="h-5 w-5" />} />
          </div>
        </div>
      </header>

      <main className="relative mx-auto grid max-w-7xl gap-8 px-4 py-8 lg:grid-cols-12">
        <section className="flex flex-col gap-6 lg:col-span-8">
          <div className="relative overflow-hidden rounded-[2rem] border border-emerald-400/20 bg-[#0d2c1f] p-4 shadow-[0_30px_120px_rgba(0,0,0,0.45)] sm:p-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.35)_100%)] opacity-90" />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),transparent_22%,transparent_75%,rgba(0,0,0,0.25))]" />
            <div className="relative flex min-h-[34rem] flex-col justify-between gap-8 rounded-[1.6rem] border border-white/8 px-4 py-8 sm:px-8">
              <div className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 text-center opacity-20 md:block">
                <p className="text-5xl font-black uppercase tracking-[0.16em] text-white">Blackjack</p>
                <p className="mt-3 text-xs font-bold uppercase tracking-[0.6em] text-white/80">Pays 3 To 2</p>
                <div className="mx-auto mt-5 h-px w-56 bg-white/40" />
                <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.4em] text-white/80">Dealer stands on all 17s</p>
              </div>

              <div className="relative z-10 flex flex-col items-center gap-4">
                <Badge
                  icon={<History className="h-3 w-3" />}
                  label="딜러"
                  value={
                    table.dealerCards.length === 0
                      ? '-'
                      : dealerRevealed && dealerSummary
                        ? String(dealerSummary.total)
                        : `${rankLabel(table.dealerCards[0])}+?`
                  }
                  tone="slate"
                />
                <div className="flex flex-wrap justify-center gap-3">
                  {table.dealerCards.length === 0 ? (
                    <EmptySlot label="베팅 후 라운드를 시작하세요" />
                  ) : (
                    table.dealerCards.map((card, index) => (
                      <TableCard key={card.id} card={card} hidden={!dealerRevealed && index === 1} delay={index * 0.08} />
                    ))
                  )}
                </div>
              </div>

              <div className="relative z-10 grid w-full gap-4 md:grid-cols-2">
                {table.playerHands.length === 0 ? (
                  <div className="md:col-span-2">
                    <EmptySlot label="아래 칩으로 베팅을 누적하세요" />
                  </div>
                ) : (
                  table.playerHands.map((hand, index) => {
                    const summary = summarizeHand(hand.cards);
                    const isActive = table.phase === 'player' && index === table.activeHandIndex;
                    return (
                      <div
                        key={hand.id}
                        className={`rounded-[1.4rem] border p-4 ${isActive ? 'border-emerald-400/30 bg-black/20' : 'border-white/8 bg-black/10'}`}
                      >
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <Badge icon={<User className="h-3 w-3" />} label={table.playerHands.length > 1 ? `손패 ${index + 1}` : '플레이어'} value={String(summary.total)} tone="emerald" />
                          <div className="text-right">
                            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-500">베팅 {money(hand.bet)}</p>
                            <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.25em] text-zinc-400">{formatResult(hand.result)}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-3">
                          {hand.cards.map((card, cardIndex) => (
                            <TableCard key={card.id} card={card} delay={0.12 + cardIndex * 0.08} />
                          ))}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-[0.24em] text-zinc-400">
                          {isActive ? <Chip label="현재 턴" active /> : null}
                          {hand.doubled ? <Chip label="더블" /> : null}
                          {hand.blackjack ? <Chip label="블랙잭" /> : null}
                          {hand.busted ? <Chip label="버스트" /> : null}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-white/8 bg-black/20 p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.34em] text-zinc-500">베팅 칩</p>
                <p className="mt-2 text-sm text-zinc-300">100, 200, 300, 500을 여러 번 눌러 누적할 수 있습니다.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                {CHIP_VALUES.map((chip) => (
                  <ChipButton
                    key={chip}
                    label={money(chip)}
                    onClick={() => setTable((current) => addChip(current, chip))}
                    disabled={table.phase !== 'betting' || table.pendingBet + chip > table.bankroll}
                  />
                ))}
                <ChipButton
                  label="초기화"
                  onClick={() => setTable((current) => ({...current, pendingBet: 0}))}
                  disabled={table.phase !== 'betting' || table.pendingBet === 0}
                  subtle
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <ActionButton label="히트" sub="카드 추가" onClick={() => setTable((c) => hitCurrentHand(c))} disabled={table.phase !== 'player'} />
            <ActionButton label="스탠드" sub="턴 종료" onClick={() => setTable((c) => standCurrentHand(c))} disabled={table.phase !== 'player'} />
            <ActionButton
              label="더블"
              sub="배팅 2배"
              onClick={() => setTable((c) => doubleCurrentHand(c))}
              disabled={!activeHand || !canDouble(activeHand, table.phase) || table.bankroll < activeHand.bet}
            />
            <ActionButton
              label="스플릿"
              sub={activeHand && canSplit(activeHand, table.phase, table.playerHands.length) && table.bankroll >= activeHand.bet ? '한 번 가능' : '지금 불가'}
              onClick={() => setTable((c) => splitCurrentHand(c))}
              disabled={!activeHand || !canSplit(activeHand, table.phase, table.playerHands.length) || table.bankroll < activeHand.bet}
            />
          </div>

          <button
            type="button"
            onClick={() => setTable((current) => startRound(current))}
            disabled={table.phase !== 'betting' || table.pendingBet === 0}
            className={`self-center rounded-2xl px-12 py-4 text-sm font-black uppercase tracking-[0.35em] transition active:scale-[0.98] ${
              table.phase === 'betting' && table.pendingBet > 0 ? 'bg-emerald-500 text-black hover:bg-emerald-400' : 'cursor-not-allowed bg-white/10 text-zinc-500'
            }`}
          >
            새 라운드
          </button>
        </section>

        <aside className="flex flex-col gap-6 lg:col-span-4">
          <Panel title="전략 어드바이저" icon={<ShieldCheck className="h-5 w-5 text-emerald-400" />} badge="실시간">
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/8 p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.35em] text-emerald-300">추천 액션</p>
              <p className="mt-2 text-3xl font-black uppercase tracking-[0.18em] text-white">{recommendation ? actionLabel(recommendation.action) : '대기'}</p>
              <p className="mt-3 text-sm leading-6 text-zinc-300">{recommendation?.reason ?? '라운드가 시작되면 추천 액션이 여기에 표시됩니다.'}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <SmallMetric label="안전 확률" value={analysis ? percent(analysis.safeProbability) : '-'} color="text-emerald-300" />
              <SmallMetric label="버스트 위험" value={analysis ? percent(analysis.bustProbability) : '-'} color="text-zinc-100" />
            </div>
          </Panel>

          <Panel title="분석 자료" icon={<BarChart3 className="h-5 w-5 text-emerald-300" />}>
            <StatRow label="현재 메시지" value={table.message} color="text-zinc-100" multiline />
            <StatRow label="보유금" value={money(table.bankroll)} color="text-amber-300" />
            <StatRow label="대기 베팅" value={money(table.pendingBet)} color="text-zinc-100" />
            <StatRow label="플레이 중 배팅" value={money(liveBet)} color="text-zinc-100" />
            <StatRow label="남은 카드" value={analysis ? String(analysis.remainingCards) : String(table.shoe.length)} color="text-zinc-100" />
            <StatRow label="하이 카드 비율" value={analysis ? percent(analysis.highCardRatio) : '-'} color="text-zinc-100" />
            <StatRow label="로우 카드 비율" value={analysis ? percent(analysis.lowCardRatio) : '-'} color="text-zinc-100" />
            <StatRow label="러닝 카운트" value={analysis ? signed(analysis.runningCount) : '-'} color="text-emerald-300" />
            <StatRow label="트루 카운트" value={analysis ? signed(analysis.trueCount, 1) : '-'} color="text-amber-300" />
          </Panel>

          <Panel title="세션 인사이트" icon={<Trophy className="h-5 w-5 text-amber-300" />}>
            <StatRow label="플레이 라운드" value={String(table.stats.rounds)} color="text-zinc-100" />
            <StatRow label="승리" value={String(table.stats.wins)} color="text-emerald-300" />
            <StatRow label="패배" value={String(table.stats.losses)} color="text-rose-300" />
            <StatRow label="무승부" value={String(table.stats.pushes)} color="text-zinc-100" />
            <StatRow label="블랙잭" value={String(table.stats.blackjacks)} color="text-amber-300" />
            <StatRow label="승률" value={percent(winRate)} color="text-zinc-100" />
          </Panel>

          <Panel title="자금 현황" icon={<Wallet className="h-5 w-5 text-amber-300" />}>
            <StatRow label="기본 자금" value={money(STARTING_BANKROLL)} color="text-zinc-100" />
            <StatRow label="현재 보유금" value={money(table.bankroll)} color="text-amber-300" />
            <StatRow label="칩 선택" value="100 / 200 / 300 / 500" color="text-zinc-100" />
          </Panel>
        </aside>
      </main>
    </div>
  );
}

function addChip(table: TableState, chip: number): TableState {
  if (table.phase !== 'betting' || table.pendingBet + chip > table.bankroll) {
    return table;
  }
  const pendingBet = table.pendingBet + chip;
  return {...table, pendingBet, message: `${money(chip)} 추가. 현재 베팅은 ${money(pendingBet)} 입니다.`};
}

function startRound(table: TableState): TableState {
  if (table.phase !== 'betting' || table.pendingBet <= 0 || table.pendingBet > table.bankroll) {
    return table;
  }
  let shoe = table.shoe.length <= SHUFFLE_AT ? createShuffledDeck(DECK_COUNT) : table.shoe;
  const p1 = drawCard(shoe);
  shoe = p1.shoe;
  const d1 = drawCard(shoe);
  shoe = d1.shoe;
  const p2 = drawCard(shoe);
  shoe = p2.shoe;
  const d2 = drawCard(shoe);
  shoe = d2.shoe;
  const hand = createHand([p1.card, p2.card], table.pendingBet);
  const next = {
    ...table,
    shoe,
    dealerCards: [d1.card, d2.card],
    playerHands: [hand],
    activeHandIndex: 0,
    phase: 'player' as const,
    bankroll: table.bankroll - table.pendingBet,
    pendingBet: 0,
    message: `${money(hand.bet)} 베팅으로 새 라운드를 시작했습니다.`,
  };
  if (hand.blackjack || summarizeHand(next.dealerCards).isBlackjack) {
    return settleRound({...next, phase: 'dealer', message: '초기 블랙잭 여부를 확인합니다.'});
  }
  return next;
}

function hitCurrentHand(table: TableState): TableState {
  if (table.phase !== 'player') return table;
  const hand = table.playerHands[table.activeHandIndex];
  if (!hand) return table;
  const draw = drawCard(table.shoe);
  const cards = [...hand.cards, draw.card];
  const summary = summarizeHand(cards);
  const playerHands = [...table.playerHands];
  playerHands[table.activeHandIndex] = {...hand, cards, busted: summary.isBust, stood: summary.isBust || summary.total === 21, blackjack: false};
  return advanceTurn({
    ...table,
    shoe: draw.shoe,
    playerHands,
    message: summary.isBust ? `손패 ${table.activeHandIndex + 1} 이(가) 버스트했습니다.` : `손패 ${table.activeHandIndex + 1} 에 ${rankLabel(draw.card)} 카드가 추가되었습니다.`,
  });
}

function standCurrentHand(table: TableState): TableState {
  if (table.phase !== 'player') return table;
  const hand = table.playerHands[table.activeHandIndex];
  if (!hand) return table;
  const playerHands = [...table.playerHands];
  playerHands[table.activeHandIndex] = {...hand, stood: true};
  return advanceTurn({...table, playerHands, message: `손패 ${table.activeHandIndex + 1} 이(가) 스탠드했습니다.`});
}

function doubleCurrentHand(table: TableState): TableState {
  if (table.phase !== 'player') return table;
  const hand = table.playerHands[table.activeHandIndex];
  if (!hand || !canDouble(hand, table.phase) || table.bankroll < hand.bet) return table;
  const draw = drawCard(table.shoe);
  const cards = [...hand.cards, draw.card];
  const summary = summarizeHand(cards);
  const playerHands = [...table.playerHands];
  playerHands[table.activeHandIndex] = {...hand, cards, bet: hand.bet * 2, doubled: true, busted: summary.isBust, stood: true, blackjack: false};
  return advanceTurn({
    ...table,
    shoe: draw.shoe,
    bankroll: table.bankroll - hand.bet,
    playerHands,
    message: summary.isBust ? '더블다운 후 버스트했습니다.' : `더블다운으로 ${rankLabel(draw.card)} 을(를) 받았습니다.`,
  });
}

function splitCurrentHand(table: TableState): TableState {
  if (table.phase !== 'player') return table;
  const hand = table.playerHands[table.activeHandIndex];
  if (!hand || !canSplit(hand, table.phase, table.playerHands.length) || table.bankroll < hand.bet) return table;
  const draw1 = drawCard(table.shoe);
  const draw2 = drawCard(draw1.shoe);
  const left = splitHand([hand.cards[0], draw1.card], hand.bet);
  const right = splitHand([hand.cards[1], draw2.card], hand.bet);
  const playerHands = [...table.playerHands];
  playerHands.splice(table.activeHandIndex, 1, left, right);
  return advanceTurn({
    ...table,
    shoe: draw2.shoe,
    bankroll: table.bankroll - hand.bet,
    playerHands,
    message: `스플릿 완료. ${money(hand.bet)} 이 추가로 반영되었습니다.`,
  });
}

function splitHand(cards: Card[], bet: number): Hand {
  const hand = createHand(cards, bet);
  const summary = summarizeHand(cards);
  return {...hand, blackjack: false, stood: summary.total === 21, busted: summary.isBust};
}

function advanceTurn(table: TableState): TableState {
  const current = table.playerHands[table.activeHandIndex];
  if (!current || (!current.stood && !current.busted)) return table;
  const nextIndex = table.playerHands.findIndex((hand, index) => index > table.activeHandIndex && !hand.stood && !hand.busted);
  if (nextIndex >= 0) {
    return {...table, activeHandIndex: nextIndex, message: `${table.message} 이제 손패 ${nextIndex + 1} 차례입니다.`};
  }
  return settleRound({...table, phase: 'dealer', message: `${table.message} 딜러 턴을 시작합니다.`});
}

function settleRound(table: TableState): TableState {
  let shoe = table.shoe;
  const dealerCards = [...table.dealerCards];
  while (shouldDealerHit(dealerCards)) {
    const draw = drawCard(shoe);
    dealerCards.push(draw.card);
    shoe = draw.shoe;
  }
  const dealerSummary = summarizeHand(dealerCards);
  const playerHands = table.playerHands.map((hand) => ({...hand, result: compareHands(summarizeHand(hand.cards), dealerSummary), stood: true}));
  const payout = playerHands.reduce((sum, hand) => sum + payoutOf(hand), 0);
  const statsDelta = playerHands.reduce(
    (acc, hand) => {
      if (hand.result === 'win') acc.wins += 1;
      if (hand.result === 'lose') acc.losses += 1;
      if (hand.result === 'push') acc.pushes += 1;
      if (hand.result === 'blackjack') {
        acc.wins += 1;
        acc.blackjacks += 1;
      }
      return acc;
    },
    {wins: 0, losses: 0, pushes: 0, blackjacks: 0},
  );
  return {
    ...table,
    shoe,
    dealerCards,
    playerHands,
    phase: 'betting',
    bankroll: table.bankroll + payout,
    pendingBet: 0,
    roundNumber: table.roundNumber + 1,
    stats: {
      rounds: table.stats.rounds + 1,
      wins: table.stats.wins + statsDelta.wins,
      losses: table.stats.losses + statsDelta.losses,
      pushes: table.stats.pushes + statsDelta.pushes,
      blackjacks: table.stats.blackjacks + statsDelta.blackjacks,
    },
    message: `${roundSummary(playerHands, dealerSummary.total)} 정산 금액은 ${money(payout)} 입니다.`,
  };
}

function payoutOf(hand: Hand): number {
  if (hand.result === 'push') return hand.bet;
  if (hand.result === 'win') return hand.bet * 2;
  if (hand.result === 'blackjack') return hand.bet * 2.5;
  return 0;
}

function roundSummary(hands: Hand[], dealerTotal: number): string {
  return `딜러 최종 합은 ${dealerTotal}입니다. ${hands.map((hand, index) => `손패 ${index + 1}: ${formatResult(hand.result)}`).join(' / ')}.`;
}

function money(value: number): string {
  return `${value.toLocaleString()}원`;
}

function percent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function signed(value: number, digits = 0): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(digits)}`;
}

function actionLabel(action: 'Hit' | 'Stand' | 'Double' | 'Split'): string {
  if (action === 'Hit') return '히트';
  if (action === 'Stand') return '스탠드';
  if (action === 'Double') return '더블';
  return '스플릿';
}

function rankLabel(card?: Card): string {
  if (!card) return '?';
  return `${card.rank}${suitLabel(card.suit)}`;
}

function suitLabel(suit: Card['suit']): string {
  if (suit === 'spades') return 'Sp';
  if (suit === 'hearts') return 'He';
  if (suit === 'diamonds') return 'Di';
  return 'Cl';
}

function Metric({label, value, accent}: {label: string; value: string; accent: string}) {
  return (
    <div className="text-right">
      <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-500">{label}</p>
      <p className={`mt-1 font-mono text-sm font-bold ${accent}`}>{value}</p>
    </div>
  );
}

function IconButton({icon}: {icon: ReactNode}) {
  return <button className="rounded-full border border-white/8 bg-white/5 p-2 text-zinc-300 transition hover:bg-white/10 hover:text-white">{icon}</button>;
}

function Badge({icon, label, value, tone}: {icon: ReactNode; label: string; value: string; tone: 'slate' | 'emerald'}) {
  const toneClass = tone === 'emerald' ? 'border-emerald-400/30 bg-emerald-500/15 text-emerald-300' : 'border-white/10 bg-black/30 text-zinc-300';
  return (
    <div className={`flex items-center gap-2 rounded-full border px-3 py-1.5 backdrop-blur ${toneClass}`}>
      {icon}
      <span className="text-[10px] font-bold uppercase tracking-[0.28em]">{label}</span>
      <span className="rounded bg-black/30 px-1.5 py-0.5 font-mono text-[10px] text-white">{value}</span>
    </div>
  );
}

function EmptySlot({label}: {label: string}) {
  return <div className="flex min-h-32 items-center justify-center rounded-[1.4rem] border border-dashed border-white/10 bg-black/10 px-4 text-center text-sm text-zinc-400">{label}</div>;
}

function TableCard({card, hidden, delay}: {key?: string; card: Card; hidden?: boolean; delay: number}) {
  if (hidden) {
    return (
      <motion.div initial={{y: 16, opacity: 0}} animate={{y: 0, opacity: 1}} transition={{delay}} className="relative flex h-28 w-20 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 shadow-2xl">
        <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,rgba(255,255,255,0.07)_0px,rgba(255,255,255,0.07)_2px,transparent_2px,transparent_10px)] opacity-20" />
        <div className="flex h-16 w-12 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-500/10">
          <Zap className="h-6 w-6 text-emerald-300" />
        </div>
      </motion.div>
    );
  }
  const suit = suitLabel(card.suit);
  const red = card.suit === 'hearts' || card.suit === 'diamonds';
  return (
    <motion.div initial={{y: 16, opacity: 0, rotate: -4}} animate={{y: 0, opacity: 1, rotate: 0}} transition={{delay}} className="group relative flex h-28 w-20 cursor-pointer flex-col justify-between overflow-hidden rounded-2xl bg-white p-2 text-zinc-900 shadow-2xl transition hover:-translate-y-2">
      <div className={`text-lg font-black leading-none ${red ? 'text-rose-600' : 'text-zinc-900'}`}>{card.rank}<div className="text-xs">{suit}</div></div>
      <div className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-3xl opacity-10 transition group-hover:scale-110 ${red ? 'text-rose-600' : 'text-zinc-900'}`}>{suit}</div>
      <div className={`self-end rotate-180 text-lg font-black leading-none ${red ? 'text-rose-600' : 'text-zinc-900'}`}>{card.rank}<div className="text-xs">{suit}</div></div>
    </motion.div>
  );
}

function ChipButton({label, onClick, disabled, subtle = false}: {key?: string | number; label: string; onClick: () => void; disabled: boolean; subtle?: boolean}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-full px-4 py-2 text-sm font-black tracking-[0.12em] transition ${
        disabled ? 'cursor-not-allowed bg-white/8 text-zinc-500' : subtle ? 'border border-white/10 bg-black/20 text-zinc-100 hover:bg-white/8' : 'bg-amber-300 text-black hover:bg-amber-200'
      }`}
    >
      {subtle ? label : <span className="inline-flex items-center gap-2"><Coins className="h-4 w-4" />{label}</span>}
    </button>
  );
}

function ActionButton({label, sub, onClick, disabled = false}: {label: string; sub: string; onClick: () => void; disabled?: boolean}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-2xl border px-4 py-4 text-center transition ${disabled ? 'cursor-not-allowed border-white/6 bg-white/4 opacity-35' : 'border-white/10 bg-black/20 hover:border-emerald-400/30 hover:bg-white/8'}`}
    >
      <p className="text-sm font-black uppercase tracking-[0.24em] text-white">{label}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">{sub}</p>
    </button>
  );
}

function Panel({title, icon, badge, children}: {title: string; icon: ReactNode; badge?: string; children: ReactNode}) {
  return (
    <section className="rounded-[1.75rem] border border-white/8 bg-black/25 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.32)] backdrop-blur-xl">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">{icon}<h2 className="text-sm font-black uppercase tracking-[0.24em] text-white">{title}</h2></div>
        {badge ? <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.28em] text-emerald-300">{badge}</span> : null}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function SmallMetric({label, value, color}: {key?: string; label: string; value: string; color: string}) {
  return <div className="rounded-2xl border border-white/8 bg-white/4 p-3"><p className="text-[10px] font-bold uppercase tracking-[0.28em] text-zinc-500">{label}</p><p className={`mt-2 font-mono text-sm font-bold ${color}`}>{value}</p></div>;
}

function StatRow({label, value, color, multiline = false}: {label: string; value: string; color: string; multiline?: boolean}) {
  return (
    <div className={`flex justify-between gap-4 border-b border-white/6 pb-4 last:border-b-0 last:pb-0 ${multiline ? 'items-start' : 'items-center'}`}>
      <span className="text-xs font-bold uppercase tracking-[0.3em] text-zinc-500">{label}</span>
      <span className={`font-mono text-sm font-bold ${color} ${multiline ? 'max-w-[13rem] text-right leading-6' : ''}`}>{value}</span>
    </div>
  );
}

function Chip({label, active = false}: {label: string; active?: boolean}) {
  return <span className={`rounded-full px-2.5 py-1 ${active ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/6 text-zinc-300'}`}>{label}</span>;
}
