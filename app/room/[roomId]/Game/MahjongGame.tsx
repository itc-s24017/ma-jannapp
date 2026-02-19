// MahjongGame.tsx
import { useState, useEffect, useCallback, useRef } from 'react';
import { useSocket } from '../../../contexts/SocketContext';

// =====================================================================
//  型定義
// =====================================================================
type Suit = "m" | "p" | "s" | "z";

interface Tile {
  id: number;
  suit: Suit;
  num: number;
}

interface Meld {
  tiles: Tile[];
}

type Phase = "draw" | "discard" | "wait" | "end";

interface GameState {
  deck: Tile[];
  hands: Tile[][];
  drawn: (Tile | null)[];
  discards: Tile[][];
  melds: Meld[][];
  scores: number[];
  turn: number;
  phase: Phase;
  selectedTile: number | null;
  gameOver: boolean;
  ronTile: Tile | null;
  ronFrom: number | null;
}

// =====================================================================
//  SVG牌描画
// =====================================================================
const MAN_KANJI = ["一", "二", "三", "四", "五", "六", "七", "八", "九"];

const PIN_POS: Record<number, [number, number][]> = {
  1: [[0, 0]],
  2: [
    [0, -0.28],
    [0, 0.28],
  ],
  3: [
    [0, -0.28],
    [0, 0],
    [0, 0.28],
  ],
  4: [
    [-0.23, -0.24],
    [0.23, -0.24],
    [-0.23, 0.24],
    [0.23, 0.24],
  ],
  5: [
    [-0.23, -0.28],
    [0.23, -0.28],
    [0, 0],
    [-0.23, 0.28],
    [0.23, 0.28],
  ],
  6: [
    [-0.23, -0.28],
    [0.23, -0.28],
    [-0.23, 0],
    [0.23, 0],
    [-0.23, 0.28],
    [0.23, 0.28],
  ],
  7: [
    [-0.23, -0.32],
    [0.23, -0.32],
    [-0.23, -0.08],
    [0.23, -0.08],
    [0, 0.14],
    [-0.23, 0.34],
    [0.23, 0.34],
  ],
  8: [
    [-0.23, -0.32],
    [0.23, -0.32],
    [-0.23, -0.1],
    [0.23, -0.1],
    [-0.23, 0.12],
    [0.23, 0.12],
    [-0.23, 0.34],
    [0.23, 0.34],
  ],
  9: [
    [-0.23, -0.32],
    [0.23, -0.32],
    [-0.23, -0.1],
    [0.23, -0.1],
    [0, 0],
    [-0.23, 0.12],
    [0.23, 0.12],
    [-0.23, 0.34],
    [0.23, 0.34],
  ],
};
const PIN_COLORS = ["#d02010", "#1a55b0", "#1a8030", "#c07010", "#802080"];

const JI_DEFS = [
  { ch: "東", color: "#000000" },
  { ch: "南", color: "#000000" },
  { ch: "西", color: "#000000" },
  { ch: "北", color: "#000000" },
  { ch: "中", color: "#DD0000" },
  { ch: "發", color: "#117700" },
  { ch: "■", color: "#FFFFFF" },
];

function drawMan(
  n: number,
  w: number,
  h: number,
  cx: number,
  cy: number,
): string {
  const fs = Math.round(w * 0.44);
  const sfs = Math.round(w * 0.23);
  const col = n === 5 ? "#cc1800" : "#bb1100";
  return `
    <text x="${cx}" y="${cy * 0.92}" font-family="'Noto Serif JP',serif" font-weight="900"
      font-size="${fs}px" fill="${col}" text-anchor="middle" dominant-baseline="central">${MAN_KANJI[n - 1]}</text>
    <text x="${cx}" y="${cy * 1.62}" font-family="'Noto Serif JP',serif" font-weight="700"
      font-size="${sfs}px" fill="#333" text-anchor="middle" dominant-baseline="central">萬</text>`;
}

function drawPin(
  n: number,
  w: number,
  h: number,
  cx: number,
  cy: number,
): string {
  const positions = PIN_POS[n];
  const spreadX = (w - 2) * 0.44,
    spreadY = (h - 2) * 0.44;
  const r = n === 1 ? w * 0.24 : w * 0.12;
  const ro = r + w * 0.035;
  return positions
    .map((p, i) => {
      const px = (cx + p[0] * spreadX * 2).toFixed(1);
      const py = (cy + p[1] * spreadY * 2).toFixed(1);
      const col = PIN_COLORS[i % PIN_COLORS.length];
      return `<circle cx="${px}" cy="${py}" r="${ro.toFixed(1)}" fill="${col}"/>
      <circle cx="${px}" cy="${py}" r="${r.toFixed(1)}" fill="#f5eecc"/>
      ${r > 4 ? `<circle cx="${px}" cy="${py}" r="${(r * 0.42).toFixed(1)}" fill="${col}" opacity="0.75"/>` : ""}`;
    })
    .join("");
}

function drawSou(
  n: number,
  w: number,
  h: number,
  cx: number,
  cy: number,
): string {
  if (n === 1) {
    return `<text x="${cx}" y="${cy}" font-size="${Math.round(w * 0.55)}px" text-anchor="middle" dominant-baseline="central" fill="#2a7a30">竹</text>`;
  }
  const positions = PIN_POS[n];
  const spreadX = (w - 2) * 0.38,
    spreadY = (h - 2) * 0.44;
  const bw = Math.max(4, w * 0.13),
    bh = Math.max(7, h * 0.19);
  const greens = ["#1a6828", "#228833", "#1e7a30", "#166020"];
  return positions
    .map((p, i) => {
      const px = cx + p[0] * spreadX * 2 - bw / 2;
      const py = cy + p[1] * spreadY * 2 - bh / 2;
      const col = greens[i % greens.length];
      const col2 = greens[(i + 1) % greens.length];
      return `<rect x="${px.toFixed(1)}" y="${py.toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" rx="2" fill="${col}"/>
      <rect x="${(px + bw * 0.6).toFixed(1)}" y="${py.toFixed(1)}" width="${(bw * 0.25).toFixed(1)}" height="${bh.toFixed(1)}" rx="1" fill="${col2}" opacity="0.5"/>`;
    })
    .join("");
}

function drawJi(
  n: number,
  w: number,
  h: number,
  cx: number,
  cy: number,
): string {
  const d = JI_DEFS[n - 1];
  const fs = Math.round(w * 0.5);
  if (!d.color) {
    const bx = cx - w * 0.22,
      by = cy - h * 0.22;
    return `<rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${(w * 0.44).toFixed(1)}" height="${(h * 0.44).toFixed(1)}"
      rx="2" fill="none" stroke="#999" stroke-width="1.5"/>`;
  }
  return `<text x="${cx}" y="${cy}" font-family="'Noto Serif JP',serif" font-weight="900"
    font-size="${fs}px" fill="${d.color}" text-anchor="middle" dominant-baseline="central">${d.ch}</text>`;
}

function getTileContent(
  tile: Tile | "back",
  w: number,
  h: number,
  cx: number,
  cy: number,
): string {
  if (tile === "back") {
    const ix = Math.round(w * 0.09),
      iy = Math.round(h * 0.07);
    const iw = w - 2 - ix * 2,
      ih = h - 2 - iy * 2;
    return `<rect x="${ix}" y="${iy}" width="${iw}" height="${ih}" rx="3" fill="#2e5e40" opacity="0.85"/>
      <line x1="${ix + 2}" y1="${iy + 2}" x2="${ix + iw - 2}" y2="${iy + ih - 2}" stroke="#1e4030" stroke-width="1"/>
      <line x1="${ix + iw - 2}" y1="${iy + 2}" x2="${ix + 2}" y2="${iy + ih - 2}" stroke="#1e4030" stroke-width="1"/>`;
  }
  const { suit, num } = tile;
  if (suit === "m") return drawMan(num, w, h, cx, cy);
  if (suit === "p") return drawPin(num, w, h, cx, cy);
  if (suit === "s") return drawSou(num, w, h, cx, cy);
  if (suit === "z") return drawJi(num, w, h, cx, cy);
  return "";
}

function buildTileSVG(tile: Tile | "back", w: number, h: number): string {
  const rx = Math.round(w * 0.1);
  const ix = Math.round(w * 0.09),
    iy = Math.round(h * 0.07);
  const iw = w - 2 - ix * 2,
    ih = h - 2 - iy * 2;
  const cx = (w - 2) / 2,
    cy = (h - 2) / 2;
  const content = getTileContent(tile, w, h, cx, cy);
  const gid = `g${w}x${h}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <defs>
      <linearGradient id="tg_${gid}" x1="0" y1="0" x2="0.3" y2="1">
        <stop offset="0%" stop-color="#faf5e0"/>
        <stop offset="100%" stop-color="#e4d9aa"/>
      </linearGradient>
      <linearGradient id="sg_${gid}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#c8b870"/>
        <stop offset="100%" stop-color="#8a7040"/>
      </linearGradient>
    </defs>
    <rect x="2" y="3" width="${w - 2}" height="${h - 2}" rx="${rx}" fill="rgba(0,0,0,0.32)"/>
    <rect x="0" y="0" width="${w - 2}" height="${h - 2}" rx="${rx}" fill="url(#sg_${gid})"/>
    <rect x="1" y="1" width="${w - 4}" height="${h - 4}" rx="${rx - 1}" fill="url(#tg_${gid})"/>
    <rect x="${ix}" y="${iy}" width="${iw}" height="${ih}" rx="2" fill="none" stroke="#b09050" stroke-width="0.7" opacity="0.55"/>
    ${content}
  </svg>`;
}

// =====================================================================
//  TileSVG コンポーネント
// =====================================================================
interface TileSVGProps {
  tile: Tile | "back";
  w: number;
  h: number;
  selected?: boolean;
  drawn?: boolean;
  noHover?: boolean;
  onClick?: () => void;
}

function TileSVG({
  tile,
  w,
  h,
  selected,
  drawn,
  noHover,
  onClick,
}: TileSVGProps) {
  const cls = [
    "tile-svg",
    selected ? "selected" : "",
    drawn ? "drawn-tile" : "",
    noHover ? "no-hover" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={cls}
      style={{ width: w, height: h, display: "inline-block", flexShrink: 0 }}
      onClick={onClick}
      dangerouslySetInnerHTML={{ __html: buildTileSVG(tile, w, h) }}
    />
  );
}

// =====================================================================
//  ゲームロジック
// =====================================================================
function buildDeck(): Tile[] {
  const d: Tile[] = [];
  let id = 0;
  for (let n = 1; n <= 9; n++)
    for (let k = 0; k < 4; k++) d.push({ id: id++, suit: "m", num: n });
  for (let n = 1; n <= 9; n++)
    for (let k = 0; k < 4; k++) d.push({ id: id++, suit: "p", num: n });
  for (let n = 1; n <= 9; n++)
    for (let k = 0; k < 4; k++) d.push({ id: id++, suit: "s", num: n });
  for (let n = 1; n <= 7; n++)
    for (let k = 0; k < 4; k++) d.push({ id: id++, suit: "z", num: n });
  return d;
}

function shuffle<T>(a: T[]): T[] {
  const arr = [...a];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const tk = (t: Tile) => t.suit + t.num;

function canFormSets(cnt: Record<string, number>): boolean {
  const keys = Object.keys(cnt).filter((k) => cnt[k] > 0);
  if (!keys.length) return true;
  const k = keys.sort()[0];
  const suit = k[0],
    n = parseInt(k.slice(1));
  if (cnt[k] >= 3) {
    const r = { ...cnt };
    r[k] -= 3;
    if (!r[k]) delete r[k];
    if (canFormSets(r)) return true;
  }
  if (suit !== "z") {
    const k2 = suit + (n + 1),
      k3 = suit + (n + 2);
    if (cnt[k2] > 0 && cnt[k3] > 0) {
      const r = { ...cnt };
      r[k] -= 1;
      if (!r[k]) delete r[k];
      r[k2] -= 1;
      if (!r[k2]) delete r[k2];
      r[k3] -= 1;
      if (!r[k3]) delete r[k3];
      if (canFormSets(r)) return true;
    }
  }
  return false;
}

function isWinningHand(hand: Tile[]): boolean {
  if (hand.length !== 14) return false;
  const cnt: Record<string, number> = {};
  hand.forEach((t) => {
    const k = tk(t);
    cnt[k] = (cnt[k] || 0) + 1;
  });
  for (const pk of Object.keys(cnt)) {
    if (cnt[pk] >= 2) {
      const r = { ...cnt };
      r[pk] -= 2;
      if (!r[pk]) delete r[pk];
      if (canFormSets(r)) return true;
    }
  }
  const pairs = Object.values(cnt).filter((v) => v >= 2).length;
  if (pairs === 7 && Object.keys(cnt).length === 7) return true;
  return false;
}

function isTenpai(hand: Tile[]): boolean {
  if (hand.length !== 13) return false;
  const tries: Tile[] = [];
  (["m", "p", "s"] as Suit[]).forEach((s) => {
    for (let n = 1; n <= 9; n++) tries.push({ id: -1, suit: s, num: n });
  });
  for (let n = 1; n <= 7; n++) tries.push({ id: -1, suit: "z", num: n });
  return tries.some((t) => isWinningHand([...hand, t]));
}

function calcPoints(han: number, isRon: boolean): number {
  const b = 300 * Math.pow(2, han + 1);
  return isRon ? b * 4 : b * 2;
}

function chooseDiscard(hand: Tile[]): number {
  const cnt: Record<string, number> = {};
  hand.forEach((t) => {
    const k = tk(t);
    cnt[k] = (cnt[k] || 0) + 1;
  });
  let best = 0,
    bs = -Infinity;
  hand.forEach((t, i) => {
    let s = 0;
    if (cnt[tk(t)] >= 2) s += 10;
    if (t.suit !== "z") {
      [t.num - 1, t.num + 1].forEach((n) => {
        if (cnt[t.suit + n]) s += 8;
      });
      [t.num - 2, t.num + 2].forEach((n) => {
        if (cnt[t.suit + n]) s += 3;
      });
    }
    if (-s > bs) {
      bs = -s;
      best = i;
    }
  });
  return best;
}

function createInitialState(): GameState {
  const deck = shuffle(buildDeck());
  const deal = (n: number) => deck.splice(0, n);
  return {
    deck,
    hands: [deal(13), deal(13), deal(13), deal(13)],
    drawn: [null, null, null, null],
    discards: [[], [], [], []],
    melds: [[], [], [], []],
    scores: [25000, 25000, 25000, 25000],
    turn: 0,
    phase: "draw",
    selectedTile: null,
    gameOver: false,
    ronTile: null,
    ronFrom: null,
  };
}

// =====================================================================
//  メインコンポーネント
// =====================================================================
export default function MahjongGame() {
  const socket = useSocket();
  const [gs, setGs] = useState<GameState>(createInitialState);
  const [status, setStatus] = useState("牌を選んで捨ててください");
  const [notification, setNotification] = useState("");
  const [showOverlay, setShowOverlay] = useState(false);
  const [overlayData, setOverlayData] = useState({
    title: "",
    detail: "",
    score: "",
    titleColor: "#ffd700",
  });

  const notifTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gsRef = useRef(gs);
  gsRef.current = gs;

  const showNotif = useCallback((msg: string) => {
    setNotification(msg);
    if (notifTimerRef.current) clearTimeout(notifTimerRef.current);
    notifTimerRef.current = setTimeout(() => setNotification(""), 1600);
  }, []);

  // ゲーム終了処理
  const endGame = useCallback((type: string, winner: number, msg?: string) => {
    setGs((prev) => ({ ...prev, gameOver: true, phase: "end" }));
    if (type === "ryukyoku") {
      const tenpai = isTenpai(gsRef.current.hands[0]);
      setOverlayData({
        title: "流局",
        titleColor: "#aaccff",
        detail: "牌山がなくなりました\n" + (tenpai ? "テンパイ！" : "ノーテン"),
        score: "",
      });
    } else {
      const titleColor = winner === 0 ? "#ffd700" : "#ff6666";
      const title =
        winner === 0
          ? type === "tsumo"
            ? "ツモ！"
            : "ロン！"
          : "和了られました";
      setOverlayData({
        title,
        titleColor,
        detail: msg || "",
        score: `点数: ${gsRef.current.scores[0].toLocaleString()}点`,
      });
    }
    setShowOverlay(true);
  }, []);

  // プレイヤーがツモで引く
  const playerDraw = useCallback(
    (prevGs: GameState): GameState => {
      if (prevGs.deck.length === 0) {
        endGame("ryukyoku", -1);
        return { ...prevGs, gameOver: true, phase: "end" };
      }
      const [drawn, ...deck] = prevGs.deck;
      const newGs = {
        ...prevGs,
        drawn: [drawn, ...prevGs.drawn.slice(1)],
        deck,
        phase: "discard" as Phase,
      };
      setStatus("牌を選んで捨ててください");
      // ツモ和了チェック
      if (isWinningHand([...newGs.hands[0], drawn])) {
        // ツモボタンは render 側でハイライト
      }
      return newGs;
    },
    [endGame],
  );

  // 初期化時にツモ
  useEffect(() => {
    setGs((prev) => playerDraw(prev));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 対戦相手のターン
  const runOpponentTurn = useCallback(
    (playerIdx: number, prevGs: GameState) => {
      if (prevGs.gameOver) return;

      const doTurn = (player: number, currentGs: GameState) => {
        if (currentGs.gameOver) return;
        if (currentGs.deck.length === 0) {
          endGame("ryukyoku", -1);
          return;
        }

        const [drawn, ...deck] = currentGs.deck;
        const newHand = [...currentGs.hands[player], drawn];
        const newHands = currentGs.hands.map((h, i) =>
          i === player ? newHand : h,
        );
        let gs1 = { ...currentGs, deck, hands: newHands };

        // ツモ和了チェック
        if (isWinningHand(newHand)) {
          const pts = calcPoints(1, false);
          const newScores = gs1.scores.map((s, i) =>
            i === player ? s + pts : s - Math.floor(pts / 3),
          );
          const names = ["あなた", "上家", "対面", "下家"];
          setGs({ ...gs1, scores: newScores });
          endGame("tsumo", player, `${names[player]}がツモ和了！`);
          return;
        }

        // 捨て牌
        const di = chooseDiscard(newHand);
        const disc = newHand[di];
        const hand2 = newHand.filter((_, i) => i !== di);
        const newDiscards = gs1.discards.map((d, i) =>
          i === player ? [...d, disc] : d,
        );
        const hands2 = gs1.hands.map((h, i) => (i === player ? hand2 : h));
        gs1 = { ...gs1, hands: hands2, discards: newDiscards };

        // ロンチェック
        const playerHand = gs1.hands[0];
        if (isWinningHand([...playerHand, disc])) {
          setGs({ ...gs1, ronTile: disc, ronFrom: player, phase: "wait" });
          showNotif("ロン！");
          setStatus("ロンできます！");
          return;
        }

        const next = player + 1;
        if (next > 3) {
          // プレイヤーのターンへ
          setGs((prev) => playerDraw({ ...gs1, turn: 0, phase: "draw" }));
        } else {
          setGs(gs1);
          setTimeout(() => doTurn(next, gs1), 600);
        }
      };

      setTimeout(() => doTurn(playerIdx, prevGs), 800);
    },
    [endGame, playerDraw, showNotif],
  );

  // 牌選択
  const selectTile = useCallback((idx: number) => {
    setGs((prev) => {
      if (prev.phase !== "discard" || prev.turn !== 0) return prev;
      if (prev.selectedTile === idx) return prev; // discard は別で処理
      return { ...prev, selectedTile: idx };
    });
  }, []);

  // 捨て牌
  const discardSelected = useCallback(() => {
    setGs((prev) => {
      if (
        prev.selectedTile === null ||
        prev.phase !== "discard" ||
        prev.turn !== 0
      )
        return prev;

      let tile: Tile;
      let newHand = [...prev.hands[0]];
      let newDrawn = [...prev.drawn];

      if (prev.selectedTile === 100) {
        tile = prev.drawn[0]!;
        newDrawn[0] = null;
      } else {
        tile = newHand.splice(prev.selectedTile, 1)[0];
        if (prev.drawn[0]) {
          newHand.push(prev.drawn[0]);
          newDrawn[0] = null;
        }
      }

      const newDiscards = prev.discards.map((d, i) =>
        i === 0 ? [...d, tile] : d,
      );
      const newHands = prev.hands.map((h, i) => (i === 0 ? newHand : h));
      const next = {
        ...prev,
        hands: newHands,
        drawn: newDrawn,
        discards: newDiscards,
        selectedTile: null,
        turn: 1,
        phase: "draw" as Phase,
      };

      if (isTenpai(newHand)) setStatus("テンパイ！ロン待ち");
      if (next.deck.length === 0) {
        endGame("ryukyoku", -1);
        return { ...next, gameOver: true, phase: "end" };
      }

      runOpponentTurn(1, next);
      return next;
    });
  }, [endGame, runOpponentTurn]);

  // ツモ宣言
  const declareTsumo = useCallback(() => {
    setGs((prev) => {
      if (prev.gameOver) return prev;
      const all = [...prev.hands[0], ...(prev.drawn[0] ? [prev.drawn[0]] : [])];
      if (!isWinningHand(all)) return prev;
      const pts = calcPoints(1, false);
      const newScores = prev.scores.map((s, i) =>
        i === 0 ? s + pts : s - Math.floor(pts / 3),
      );
      endGame("tsumo", 0, "ツモ和了！");
      return { ...prev, scores: newScores };
    });
  }, [endGame]);

  // ロン宣言
  const declareRon = useCallback(() => {
    setGs((prev) => {
      if (prev.gameOver || !prev.ronTile || prev.ronFrom === null) return prev;
      const pts = calcPoints(1, true);
      const newScores = prev.scores.map((s, i) => {
        if (i === 0) return s + pts;
        if (i === prev.ronFrom) return s - pts;
        return s;
      });
      endGame("ron", 0, "ロン和了！");
      return { ...prev, scores: newScores, ronTile: null, ronFrom: null };
    });
  }, [endGame]);

  // ロンスキップ
  const skipRon = useCallback(() => {
    setGs((prev) => {
      if (!prev.ronFrom === null) return prev;
      const player = prev.ronFrom!;
      const next = player + 1;
      const base = {
        ...prev,
        ronTile: null,
        ronFrom: null,
        phase: "draw" as Phase,
      };
      if (next > 3) {
        const newGs = playerDraw({ ...base, turn: 0 });
        return newGs;
      }
      setTimeout(() => runOpponentTurn(next, base), 400);
      return base;
    });
  }, [playerDraw, runOpponentTurn]);

  // 新しいゲーム
  const initGame = useCallback(() => {
    const newGs = createInitialState();
    setShowOverlay(false);
    setNotification("");
    setGs(playerDraw(newGs));
  }, [playerDraw]);

  // キーボード
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        (e.key === "Enter" || e.key === " ") &&
        gsRef.current.selectedTile !== null &&
        gsRef.current.phase === "discard" &&
        gsRef.current.turn === 0
      ) {
        discardSelected();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [discardSelected]);

  // ツモ可能かチェック
  const canTsumo =
    gs.phase === "discard" &&
    gs.turn === 0 &&
    gs.drawn[0] !== null &&
    isWinningHand([...gs.hands[0], gs.drawn[0]]);
  const canRon = gs.phase === "wait" && gs.ronTile !== null;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@400;700;900&family=Noto+Sans+JP:wght@400;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #1a5c2a; font-family: 'Noto Sans JP', sans-serif; }
        .tile-svg { cursor: pointer; display: inline-block; flex-shrink: 0; transition: transform 0.13s, filter 0.13s; filter: drop-shadow(2px 3px 4px rgba(0,0,0,0.5)); }
        .tile-svg:hover        { transform: translateY(-13px); filter: drop-shadow(2px 15px 6px rgba(0,0,0,0.55)); }
        .tile-svg.selected     { transform: translateY(-17px); filter: drop-shadow(0 0 7px #ff3333) drop-shadow(2px 17px 6px rgba(0,0,0,0.5)); }
        .tile-svg.drawn-tile   { filter: drop-shadow(0 0 6px #44aaff) drop-shadow(2px 3px 4px rgba(0,0,0,0.5)); }
        .tile-svg.selected.drawn-tile { transform: translateY(-17px); filter: drop-shadow(0 0 7px #ff3333) drop-shadow(0 0 6px #44aaff); }
        .tile-svg.no-hover { cursor: default; }
        .tile-svg.no-hover:hover { transform: none; filter: drop-shadow(1px 2px 2px rgba(0,0,0,0.4)); }
        .action-btn { padding: 7px 13px; background: linear-gradient(145deg,#4a3a1a,#2a1a0a); border: 2px solid #8a6030; border-radius: 6px; color: #ffd700; font-size: 13px; font-weight: 700; font-family: 'Noto Sans JP',sans-serif; cursor: pointer; transition: all .15s; box-shadow: 0 2px 4px rgba(0,0,0,.4); }
        .action-btn:hover:not(:disabled) { background: linear-gradient(145deg,#6a5a2a,#4a3a1a); transform: translateY(-2px); }
        .action-btn:disabled { opacity: .3; cursor: default; transform: none; }
        .action-btn.highlight { animation: pulse .6s infinite alternate; border-color: #ffdd00; }
        @keyframes pulse { from{box-shadow:0 0 4px rgba(255,220,0,.4)} to{box-shadow:0 0 14px rgba(255,220,0,.9)} }
        .wall-tile { background: #e8d5a3; border: 1px solid #b8a070; border-radius: 2px; }
        .opp-tile { background: linear-gradient(135deg,#3d6e50,#254d38); border: 1.5px solid #1a3a2a; border-radius: 3px; }
      `}</style>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          background: "#1a5c2a",
        }}
      >
        <div
          style={{
            position: "relative",
            width: 740,
            height: 610,
            background: "#1e7a34",
            border: "6px solid #0d3d19",
            borderRadius: 12,
            boxShadow:
              "0 0 60px rgba(0,0,0,0.6), inset 0 0 40px rgba(0,0,0,0.2)",
          }}
        >
          {/* 壁牌 */}
          <WallTiles />

          {/* 対面の手牌（裏） */}
          <div
            style={{
              position: "absolute",
              top: 30,
              left: "50%",
              transform: "translateX(-50%)",
              display: "flex",
              gap: 2,
            }}
          >
            {Array.from({
              length: gs.hands[2].length + (gs.drawn[2] ? 1 : 0),
            }).map((_, i) => (
              <div
                key={i}
                className="opp-tile"
                style={{ width: 20, height: 28 }}
              />
            ))}
          </div>
          {/* 上家の手牌（裏） */}
          <div
            style={{
              position: "absolute",
              left: 28,
              top: "50%",
              transform: "translateY(-60%)",
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            {Array.from({
              length: gs.hands[1].length + (gs.drawn[1] ? 1 : 0),
            }).map((_, i) => (
              <div
                key={i}
                className="opp-tile"
                style={{ width: 28, height: 20 }}
              />
            ))}
          </div>
          {/* 下家の手牌（裏） */}
          <div
            style={{
              position: "absolute",
              right: 28,
              top: "50%",
              transform: "translateY(-60%)",
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            {Array.from({
              length: gs.hands[3].length + (gs.drawn[3] ? 1 : 0),
            }).map((_, i) => (
              <div
                key={i}
                className="opp-tile"
                style={{ width: 28, height: 20 }}
              />
            ))}
          </div>

          {/* 河（捨て牌） */}
          <DiscardPile
            id="top"
            tiles={gs.discards[2]}
            style={{
              position: "absolute",
              bottom: "calc(52% + 81px)",
              left: "50%",
              transform: "translateX(-50%)",
              display: "flex",
              gap: 2,
              flexWrap: "wrap-reverse",
              width: 190,
              justifyContent: "center",
              alignItems: "flex-end",
            }}
          />
          <DiscardPile
            id="left"
            tiles={gs.discards[1]}
            style={{
              position: "absolute",
              right: "calc(50% + 98px)",
              top: "52%",
              transform: "translateY(-50%)",
              display: "flex",
              flexDirection: "column",
              gap: 2,
              maxHeight: 152,
              flexWrap: "wrap",
              alignItems: "flex-end",
            }}
          />
          <DiscardPile
            id="right"
            tiles={gs.discards[3]}
            style={{
              position: "absolute",
              left: "calc(50% + 98px)",
              top: "52%",
              transform: "translateY(-50%)",
              display: "flex",
              flexDirection: "column",
              gap: 2,
              maxHeight: 152,
              flexWrap: "wrap",
            }}
          />
          <DiscardPile
            id="player"
            tiles={gs.discards[0]}
            style={{
              position: "absolute",
              top: "calc(52% + 80px)",
              left: "50%",
              transform: "translateX(-50%)",
              display: "flex",
              gap: 2,
              flexWrap: "wrap",
              width: 190,
              justifyContent: "center",
            }}
          />

          {/* 中央エリア */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -52%)",
              width: 190,
              height: 155,
              background: "rgba(0,0,0,0.18)",
              borderRadius: 8,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 3,
              zIndex: 1,
            }}
          >
            <div
              style={{
                fontSize: 26,
                fontWeight: 900,
                color: "#ffd700",
                textShadow: "0 0 10px rgba(255,215,0,.5)",
              }}
            >
              東
            </div>
            <div style={{ fontSize: 13, color: "#aad" }}>東1局</div>
            <div style={{ fontSize: 11, color: "#ccc" }}>
              残り牌: {gs.deck.length}
            </div>
          </div>

          {/* スコア */}
          <div
            style={{
              position: "absolute",
              top: 8,
              left: 8,
              background: "rgba(0,0,0,.5)",
              borderRadius: 6,
              padding: "5px 9px",
              fontSize: 11,
              color: "#ddd",
              lineHeight: 1.7,
            }}
          >
            <div>あなた: {gs.scores[0].toLocaleString()}</div>
            <div>上家: {gs.scores[1].toLocaleString()}</div>
            <div>対面: {gs.scores[2].toLocaleString()}</div>
            <div>下家: {gs.scores[3].toLocaleString()}</div>
          </div>

          {/* プレイヤー手牌 */}
          <div
            style={{
              position: "absolute",
              bottom: 50,
              left: "50%",
              transform: "translateX(-50%)",
              display: "flex",
              flexDirection: "row",
              alignItems: "flex-end",
              gap: 0,
            }}
          >
            <div style={{ display: "flex", gap: 2, alignItems: "flex-end" }}>
              {gs.hands[0].map((tile, idx) => (
                <TileSVG
                  key={tile.id}
                  tile={tile}
                  w={46}
                  h={62}
                  selected={gs.selectedTile === idx}
                  onClick={() =>
                    gs.selectedTile === idx
                      ? discardSelected()
                      : selectTile(idx)
                  }
                />
              ))}
            </div>
            {/* ツモ牌 */}
            {gs.drawn[0] && (
              <>
                <div style={{ width: 10, flexShrink: 0 }} />
                <TileSVG
                  tile={gs.drawn[0]}
                  w={46}
                  h={62}
                  drawn
                  selected={gs.selectedTile === 100}
                  onClick={() =>
                    gs.selectedTile === 100
                      ? discardSelected()
                      : selectTile(100)
                  }
                />
              </>
            )}
            {/* 副露牌 */}
            {gs.melds[0].length > 0 && (
              <div
                style={{
                  display: "flex",
                  gap: 2,
                  alignItems: "flex-end",
                  marginLeft: 10,
                }}
              >
                {gs.melds[0].map((meld, mi) =>
                  meld.tiles.map((t, ti) => (
                    <TileSVG
                      key={`${mi}-${ti}`}
                      tile={t}
                      w={36}
                      h={48}
                      noHover
                    />
                  )),
                )}
              </div>
            )}
          </div>

          {/* アクションボタン */}
          <div
            style={{
              position: "absolute",
              bottom: 10,
              left: "50%",
              transform: "translateX(-50%)",
              display: "flex",
              gap: 5,
            }}
          >
            {canRon && (
              <button
                className="action-btn"
                style={{ borderColor: "#888", color: "#ccc" }}
                onClick={skipRon}
              >
                スキップ
              </button>
            )}
            <button className="action-btn" disabled>
              カン
            </button>
            <button className="action-btn" disabled>
              チー
            </button>
            <button className="action-btn" disabled>
              ポン
            </button>
            <button
              className={`action-btn${canRon ? " highlight" : ""}`}
              disabled={!canRon}
              onClick={declareRon}
            >
              ロン
            </button>
            <button
              className={`action-btn${canTsumo ? " highlight" : ""}`}
              disabled={!canTsumo}
              onClick={declareTsumo}
            >
              ツモ
            </button>
          </div>

          {/* ステータス */}
          <div
            style={{
              position: "absolute",
              bottom: 118,
              left: "50%",
              transform: "translateX(-50%)",
              fontSize: 11,
              color: "#aaffaa",
              whiteSpace: "nowrap",
            }}
          >
            {status}
          </div>

          {/* 通知 */}
          {notification && (
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%,-50%)",
                background: "rgba(0,0,0,.85)",
                border: "2px solid #ffd700",
                borderRadius: 8,
                padding: "12px 24px",
                fontSize: 20,
                fontWeight: 700,
                color: "#ffd700",
                zIndex: 50,
                pointerEvents: "none",
              }}
            >
              {notification}
            </div>
          )}

          {/* ゲーム終了オーバーレイ */}
          {showOverlay && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(0,0,0,.75)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 8,
                zIndex: 100,
              }}
            >
              <div
                style={{
                  fontSize: 44,
                  fontWeight: 900,
                  color: overlayData.titleColor,
                  textShadow: "0 0 20px rgba(255,215,0,.8)",
                  marginBottom: 12,
                }}
              >
                {overlayData.title}
              </div>
              <div
                style={{
                  fontSize: 16,
                  color: "#fff",
                  marginBottom: 8,
                  textAlign: "center",
                  maxWidth: 400,
                  lineHeight: 1.8,
                  whiteSpace: "pre-line",
                }}
              >
                {overlayData.detail}
              </div>
              {overlayData.score && (
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 700,
                    color: "#88ff88",
                    marginBottom: 20,
                  }}
                >
                  {overlayData.score}
                </div>
              )}
              <button
                style={{
                  padding: "12px 32px",
                  background: "linear-gradient(145deg,#8a6030,#4a3010)",
                  border: "2px solid #ffd700",
                  borderRadius: 8,
                  color: "#ffd700",
                  fontSize: 16,
                  fontWeight: 700,
                  fontFamily: "Noto Sans JP, sans-serif",
                  cursor: "pointer",
                }}
                onClick={initGame}
              >
                もう一局
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// =====================================================================
//  補助コンポーネント
// =====================================================================
function WallTiles() {
  return (
    <>
      <div
        style={{
          position: "absolute",
          top: 8,
          left: 170,
          right: 22,
          height: 18,
          display: "flex",
          gap: 1,
        }}
      >
        {Array.from({ length: 22 }).map((_, i) => (
          <div
            key={i}
            className="wall-tile"
            style={{ width: 15, height: 18 }}
          />
        ))}
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 110,
          left: 55,
          right: 55,
          height: 16,
          display: "flex",
          gap: 1,
        }}
      >
        {Array.from({ length: 22 }).map((_, i) => (
          <div
            key={i}
            className="wall-tile"
            style={{ width: 15, height: 16 }}
          />
        ))}
      </div>
      <div
        style={{
          position: "absolute",
          top: 52,
          left: 8,
          bottom: 115,
          width: 16,
          display: "flex",
          flexDirection: "column",
          gap: 1,
        }}
      >
        {Array.from({ length: 18 }).map((_, i) => (
          <div
            key={i}
            className="wall-tile"
            style={{ width: 16, height: 14 }}
          />
        ))}
      </div>
      <div
        style={{
          position: "absolute",
          top: 52,
          right: 8,
          bottom: 115,
          width: 16,
          display: "flex",
          flexDirection: "column",
          gap: 1,
        }}
      >
        {Array.from({ length: 18 }).map((_, i) => (
          <div
            key={i}
            className="wall-tile"
            style={{ width: 16, height: 14 }}
          />
        ))}
      </div>
    </>
  );
}

function DiscardPile({
  tiles,
  style,
}: {
  id: string;
  tiles: Tile[];
  style: React.CSSProperties;
}) {
  return (
    <div style={style}>
      {tiles.map((t, i) => (
        <TileSVG key={`${t.id}-${i}`} tile={t} w={26} h={35} noHover />
      ))}
    </div>
  );
}
