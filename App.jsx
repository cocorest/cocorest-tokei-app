import { useState, useRef, useCallback } from "react";

// ====== カラー定義 ======
const SECTOR_COLORS = [
  "#E53935","#E91E8C","#9C27B0","#3F51B5",
  "#2196F3","#00BCD4","#009688","#4CAF50",
  "#8BC34A","#CDDC39","#FFC107","#FF5722"
];
const NUM_COLORS = [
  "#E53935","#E91E63","#9C27B0","#3F51B5",
  "#2196F3","#00BCD4","#009688","#4CAF50",
  "#8BC34A","#CDDC39","#FF9800","#FF5722"
];

const PRAISE = ["せいかい！🎉","すごい！✨","さすが！🌟","やったね！🎊","かんぺき！💯","すばらしい！🏆"];
const rndPraise = () => PRAISE[Math.floor(Math.random() * PRAISE.length)];

// ====== 角度→度数 ======
function angleToDeg(x, y, cx, cy) {
  let a = Math.atan2(y - cy, x - cx) * 180 / Math.PI + 90;
  if (a < 0) a += 360;
  return a;
}

// ====== 時計SVGコア（表示＆インタラクティブ共通） ======
function EducClock({ hour, minute, size = 300, interactive = false, onMinuteChange, showMinLabels = true }) {
  const svgRef = useRef(null);
  const dragging = useRef(false);
  // 分針が12をまたいだ回数を追跡するため、前回の分針角度を保持
  const prevMinAngle = useRef(null);

  const cx = size / 2, cy = size / 2;
  const outerR   = size / 2 - 4;
  const ringOuter = outerR;
  const ringInner = outerR * 0.78;
  const numR      = outerR * 0.62;
  const faceR     = outerR * 0.46;

  const hourAngleDeg   = ((hour % 12) + minute / 60) / 12 * 360;
  const minuteAngleDeg = minute / 60 * 360;
  const hourAngleRad   = (hourAngleDeg - 90) * Math.PI / 180;
  const minuteAngleRad = (minuteAngleDeg - 90) * Math.PI / 180;

  const hourHandLen = faceR * 0.62;
  const minHandLen  = faceR * 0.88;
  const hourX2 = cx + hourHandLen * Math.cos(hourAngleRad);
  const hourY2 = cy + hourHandLen * Math.sin(hourAngleRad);
  const minX2  = cx + minHandLen  * Math.cos(minuteAngleRad);
  const minY2  = cy + minHandLen  * Math.sin(minuteAngleRad);

  const getPos = (e) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    const scaleX = size / rect.width, scaleY = size / rect.height;
    const src = e.touches ? e.touches[0] : e;
    return { x: (src.clientX - rect.left) * scaleX, y: (src.clientY - rect.top) * scaleY };
  };

  // 分針先端付近かチェック
  const nearMinHand = (x, y) => {
    const dx = x - minX2, dy = y - minY2;
    return Math.hypot(dx, dy) < size * 0.12;
  };

  const onPointerDown = useCallback((e) => {
    if (!interactive) return;
    e.preventDefault();
    const { x, y } = getPos(e);
    if (nearMinHand(x, y)) {
      dragging.current = true;
      prevMinAngle.current = angleToDeg(x, y, cx, cy);
    }
  }, [interactive, minX2, minY2]);

  const onPointerMove = useCallback((e) => {
    if (!interactive || !dragging.current || !onMinuteChange) return;
    e.preventDefault();
    const { x, y } = getPos(e);
    const newAngle = angleToDeg(x, y, cx, cy);

    // 分の値（5分スナップ）
    const newM = Math.round(newAngle / 360 * 60 / 5) * 5 % 60;

    // 12をまたいだ判定：前回が330〜360付近 → 今回0〜30付近 → 時針を+1
    // 逆に前回0〜30 → 今回330〜360 → 時針を-1
    if (prevMinAngle.current !== null) {
      const prev = prevMinAngle.current;
      if (prev > 300 && newAngle < 60) {
        // 正方向に12を超えた
        onMinuteChange(newM, +1);
      } else if (prev < 60 && newAngle > 300) {
        // 逆方向に12を超えた
        onMinuteChange(newM, -1);
      } else {
        onMinuteChange(newM, 0);
      }
    }
    prevMinAngle.current = newAngle;
  }, [interactive, onMinuteChange, cx, cy]);

  const onPointerUp = useCallback(() => {
    dragging.current = false;
    prevMinAngle.current = null;
  }, []);

  return (
    <svg ref={svgRef} width={size} height={size}
      style={{ display: "block", filter: "drop-shadow(0 4px 14px rgba(0,0,0,0.18))", touchAction: "none", userSelect: "none" }}
      onMouseDown={onPointerDown} onMouseMove={onPointerMove} onMouseUp={onPointerUp} onMouseLeave={onPointerUp}
      onTouchStart={onPointerDown} onTouchMove={onPointerMove} onTouchEnd={onPointerUp}>

      {/* 外枠 */}
      <circle cx={cx} cy={cy} r={outerR + 3} fill="#c8c8c8" />
      <circle cx={cx} cy={cy} r={outerR + 1} fill="#eeeeee" />

      {/* カラーリング（分・12セクター） */}
      {Array.from({ length: 12 }, (_, i) => {
        const a0 = (i / 12) * 2 * Math.PI - Math.PI / 2;
        const a1 = ((i + 1) / 12) * 2 * Math.PI - Math.PI / 2;
        const x1 = cx + ringOuter * Math.cos(a0), y1 = cy + ringOuter * Math.sin(a0);
        const x2 = cx + ringOuter * Math.cos(a1), y2 = cy + ringOuter * Math.sin(a1);
        const xi1 = cx + ringInner * Math.cos(a0), yi1 = cy + ringInner * Math.sin(a0);
        const xi2 = cx + ringInner * Math.cos(a1), yi2 = cy + ringInner * Math.sin(a1);
        return <path key={i}
          d={`M${xi1},${yi1} L${x1},${y1} A${ringOuter},${ringOuter} 0 0,1 ${x2},${y2} L${xi2},${yi2} A${ringInner},${ringInner} 0 0,0 ${xi1},${yi1}`}
          fill={SECTOR_COLORS[i]} stroke="white" strokeWidth="1.5" />;
      })}

      {/* 目盛り */}
      {Array.from({ length: 60 }, (_, i) => {
        const a = (i / 60) * 2 * Math.PI - Math.PI / 2, maj = i % 5 === 0;
        return <line key={i}
          x1={cx + ringOuter * 0.99 * Math.cos(a)} y1={cy + ringOuter * 0.99 * Math.sin(a)}
          x2={cx + (maj ? ringOuter * 0.91 : ringOuter * 0.95) * Math.cos(a)}
          y2={cy + (maj ? ringOuter * 0.91 : ringOuter * 0.95) * Math.sin(a)}
          stroke="white" strokeWidth={maj ? 2 : 1} opacity="0.7" />;
      })}

      {/* 分数字（5分刻み）- showMinLabels=false のとき非表示 */}
      {showMinLabels && Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * 2 * Math.PI - Math.PI / 2;
        const nr = (ringOuter + ringInner) / 2;
        return <text key={i} x={cx + nr * Math.cos(a)} y={cy + nr * Math.sin(a)}
          textAnchor="middle" dominantBaseline="central"
          fontSize={size * 0.054} fontWeight="900" fill="white"
          style={{ paintOrder: "stroke", stroke: "rgba(0,0,0,0.3)", strokeWidth: "1.5px" }}>
          {i === 0 ? "00" : i * 5}
        </text>;
      })}

      {/* 白い文字盤 */}
      <circle cx={cx} cy={cy} r={ringInner - 1} fill="white" />

      {/* 時の数字（カラフル大） */}
      {Array.from({ length: 12 }, (_, i) => {
        const h = i === 0 ? 12 : i, a = (i / 12) * 2 * Math.PI - Math.PI / 2;
        return <text key={i} x={cx + numR * Math.cos(a)} y={cy + numR * Math.sin(a)}
          textAnchor="middle" dominantBaseline="central"
          fontSize={size * 0.095} fontWeight="900" fill={NUM_COLORS[i]}>{h}</text>;
      })}

      {/* 中心白地 */}
      <circle cx={cx} cy={cy} r={faceR} fill="white" />

      {/* 分針（青） */}
      <line
        x1={cx - (size * 0.015) * Math.cos(minuteAngleRad)}
        y1={cy - (size * 0.015) * Math.sin(minuteAngleRad)}
        x2={minX2} y2={minY2}
        stroke="#3A7BD5" strokeWidth={size * 0.026} strokeLinecap="round" />

      {/* 時針（赤） */}
      <line
        x1={cx - (size * 0.012) * Math.cos(hourAngleRad)}
        y1={cy - (size * 0.012) * Math.sin(hourAngleRad)}
        x2={hourX2} y2={hourY2}
        stroke="#E53935" strokeWidth={size * 0.036} strokeLinecap="round" />

      {/* 中心キャップ */}
      <circle cx={cx} cy={cy} r={size * 0.032} fill="#555" />
      <circle cx={cx} cy={cy} r={size * 0.018} fill="#eee" />

      {/* ドラッグヒント（分針先端の丸） */}
      {interactive && (
        <circle cx={minX2} cy={minY2} r={size * 0.062}
          fill="rgba(58,123,213,0.2)" stroke="#3A7BD5" strokeWidth="2.5" strokeDasharray="5 3" />
      )}
    </svg>
  );
}

// ====== シンプル時計（むずかしいモード）= 知育時計デザイン・分数字なし ======
function SimpleClock({ hour, minute, size = 260 }) {
  // EducClock と同じデザインで分の数字だけ省略
  return <EducClock hour={hour} minute={minute} size={size} showMinLabels={false} />;
}

// ====== ユーティリティ ======
const rndHour = () => Math.floor(Math.random() * 12) + 1;
// やさしい = ○時 か ○時半 のみ
const HARD_MINS = [5,10,15,20,25,35,40,45,50,55]; // 0と30を除く5分刻み
const rndMin = (easy) => easy ? [0, 30][Math.floor(Math.random() * 2)] : HARD_MINS[Math.floor(Math.random() * HARD_MINS.length)];
const fmtTime = (h, m) => m === 0 ? `${h}じ` : `${h}じ ${m}ふん`;
const fmtTimeLabel = (h, m) => m === 0 ? `${h}じ` : `${h}じ30ふん`;

// やさしいreadは前半5問○時・後半5問○時半（重複なし）
function genEasyReadSet() {
  const hours = Array.from({length:12},(_,i)=>i+1).sort(()=>Math.random()-0.5);
  const first5 = hours.slice(0,5).map(h => {
    const ans = fmtTime(h, 0);
    const choices = [ans];
    while (choices.length < 4) {
      const c = fmtTime(rndHour(), 0);
      if (!choices.includes(c)) choices.push(c);
    }
    return { type:"read", hour:h, minute:0, answer:ans, choices:choices.sort(()=>Math.random()-0.5) };
  });
  const last5 = hours.slice(5,10).map(h => {
    const ans = fmtTime(h, 30);
    const choices = [ans];
    while (choices.length < 4) {
      const c = fmtTime(rndHour(), 30);
      if (!choices.includes(c)) choices.push(c);
    }
    return { type:"read", hour:h, minute:30, answer:ans, choices:choices.sort(()=>Math.random()-0.5) };
  });
  return [...first5, ...last5];
}
function genRead(easy) {
  const m = rndMin(easy), h = rndHour(), ans = fmtTime(h, m);
  const choices = [ans];
  while (choices.length < 4) {
    const c = fmtTime(rndHour(), m);
    if (!choices.includes(c)) choices.push(c);
  }
  return { type: "read", hour: h, minute: m, answer: ans, choices: choices.sort(() => Math.random() - 0.5) };
}
function genSelect(easy) {
  const h = rndHour(), m = rndMin(easy);
  const used = new Set([`${h}-${m}`]);
  const clocks = [{ hour: h, minute: m, correct: true }];
  let tries = 0;
  while (clocks.length < 4 && tries < 200) {
    tries++;
    const fh = rndHour(), fm = rndMin(easy);
    const key = `${fh}-${fm}`;
    if (!used.has(key)) {
      used.add(key);
      clocks.push({ hour: fh, minute: fm, correct: false });
    }
  }
  return { type: "select", hour: h, minute: m, clocks: clocks.sort(() => Math.random() - 0.5) };
}
function genSet(easy) { return { type: "set", hour: rndHour(), minute: rndMin(easy) }; }
function genQs(mode, qtype, n = 10) {
  const easy = mode === "easy";
  if (easy && qtype === "read") return genEasyReadSet();
  return Array.from({ length: n }, () =>
    qtype === "read" ? genRead(easy) : qtype === "select" ? genSelect(easy) : genSet(easy)
  );
}

// ====== 正解オーバーレイ ======
function PraiseOverlay({ text, show }) {
  if (!show) return null;
  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none", zIndex: 999 }}>
      <div style={{ background: "linear-gradient(135deg,#FFD700,#FF8C42)", borderRadius: 32, padding: "28px 52px", fontSize: 46, fontWeight: 900, color: "white", boxShadow: "0 8px 40px rgba(255,180,0,0.6)", animation: "praiseAnim 0.65s ease-out", textShadow: "0 2px 8px rgba(0,0,0,0.18)" }}>{text}</div>
    </div>
  );
}

// ====== メイン ======
export default function App() {
  const [screen, setScreen] = useState("home");
  const [mode, setMode] = useState("easy");
  const [qtype, setQtype] = useState("read");
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [setH, setSetH] = useState(12);
  const [setM, setSetM] = useState(0);
  const [praise, setPraise] = useState("");
  const [showPraise, setShowPraise] = useState(false);
  const [wasCorrect, setWasCorrect] = useState(false);

  const q = questions[current];
  const DisplayClock = mode === "easy" ? EducClock : SimpleClock;

  function boom() { setPraise(rndPraise()); setShowPraise(true); setTimeout(() => setShowPraise(false), 1300); }

  function start(m, qt) {
    setMode(m); setQtype(qt);
    setQuestions(genQs(m, qt, 10));
    setCurrent(0); setSelected(null); setAnswered(false); setScore(0);
    setWasCorrect(false); setSetH(12); setSetM(0);
    setScreen("quiz");
  }

  function answer(choice, correct) {
    if (answered) return;
    setSelected(choice); setAnswered(true); setWasCorrect(correct);
    if (correct) { setScore(s => s + 1); boom(); }
  }

  function next() {
    if (current + 1 >= questions.length) setScreen("result");
    else { setCurrent(c => c + 1); setSelected(null); setAnswered(false); setWasCorrect(false); setSetH(12); setSetM(0); }
  }

  // 分針ドラッグ時：分を更新し、12をまたいだら時針を±1
  const handleMinuteChange = useCallback((newM, hourDelta) => {
    setSetM(newM);
    if (hourDelta !== 0) {
      setSetH(h => {
        let nh = h + hourDelta;
        if (nh > 12) nh = 1;
        if (nh < 1) nh = 12;
        return nh;
      });
    }
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg,#E0F7FA 0%,#B2EBF2 55%,#E8F5E9 100%)", fontFamily: "'M PLUS Rounded 1c','Noto Sans JP',sans-serif", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "12px" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c:wght@700;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        .card{background:white;border-radius:28px;box-shadow:0 8px 32px rgba(0,0,0,0.12);padding:20px 16px;width:100%;max-width:430px;}
        .btn{border:none;cursor:pointer;border-radius:40px;font-family:inherit;font-weight:900;transition:transform 0.1s;}
        .btn:active{transform:scale(0.93);}
        .back-btn{background:rgba(255,255,255,0.9);border:none;border-radius:14px;width:46px;height:46px;font-size:22px;cursor:pointer;font-weight:900;flex-shrink:0;}
        @keyframes popIn{0%{transform:scale(0.6);opacity:0}70%{transform:scale(1.08)}100%{transform:scale(1);opacity:1}}
        @keyframes praiseAnim{0%{transform:scale(0.3) rotate(-10deg);opacity:0}60%{transform:scale(1.18) rotate(3deg)}100%{transform:scale(1) rotate(0);opacity:1}}
        @keyframes bounce{0%{transform:scale(1)}40%{transform:scale(1.13)}100%{transform:scale(1)}}
        .cbtn{width:100%;padding:16px 10px;font-size:24px;border-radius:16px;border:4px solid #ddd;background:white;cursor:pointer;font-family:inherit;font-weight:900;transition:all 0.15s;margin-bottom:10px;line-height:1;}
        .cbtn:active{transform:scale(0.95);}
        .cbtn.ok{background:#4CAF50;border-color:#388E3C;color:white;animation:bounce 0.4s;}
        .cbtn.ng{background:#EF5350;border-color:#C62828;color:white;}
        .cbtn.hl{border-color:#2196F3;background:#E3F2FD;}
        .cc{border:4px solid #ddd;border-radius:16px;background:#f8f8f8;cursor:pointer;padding:4px;transition:all 0.15s;display:flex;align-items:center;justify-content:center;aspect-ratio:1;}
        .cc.ok{border-color:#388E3C;background:#E8F5E9;animation:bounce 0.4s;}
        .cc.ng{border-color:#C62828;background:#FFEBEE;}
        .pb{height:10px;background:rgba(255,255,255,0.3);border-radius:10px;overflow:hidden;}
        .pf{height:100%;background:linear-gradient(90deg,#FFE066,#FFD700);border-radius:10px;transition:width 0.4s;}
      `}</style>

      <PraiseOverlay text={praise} show={showPraise} />

      {/* ホーム */}
      {screen === "home" && (
        <div className="card" style={{ textAlign: "center", animation: "popIn 0.5s" }}>
          <div style={{ fontSize: 80, marginBottom: 8 }}>🕐</div>
          <h1 style={{ fontSize: 38, color: "#2196F3", marginBottom: 12, lineHeight: 1.3 }}>とけいの<br />れんしゅう</h1>
          <p style={{ color: "#666", fontSize: 22, fontWeight: 700, marginBottom: 36 }}>じかんをたのしくまなぼう！</p>
          <button className="btn" onClick={() => setScreen("modeSelect")}
            style={{ background: "linear-gradient(135deg,#4ECDC4,#45B7D1)", color: "white", fontSize: 30, padding: "22px 64px", boxShadow: "0 6px 22px rgba(78,205,196,0.45)", letterSpacing: 2 }}>
            はじめる！
          </button>
        </div>
      )}

      {/* 難易度選択 */}
      {screen === "modeSelect" && (
        <div className="card" style={{ animation: "popIn 0.4s" }}>
          <button onClick={() => setScreen("home")} className="back-btn" style={{ marginBottom: 16 }}>←</button>
          <h2 style={{ textAlign: "center", fontSize: 32, color: "#333", marginBottom: 24 }}>もんだいをえらぶ</h2>
          {[
            { key: "easy", label: "やさしい 🌱", sub: "○じ・○じ30ふん だけ", color: "#A8E063", border: "#7CB342" },
            { key: "hard", label: "むずかしい 🔥", sub: "○じ○ふん（5ふんきざみ）", color: "#FFD54F", border: "#F9A825" },
          ].map(o => (
            <button key={o.key} className="btn"
              onClick={() => { setMode(o.key); setScreen("questionType"); }}
              style={{ width: "100%", background: o.color, border: `4px solid ${o.border}`, fontSize: 28, padding: "22px", marginBottom: 16, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <span>{o.label}</span>
              <span style={{ fontSize: 17, fontWeight: 700, color: "#555" }}>{o.sub}</span>
            </button>
          ))}
        </div>
      )}

      {/* 問題タイプ選択 */}
      {screen === "questionType" && (
        <div className="card" style={{ animation: "popIn 0.4s" }}>
          <button onClick={() => setScreen("modeSelect")} className="back-btn" style={{ marginBottom: 12 }}>←</button>
          <h2 style={{ textAlign: "center", fontSize: 28, color: "#333", marginBottom: 8 }}>
            <span style={{ color: mode === "easy" ? "#7CB342" : "#F9A825" }}>
              {mode === "easy" ? "やさしい 🌱" : "むずかしい 🔥"}
            </span>
          </h2>
          <p style={{ textAlign: "center", color: "#777", fontSize: 20, fontWeight: 700, marginBottom: 20 }}>もんだいをえらんでね</p>
          {[
            { key: "read",   label: "とけいをよむ",   sub: "なんじですか？",    emoji: "🔍" },
            { key: "select", label: "とけいをえらぶ", sub: "○じはどれ？",      emoji: "👆" },
            { key: "set",    label: "とけいをあわせる", sub: "はりをうごかしてね", emoji: "🎯" },
          ].map(o => (
            <button key={o.key} className="btn"
              onClick={() => start(mode, o.key)}
              style={{ width: "100%", background: "white", border: "4px solid #B2EBF2", padding: "18px 20px", marginBottom: 14, display: "flex", alignItems: "center", gap: 16, textAlign: "left" }}>
              <span style={{ fontSize: 40 }}>{o.emoji}</span>
              <div>
                <div style={{ fontSize: 24, fontWeight: 900 }}>{o.label}</div>
                <div style={{ fontSize: 16, color: "#888", fontWeight: 700, marginTop: 3 }}>{o.sub}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* クイズ */}
      {screen === "quiz" && q && (
        <div style={{ width: "100%", maxWidth: 430 }}>
          {/* ヘッダー */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12, background: "#00897B", borderRadius: 20, padding: "12px 16px" }}>
            <button onClick={() => setScreen("questionType")} className="back-btn">←</button>
            <div style={{ flex: 1 }}><div className="pb"><div className="pf" style={{ width: `${(current / questions.length) * 100}%` }} /></div></div>
            <span style={{ color: "white", fontWeight: 900, fontSize: 24 }}>{current + 1}/{questions.length}</span>
          </div>

          {/* よむ問題 */}
          {q.type === "read" && (
            <div className="card">
              <p style={{ textAlign: "center", fontSize: 26, fontWeight: 900, color: "#333", marginBottom: 14, lineHeight: 1.4 }}>
                <span style={{ color: "#E53935" }}>なんじ</span>
                {q.minute > 0 && <span style={{ color: "#3A7BD5" }}>なんぷん</span>}ですか？
              </p>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
                <DisplayClock hour={q.hour} minute={q.minute} size={240} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {q.choices.map(c => {
                  let cls = "cbtn";
                  if (answered) { if (c === q.answer) cls += " ok"; else if (c === selected) cls += " ng"; }
                  else if (c === selected) cls += " hl";
                  return <button key={c} className={cls} onClick={() => answer(c, c === q.answer)}>{c}</button>;
                })}
              </div>
              {answered && !wasCorrect && (
                <div style={{ textAlign: "center", fontSize: 22, fontWeight: 900, color: "#E53935", marginTop: 12 }}>
                  こたえは <span style={{ fontSize: 26 }}>{q.answer}</span> だよ！
                </div>
              )}
              {answered && (
                <button className="btn" onClick={next}
                  style={{ width: "100%", background: "linear-gradient(135deg,#4ECDC4,#45B7D1)", color: "white", fontSize: 26, padding: "15px", marginTop: 12, boxShadow: "0 4px 16px rgba(78,205,196,0.35)" }}>
                  {current + 1 >= questions.length ? "けっかをみる 🏁" : "つぎへ →"}
                </button>
              )}
            </div>
          )}

          {/* えらぶ問題 */}
          {q.type === "select" && (
            <div className="card">
              <p style={{ textAlign: "center", fontSize: 26, fontWeight: 900, color: "#333", marginBottom: 12, lineHeight: 1.4 }}>
                <span style={{ color: "#E53935", fontSize: 32 }}>
                  {fmtTime(q.hour, q.minute)}
                </span>
                <br />はどれですか？
              </p>
              {/* 4つの時計グリッド：枠内に完全に収まるよう width:100% でリサイズ */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {q.clocks.map((clk, i) => {
                  let cls = "cc";
                  if (answered) { if (clk.correct) cls += " ok"; else if (selected === i) cls += " ng"; }
                  return (
                    <div key={i} className={cls}
                      style={{ overflow: "hidden" }}
                      onClick={() => {
                        if (answered) return;
                        setSelected(i); setAnswered(true); setWasCorrect(clk.correct);
                        if (clk.correct) { setScore(s => s + 1); boom(); }
                      }}>
                      {/* SVGを親要素幅に合わせてスケール */}
                      <div style={{ width: "100%", aspectRatio: "1" }}>
                        <svg viewBox="0 0 300 300" width="100%" height="100%"
                          style={{ display: "block" }}>
                          <ClockInner hour={clk.hour} minute={clk.minute} size={300} showMinLabels={mode === "easy"} />
                        </svg>
                      </div>
                    </div>
                  );
                })}
              </div>
              {answered && !wasCorrect && (
                <div style={{ textAlign: "center", fontSize: 20, fontWeight: 900, color: "#E53935", marginTop: 10 }}>みどりいろのわくがせいかいだよ！</div>
              )}
              {answered && (
                <button className="btn" onClick={next}
                  style={{ width: "100%", background: "linear-gradient(135deg,#4ECDC4,#45B7D1)", color: "white", fontSize: 26, padding: "15px", marginTop: 12, boxShadow: "0 4px 16px rgba(78,205,196,0.35)" }}>
                  {current + 1 >= questions.length ? "けっかをみる 🏁" : "つぎへ →"}
                </button>
              )}
            </div>
          )}

          {/* あわせる問題 */}
          {q.type === "set" && (
            <div className="card">
              <p style={{ textAlign: "center", fontSize: 26, fontWeight: 900, color: "#333", marginBottom: 8, lineHeight: 1.5 }}>
                <span style={{ color: "#E53935", fontSize: 34 }}>
                  {fmtTime(q.hour, q.minute)}
                </span>
                <br />にあわせよう！
              </p>
              {!answered && (
                <p style={{ textAlign: "center", fontSize: 18, fontWeight: 700, color: "#3A7BD5", background: "#E3F2FD", borderRadius: 20, padding: "8px 16px", marginBottom: 10 }}>
                  🔵 ながいはりをひっぱってね
                </p>
              )}
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
                <EducClock hour={setH} minute={setM} size={260}
                  interactive={!answered}
                  onMinuteChange={!answered ? handleMinuteChange : undefined} />
              </div>
              <div style={{ textAlign: "center", fontSize: 28, fontWeight: 900, color: "#333", marginBottom: 12 }}>
                いま：<span style={{ color: "#2196F3" }}>
                  {fmtTime(setH, setM)}
                </span>
              </div>
              {!answered && (
                <button className="btn" onClick={() => {
                  const ok = setH === q.hour && setM === q.minute;
                  setAnswered(true); setWasCorrect(ok);
                  if (ok) { setScore(s => s + 1); boom(); }
                }} style={{ width: "100%", background: "linear-gradient(135deg,#FFD54F,#FF8C42)", color: "white", fontSize: 28, padding: "17px", boxShadow: "0 4px 16px rgba(255,180,0,0.4)" }}>
                  できた！✋
                </button>
              )}
              {answered && (
                <>
                  {!wasCorrect && (
                    <div style={{ textAlign: "center", marginBottom: 12 }}>
                      <div style={{ fontSize: 22, fontWeight: 900, color: "#E53935", marginBottom: 8 }}>
                        こたえは {fmtTime(q.hour, q.minute)} だよ！
                      </div>
                      <div style={{ display: "flex", justifyContent: "center" }}>
                        <EducClock hour={q.hour} minute={q.minute} size={170} />
                      </div>
                    </div>
                  )}
                  <button className="btn" onClick={next}
                    style={{ width: "100%", background: "linear-gradient(135deg,#4ECDC4,#45B7D1)", color: "white", fontSize: 26, padding: "15px", marginTop: 8, boxShadow: "0 4px 16px rgba(78,205,196,0.35)" }}>
                    {current + 1 >= questions.length ? "けっかをみる 🏁" : "つぎへ →"}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* けっか */}
      {screen === "result" && (
        <div className="card" style={{ textAlign: "center", animation: "popIn 0.5s" }}>
          <div style={{ fontSize: 88, marginBottom: 8 }}>{score === questions.length ? "🏆" : score >= 7 ? "⭐" : "💪"}</div>
          <h2 style={{ fontSize: 34, color: "#333", marginBottom: 14 }}>おわったよ！</h2>
          <div style={{ fontSize: 60, fontWeight: 900, color: "#E53935", marginBottom: 10, lineHeight: 1 }}>
            {score}<span style={{ fontSize: 32, color: "#aaa" }}>/{questions.length}</span>
          </div>
          <p style={{ color: "#555", fontSize: 24, fontWeight: 700, marginBottom: 28 }}>
            {score === questions.length ? "ぜんもんせいかい！🎉" : score >= 7 ? "すごい！よくできたね！👏" : score >= 5 ? "よくできました！😊" : "もういちどチャレンジ！💪"}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <button className="btn" onClick={() => start(mode, qtype)}
              style={{ background: "linear-gradient(135deg,#4ECDC4,#45B7D1)", color: "white", fontSize: 26, padding: "18px", boxShadow: "0 4px 18px rgba(78,205,196,0.4)" }}>
              もういちど！
            </button>
            <button className="btn" onClick={() => setScreen("questionType")}
              style={{ background: "#f0f0f0", color: "#444", fontSize: 22, padding: "16px", border: "3px solid #ddd" }}>
              もんだいをかえる
            </button>
            <button className="btn" onClick={() => setScreen("home")}
              style={{ background: "#f0f0f0", color: "#444", fontSize: 22, padding: "16px", border: "3px solid #ddd" }}>
              トップへ
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ====== 時計の内部SVG要素（viewBox共有用） ======
// えらぶ問題の4分割グリッドで viewBox スケーリングするために分離
function ClockInner({ hour, minute, size = 300, showMinLabels = true }) {
  const cx = size / 2, cy = size / 2;
  const outerR    = size / 2 - 4;
  const ringOuter = outerR;
  const ringInner = outerR * 0.78;
  const numR      = outerR * 0.62;
  const faceR     = outerR * 0.46;

  const hourAngleDeg   = ((hour % 12) + minute / 60) / 12 * 360;
  const minuteAngleDeg = minute / 60 * 360;
  const hourAngleRad   = (hourAngleDeg - 90) * Math.PI / 180;
  const minuteAngleRad = (minuteAngleDeg - 90) * Math.PI / 180;

  const hourHandLen = faceR * 0.62;
  const minHandLen  = faceR * 0.88;
  const hourX2 = cx + hourHandLen * Math.cos(hourAngleRad);
  const hourY2 = cy + hourHandLen * Math.sin(hourAngleRad);
  const minX2  = cx + minHandLen  * Math.cos(minuteAngleRad);
  const minY2  = cy + minHandLen  * Math.sin(minuteAngleRad);

  return (
    <>
      <circle cx={cx} cy={cy} r={outerR + 3} fill="#c8c8c8" />
      <circle cx={cx} cy={cy} r={outerR + 1} fill="#eeeeee" />
      {Array.from({ length: 12 }, (_, i) => {
        const a0 = (i / 12) * 2 * Math.PI - Math.PI / 2;
        const a1 = ((i + 1) / 12) * 2 * Math.PI - Math.PI / 2;
        const x1 = cx + ringOuter * Math.cos(a0), y1 = cy + ringOuter * Math.sin(a0);
        const x2 = cx + ringOuter * Math.cos(a1), y2 = cy + ringOuter * Math.sin(a1);
        const xi1 = cx + ringInner * Math.cos(a0), yi1 = cy + ringInner * Math.sin(a0);
        const xi2 = cx + ringInner * Math.cos(a1), yi2 = cy + ringInner * Math.sin(a1);
        return <path key={i}
          d={`M${xi1},${yi1} L${x1},${y1} A${ringOuter},${ringOuter} 0 0,1 ${x2},${y2} L${xi2},${yi2} A${ringInner},${ringInner} 0 0,0 ${xi1},${yi1}`}
          fill={SECTOR_COLORS[i]} stroke="white" strokeWidth="1.5" />;
      })}
      {Array.from({ length: 60 }, (_, i) => {
        const a = (i / 60) * 2 * Math.PI - Math.PI / 2, maj = i % 5 === 0;
        return <line key={i}
          x1={cx + ringOuter * 0.99 * Math.cos(a)} y1={cy + ringOuter * 0.99 * Math.sin(a)}
          x2={cx + (maj ? ringOuter * 0.91 : ringOuter * 0.95) * Math.cos(a)}
          y2={cy + (maj ? ringOuter * 0.91 : ringOuter * 0.95) * Math.sin(a)}
          stroke="white" strokeWidth={maj ? 2 : 1} opacity="0.7" />;
      })}
      {showMinLabels && Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * 2 * Math.PI - Math.PI / 2, nr = (ringOuter + ringInner) / 2;
        return <text key={i} x={cx + nr * Math.cos(a)} y={cy + nr * Math.sin(a)}
          textAnchor="middle" dominantBaseline="central"
          fontSize={size * 0.054} fontWeight="900" fill="white"
          style={{ paintOrder: "stroke", stroke: "rgba(0,0,0,0.3)", strokeWidth: "1.5px" }}>
          {i === 0 ? "00" : i * 5}
        </text>;
      })}
      <circle cx={cx} cy={cy} r={ringInner - 1} fill="white" />
      {Array.from({ length: 12 }, (_, i) => {
        const h = i === 0 ? 12 : i, a = (i / 12) * 2 * Math.PI - Math.PI / 2;
        return <text key={i} x={cx + numR * Math.cos(a)} y={cy + numR * Math.sin(a)}
          textAnchor="middle" dominantBaseline="central"
          fontSize={size * 0.095} fontWeight="900" fill={NUM_COLORS[i]}>{h}</text>;
      })}
      <circle cx={cx} cy={cy} r={faceR} fill="white" />
      <line x1={cx - 4 * Math.cos(minuteAngleRad)} y1={cy - 4 * Math.sin(minuteAngleRad)} x2={minX2} y2={minY2}
        stroke="#3A7BD5" strokeWidth={size * 0.026} strokeLinecap="round" />
      <line x1={cx - 3.5 * Math.cos(hourAngleRad)} y1={cy - 3.5 * Math.sin(hourAngleRad)} x2={hourX2} y2={hourY2}
        stroke="#E53935" strokeWidth={size * 0.036} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={size * 0.032} fill="#555" />
      <circle cx={cx} cy={cy} r={size * 0.018} fill="#eee" />
    </>
  );
}
