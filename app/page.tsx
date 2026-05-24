"use client";

import { useEffect, useMemo, useRef, useState, type JSX } from "react";

type Platform = "weixin" | "xiaohongshu";
type XhsStyle = "干货分享" | "经验分享" | "个人观点" | "情绪抒发" | "生活记录";
type WeixinType = "情绪共鸣" | "经验干货" | "热点观点" | "人设故事" | "通用兜底";

type StyleAnalysis = {
  recommended_style: XhsStyle;
  sub_direction: string;
  tone: string;
  emoji_density: "low" | "medium" | "high";
  reason: string;
  user_facing_summary: string;
  confidence: number;
  alternative_styles: string[];
};

type StyleCheck = {
  is_suitable: boolean;
  mismatch_level: "none" | "mild" | "obvious" | "strong";
  recommended_style: string;
  warning: string;
  can_continue: boolean;
  rewrite_impact: string;
};

type WeixinAnalysis = {
  recommended_type: WeixinType;
  reason: string;
  user_facing_summary: string;
  confidence: number;
  alternative_types: string[];
};

type WeixinTypeCheck = {
  is_suitable: boolean;
  mismatch_level: "none" | "mild" | "obvious" | "strong";
  recommended_type: string;
  warning: string;
  can_continue: boolean;
  rewrite_impact: string;
};

const platformConfig = {
  xiaohongshu: {
    name: "小红书",
    shortName: "小红书",
    accent: "red",
    description: "轻表达、强钩子、适合收藏和互动。",
    targetLabel: "分析小红书风格",
    sourceGuess: "粘贴任意草稿，先让 AI 判断最适合的小红书表达方向。",
  },
  weixin: {
    name: "微信公众号",
    shortName: "公众号",
    accent: "green",
    description: "结构完整、观点清楚、适合深度阅读。",
    targetLabel: "分析公众号方向",
    sourceGuess: "更适合从小红书笔记、短文案或碎片灵感扩写而来。",
  },
} satisfies Record<
  Platform,
  {
    name: string;
    shortName: string;
    accent: "red" | "green";
    description: string;
    targetLabel: string;
    sourceGuess: string;
  }
>;

const xhsStyles: Array<{ value: XhsStyle; label: string; desc: string }> = [
  { value: "干货分享", label: "干货分享", desc: "方法、步骤、技巧" },
  { value: "经验分享", label: "经验分享", desc: "经历、踩坑、复盘" },
  { value: "个人观点", label: "个人观点", desc: "看法、判断、立场" },
  { value: "情绪抒发", label: "情绪抒发", desc: "心情、感受、内心独白" },
  { value: "生活记录", label: "生活记录", desc: "日常片段、状态记录" },
];

const weixinTypes: Array<{ value: WeixinType; label: string; desc: string }> = [
  { value: "情绪共鸣", label: "情绪共鸣", desc: "感悟、情绪、关系话题" },
  { value: "经验干货", label: "经验干货", desc: "方法、步骤、实用建议" },
  { value: "热点观点", label: "热点观点", desc: "事件、趋势、观点分析" },
  { value: "人设故事", label: "人设故事", desc: "经历、转折、人物故事" },
  { value: "通用兜底", label: "通用兜底", desc: "混合内容或类型不明确" },
];

const sampleResult = {
  xiaohongshu:
    "标题：别再把长文直接搬到小红书了\n\n很多人做内容复用，最容易犯的错就是：\n把一篇完整文章压缩一下，就当成小红书笔记。\n\n但小红书不是短版长文。\n\n它更需要一个能立刻让人停下来的开头，一个足够具体的场景，还有读完马上能带走的结论。\n\n所以这次改写会做三件事：\n1. 把长铺垫改成痛点开头\n2. 把完整论证拆成短段落\n3. 把结尾改成明确收束\n\n同一份内容，换个平台，就要换一种说话方式。\n\n#内容运营 #小红书写作 #平台表达 #自媒体",
  weixin:
    "## 同一份内容，为什么不能直接搬到另一个平台\n\n很多内容创作者都有一个误区：只要内容本身有价值，发到哪个平台都应该有效。\n\n但事实恰恰相反。平台不是简单的发布渠道，而是一套阅读习惯。\n\n小红书用户更快判断一段内容和自己有没有关系，所以它需要更强的场景、更短的段落和更明确的收藏点。公众号读者则愿意给一篇文章更多时间，但前提是文章有清楚的结构、稳定的观点和可信的论证。\n\n因此，真正的跨平台改写不是换语气，而是重新组织信息。\n\n把小红书改成公众号，要补足逻辑和背景。把公众号改成小红书，要压缩铺垫、提炼钩子、增强互动。\n\n内容复用的关键，不是多发几个平台，而是让同一份内容在不同平台里都长得合理。",
};

function detectInputState(content: string, platform: Platform) {
  const trimmed = content.trim();
  if (!trimmed) return "等待输入内容";
  if (trimmed.length < 80) return "更像碎片想法，需要先补足结构";
  if (trimmed.includes("#") || trimmed.split("\n").length > 8) {
    return platform === "weixin" ? "像小红书笔记，适合扩写为公众号文章" : "像社媒文案，可继续强化小红书表达";
  }
  if (trimmed.length > 600) {
    return platform === "xiaohongshu" ? "像长文草稿，适合压缩为小红书短笔记" : "像完整文章，可继续打磨公众号结构";
  }
  return "像半成品内容，适合按目标平台重组";
}

type PolishStep = "hidden" | "input" | "reviewing";
type Token = { t: "word" | "punct"; v: string };
type Edit = { type: "keep" | "insert" | "delete"; text: string; isPunct: boolean };
type Marker = { type: string; content: string; key: string };

type SpeechRecognitionInstance = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: (() => void) | null;
  onresult: ((e: SpeechRecognitionResultEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
};
type SpeechRecognitionResultEvent = {
  resultIndex: number;
  results: SpeechRecognitionResultList;
};
type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  let buf = "";
  for (const ch of text) {
    if (/[，。！？、；：""''（）\n,.;:!?() ]/.test(ch)) {
      if (buf) { tokens.push({ t: "word", v: buf }); buf = ""; }
      tokens.push({ t: "punct", v: ch });
    } else { buf += ch; }
  }
  if (buf) tokens.push({ t: "word", v: buf });
  return tokens;
}

function computeDiff(original: string, polished: string): Edit[] {
  const oT = tokenize(original), pT = tokenize(polished);
  const m = oT.length, n = pT.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0) as number[]);
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = oT[i-1].v === pT[j-1].v && oT[i-1].t === pT[j-1].t
        ? dp[i-1][j-1] + 1 : Math.max(dp[i-1][j], dp[i][j-1]);
  const edits: Edit[] = [];
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oT[i-1].v === pT[j-1].v && oT[i-1].t === pT[j-1].t) {
      edits.unshift({ type: "keep", text: pT[j-1].v, isPunct: pT[j-1].t === "punct" }); i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j-1] >= dp[i-1][j])) {
      edits.unshift({ type: "insert", text: pT[j-1].v, isPunct: pT[j-1].t === "punct" }); j--;
    } else {
      edits.unshift({ type: "delete", text: oT[i-1].v, isPunct: oT[i-1].t === "punct" }); i--;
    }
  }
  return edits;
}

function parseMarkers(raw: string): { clean: string; markers: Marker[] } {
  const markers: Marker[] = [];
  const seen = new Set<string>();
  const re = /〔(疑[音义名])：([^〕]+)〕/g;
  let match;
  while ((match = re.exec(raw)) !== null) {
    const key = `${match[1]}::${match[2]}`;
    if (!seen.has(key)) { seen.add(key); markers.push({ type: match[1], content: match[2], key }); }
  }
  const clean = raw
    .replace(/〔疑[音义名]：([^〕]+)〕/g, "$1")
    .replace(/〔疑缺〕/g, "")
    .replace(/【概念一致性提示】[\s\S]*/g, "")
    .trim();
  return { clean, markers };
}

function renderDiff(edits: Edit[]) {
  const nodes: JSX.Element[] = [];
  let i = 0;
  while (i < edits.length) {
    if (edits[i].type === "keep") {
      nodes.push(edits[i].text === "\n" ? <br key={i} /> : <span key={i}>{edits[i].text}</span>);
      i++; continue;
    }
    let dels = "", ins = "";
    const si = i;
    while (i < edits.length && edits[i].type !== "keep") {
      if (edits[i].type === "delete") dels += edits[i].text; else ins += edits[i].text;
      i++;
    }
    if (dels && !ins) {
      nodes.push(<span key={si} className="rounded bg-red-100 px-0.5 text-red-600 line-through">{dels}</span>);
    } else if (!dels && ins) {
      const punct = /^[，。！？、；：\n]+$/.test(ins);
      nodes.push(<span key={si} className={`rounded px-0.5 ${punct ? "bg-sky-100 text-sky-700" : "bg-emerald-100 text-emerald-700"}`}>{ins}</span>);
    } else {
      const typo = dels.length <= 3 && ins.length <= 3 && !/[，。！？\n]/.test(dels + ins);
      nodes.push(
        <span key={si} className={`inline-flex items-baseline gap-1 rounded px-0.5 ${typo ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-800"}`}>
          <s className="opacity-50 text-xs">{dels}</s><span>{ins}</span>
        </span>
      );
    }
  }
  return nodes;
}

function parseXhsResult(text: string) {
  const titleMatch = /标题[：:]\s*\n?([^\n]+)/.exec(text);
  const bodyMatch = /正文[：:]\s*\n([\s\S]+?)(?:\n\n?标签[：:]|$)/.exec(text);
  const tagsMatch = /标签[：:]\s*\n?([\s\S]+)$/.exec(text);
  return {
    title: titleMatch?.[1]?.trim() ?? "",
    body: bodyMatch?.[1]?.trim() ?? "",
    tags: tagsMatch?.[1]?.trim() ?? "",
  };
}

function parseJsonResponse<T>(raw: string): T {
  const cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  return JSON.parse(cleaned) as T;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatInlineMarkdown(value: string) {
  return escapeHtml(value)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/__(.+?)__/g, "<strong>$1</strong>");
}

function renderParagraph(lines: string[]) {
  if (lines.length === 0) return "";
  return `<p style="margin: 0 0 18px; color: #2f2a25; font-size: 16px; line-height: 1.9;">${lines
    .map((line) => formatInlineMarkdown(line))
    .join("<br>")}</p>`;
}

function markdownToWeixinHtml(markdown: string) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const html: string[] = [];
  let paragraph: string[] = [];
  let listItems: string[] = [];
  let listType: "ol" | "ul" | null = null;

  function flushParagraph() {
    const rendered = renderParagraph(paragraph);
    if (rendered) html.push(rendered);
    paragraph = [];
  }

  function flushList() {
    if (!listType || listItems.length === 0) return;
    const tag = listType;
    html.push(
      `<${tag} style="margin: 0 0 20px; padding-left: 1.4em; color: #2f2a25; font-size: 16px; line-height: 1.9;">${listItems
        .map((item) => `<li style="margin: 0 0 8px;">${formatInlineMarkdown(item)}</li>`)
        .join("")}</${tag}>`
    );
    listItems = [];
    listType = null;
  }

  lines.forEach((line) => {
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph();
      flushList();
      return;
    }

    const heading = /^(#{1,3})\s+(.+)$/.exec(trimmed);
    if (heading) {
      flushParagraph();
      flushList();
      const level = heading[1].length;
      const content = formatInlineMarkdown(heading[2]);
      if (level === 1) {
        html.push(
          `<h1 style="margin: 0 0 24px; color: #1f1b16; font-size: 24px; line-height: 1.45; font-weight: 800;">${content}</h1>`
        );
      } else {
        html.push(
          `<h2 style="margin: 28px 0 14px; color: #1f1b16; font-size: 19px; line-height: 1.55; font-weight: 800;">${content}</h2>`
        );
      }
      return;
    }

    const ordered = /^\d+[.)、]\s+(.+)$/.exec(trimmed);
    const unordered = /^[-*]\s+(.+)$/.exec(trimmed);
    if (ordered || unordered) {
      flushParagraph();
      const nextType = ordered ? "ol" : "ul";
      if (listType && listType !== nextType) flushList();
      listType = nextType;
      listItems.push((ordered ?? unordered)?.[1] ?? trimmed);
      return;
    }

    flushList();
    paragraph.push(trimmed);
  });

  flushParagraph();
  flushList();

  return `<section style="box-sizing: border-box; max-width: 100%; color: #2f2a25; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;">${html.join(
    ""
  )}</section>`;
}

export default function Home() {
  const [content, setContent] = useState("");
  const [platform, setPlatform] = useState<Platform>("xiaohongshu");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [copiedTitle, setCopiedTitle] = useState(false);
  const [copiedBody, setCopiedBody] = useState(false);
  const [step, setStep] = useState<"input" | "confirm" | "result">("input");
  const [preference, setPreference] = useState("");

  // 小红书专用状态
  const [analysis, setAnalysis] = useState<StyleAnalysis | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<XhsStyle>("经验分享");
  const [styleCheck, setStyleCheck] = useState<StyleCheck | null>(null);

  // 公众号专用状态
  const [weixinAnalysis, setWeixinAnalysis] = useState<WeixinAnalysis | null>(null);
  const [selectedWeixinType, setSelectedWeixinType] = useState<WeixinType>("经验干货");
  const [weixinTypeCheck, setWeixinTypeCheck] = useState<WeixinTypeCheck | null>(null);

  // 碎碎念整理
  const [polishStep, setPolishStep] = useState<PolishStep>("hidden");
  const [polishInput, setPolishInput] = useState("");
  const [polishLoading, setPolishLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [micInitializing, setMicInitializing] = useState(false);
  const [polishClean, setPolishClean] = useState("");
  const [polishEdits, setPolishEdits] = useState<Edit[]>([]);
  const [polishMarkers, setPolishMarkers] = useState<Marker[]>([]);
  const [markerStates, setMarkerStates] = useState<Record<string, "pending" | "confirmed" | "editing" | "edited">>({});
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const isRecordingRef = useRef(false);

  useEffect(() => {
    return () => { recognitionRef.current?.stop(); };
  }, []);

  const inputState = useMemo(() => detectInputState(content, platform), [content, platform]);
  const config = platformConfig[platform];
  const displayResult = result || sampleResult[platform];

  function resetOutput() {
    setResult("");
    setError("");
    setCopied(false);
    setStep("input");
    setAnalysis(null);
    setStyleCheck(null);
    setWeixinAnalysis(null);
    setWeixinTypeCheck(null);
    setPreference("");
  }

  function selectPlatform(nextPlatform: Platform) {
    setPlatform(nextPlatform);
    resetOutput();
  }

  function handleContentChange(nextContent: string) {
    setContent(nextContent);
    if (result || analysis || weixinAnalysis || error || styleCheck || weixinTypeCheck) {
      setResult("");
      setError("");
      setCopied(false);
      setStep("input");
      setAnalysis(null);
      setStyleCheck(null);
      setWeixinAnalysis(null);
      setWeixinTypeCheck(null);
      setPreference("");
    }
  }

  function toggleRecording() {
    if (isRecordingRef.current) {
      isRecordingRef.current = false;
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }
    const SR = ((window as unknown as { SpeechRecognition?: SpeechRecognitionConstructor }).SpeechRecognition
      || (window as unknown as { webkitSpeechRecognition?: SpeechRecognitionConstructor }).webkitSpeechRecognition);
    if (!SR) return;
    const rec = new SR();
    rec.lang = "zh-CN";
    rec.continuous = true;
    rec.interimResults = true;
    rec.onstart = () => { setMicInitializing(false); setIsRecording(true); };
    rec.onresult = (e: SpeechRecognitionResultEvent) => {
      let final = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript;
      }
      if (final) setPolishInput((prev) => (prev ? prev + final : final));
    };
    rec.onend = () => { if (isRecordingRef.current) { try { rec.start(); } catch { } } };
    recognitionRef.current = rec;
    isRecordingRef.current = true;
    setMicInitializing(true);
    rec.start();
  }

  async function handlePolish() {
    if (!polishInput.trim()) return;
    setPolishLoading(true);
    if (isRecordingRef.current) toggleRecording();
    try {
      const res = await fetch("/api/polish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: polishInput }),
      });
      const data = await res.json();
      if (data.result) {
        const { clean, markers } = parseMarkers(data.result);
        const edits = computeDiff(polishInput, clean);
        setPolishClean(clean);
        setPolishEdits(edits);
        setPolishMarkers(markers);
        setPolishStep("reviewing");
      } else if (data.error) {
        alert(data.error);
      }
    } catch {
      alert("整理失败，请重试");
    } finally {
      setPolishLoading(false);
    }
  }

  function handleConfirmPolish() {
    handleContentChange(polishClean);
    setPolishStep("hidden");
    setPolishInput("");
    setPolishClean("");
    setPolishEdits([]);
    setPolishMarkers([]);
    setMarkerStates({});
    setEditValues({});
  }

  function handleMarkerConfirm(key: string) {
    setMarkerStates((prev) => ({ ...prev, [key]: "confirmed" }));
  }

  function handleMarkerStartEdit(key: string, originalContent: string) {
    setEditValues((prev) => ({ ...prev, [key]: originalContent }));
    setMarkerStates((prev) => ({ ...prev, [key]: "editing" }));
  }

  function handleMarkerConfirmEdit(key: string, originalContent: string) {
    const newVal = editValues[key]?.trim();
    if (!newVal || newVal === originalContent) {
      setMarkerStates((prev) => ({ ...prev, [key]: "confirmed" }));
      return;
    }
    const escaped = originalContent.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    setPolishClean((prev) => prev.replace(new RegExp(escaped, "g"), newVal));
    setMarkerStates((prev) => ({ ...prev, [key]: "edited" }));
  }

  async function handleConvert() {
    if (!content.trim()) return;
    setLoading(true);
    setError("");
    setResult("");
    setCopied(false);
    setStyleCheck(null);

    try {
      // 两个平台都先走路由分析
      const res = await fetch("/api/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, platform, task: "route" }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        return;
      }

      if (platform === "xiaohongshu") {
        const parsed = parseJsonResponse<StyleAnalysis>(data.result);
        setAnalysis(parsed);
        setSelectedStyle(parsed.recommended_style);
      } else {
        const parsed = parseJsonResponse<WeixinAnalysis>(data.result);
        setWeixinAnalysis(parsed);
        setSelectedWeixinType(parsed.recommended_type);
      }
      setStep("confirm");
    } catch (err) {
      console.error(err);
      setError("分析失败，请重试");
    } finally {
      setLoading(false);
    }
  }

  async function handleStyleSelect(style: XhsStyle) {
    setSelectedStyle(style);
    setStyleCheck(null);

    if (!analysis || style === analysis.recommended_style) return;

    try {
      const res = await fetch("/api/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, platform, task: "check", selectedStyle: style }),
      });
      const data = await res.json();
      if (!data.error) {
        setStyleCheck(parseJsonResponse<StyleCheck>(data.result));
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleWeixinTypeSelect(type: WeixinType) {
    setSelectedWeixinType(type);
    setWeixinTypeCheck(null);

    if (!weixinAnalysis || type === weixinAnalysis.recommended_type) return;

    try {
      const res = await fetch("/api/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, platform, task: "check", selectedType: type }),
      });
      const data = await res.json();
      if (!data.error) {
        setWeixinTypeCheck(parseJsonResponse<WeixinTypeCheck>(data.result));
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleGenerate(userPreference = preference) {
    if (!content.trim()) return;
    setLoading(true);
    setError("");
    setResult("");
    setCopied(false);

    try {
      const body =
        platform === "xiaohongshu"
          ? {
              content,
              platform,
              task: "generate",
              selectedStyle,
              subDirection: analysis?.sub_direction,
              tone: analysis?.tone,
              emojiDensity: analysis?.emoji_density,
              userPreference,
            }
          : {
              content,
              platform,
              task: "generate",
              selectedType: selectedWeixinType,
              userPreference,
            };

      const res = await fetch("/api/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "生成失败");
        return;
      }
      setStep("result");
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setResult(accumulated);
      }
    } catch (err) {
      console.error(err);
      setError("生成失败，请重试");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopyXhsTitle() {
    const { title } = parseXhsResult(result);
    if (!title) return;
    await navigator.clipboard.writeText(title);
    setCopiedTitle(true);
    setTimeout(() => setCopiedTitle(false), 2000);
  }

  async function handleCopyXhsBody() {
    const { body, tags } = parseXhsResult(result);
    const text = tags ? `${body}\n\n${tags}` : body;
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopiedBody(true);
    setTimeout(() => setCopiedBody(false), 2000);
  }

  async function handleCopy() {
    if (!result) return;
    if (platform === "weixin" && "ClipboardItem" in window) {
      const html = markdownToWeixinHtml(result);
      try {
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/html": new Blob([html], { type: "text/html" }),
            "text/plain": new Blob([result], { type: "text/plain" }),
          }),
        ]);
      } catch {
        await navigator.clipboard.writeText(result);
      }
    } else {
      await navigator.clipboard.writeText(result);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <main className="min-h-screen bg-[#f7f4ee] text-stone-950">
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(115deg,rgba(241,82,66,.12),transparent_28%),linear-gradient(245deg,rgba(23,146,91,.12),transparent_30%)]" />
      <div className="relative mx-auto flex min-h-screen max-w-[1500px] flex-col px-3 py-4 md:px-5 md:py-5">
        <header className="mb-5 flex flex-col justify-between gap-4 border-b border-stone-200/80 pb-5 md:flex-row md:items-end">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">PlatformFit</p>
            <h1 className="max-w-3xl text-3xl font-black tracking-tight text-stone-950 md:text-5xl">
              内容跨平台改写器
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600 md:text-base">
              小红书 ↔ 公众号，把任意草稿改写成适合发布的版本，并说明为什么这样改。
            </p>
          </div>
          <div className="rounded-full border border-stone-200 bg-white/70 px-4 py-2 text-sm font-medium text-stone-600 shadow-sm">
            当前目标：
            <span className={config.accent === "red" ? "text-red-600" : "text-emerald-700"}>{config.name}</span>
          </div>
        </header>

        <div className="grid flex-1 gap-5 md:grid-cols-[minmax(340px,0.9fr)_minmax(420px,1.1fr)]">
          <section className="flex flex-col rounded-[28px] border border-stone-200 bg-white/80 p-5 shadow-[0_20px_80px_rgba(48,36,18,.08)] backdrop-blur md:min-h-[720px]">
            <SectionTitle eyebrow="1" title="发到哪里" />
            <div className="grid grid-cols-2 gap-3">
              {(["xiaohongshu", "weixin"] as Platform[]).map((item) => {
                const selected = platform === item;
                const itemConfig = platformConfig[item];
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => selectPlatform(item)}
                    className={`min-h-[104px] rounded-2xl border p-4 text-left transition ${
                      selected
                        ? itemConfig.accent === "red"
                          ? "border-red-300 bg-red-50 shadow-[0_18px_36px_rgba(239,68,68,.12)]"
                          : "border-emerald-300 bg-emerald-50 shadow-[0_18px_36px_rgba(16,185,129,.12)]"
                        : "border-stone-200 bg-stone-50 hover:border-stone-300 hover:bg-white"
                    }`}
                  >
                    <span
                      className={`text-base font-black ${
                        selected && itemConfig.accent === "red"
                          ? "text-red-600"
                          : selected
                            ? "text-emerald-700"
                            : "text-stone-800"
                      }`}
                    >
                      {itemConfig.name}
                    </span>
                    <span className="mt-2 block text-xs leading-5 text-stone-500">{itemConfig.description}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-5 flex flex-1 flex-col">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-stone-400">Step 2</p>
                  <h2 className="mt-1 text-base font-black text-stone-950">粘贴内容</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setPolishStep(polishStep === "hidden" ? "input" : "hidden")}
                  className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                    polishStep !== "hidden"
                      ? "border-stone-900 bg-stone-950 text-white"
                      : "border-stone-200 bg-white text-stone-600 hover:border-stone-300"
                  }`}
                >
                  🎙 先整理碎碎念
                </button>
              </div>

              {/* 碎碎念：输入阶段 */}
              {polishStep === "input" && (
                <div className="mb-3 rounded-2xl border border-stone-200 bg-stone-50 p-3">
                  <textarea
                    className="min-h-[100px] w-full resize-none rounded-xl border border-stone-200 bg-white p-3 text-sm leading-6 text-stone-800 outline-none transition placeholder:text-stone-400 focus:border-stone-400"
                    placeholder="随便说，不用组织，口语也行。说完点「整理」。"
                    value={polishInput}
                    onChange={(e) => setPolishInput(e.target.value)}
                  />
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={toggleRecording}
                      disabled={micInitializing}
                      className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                        isRecording
                          ? "animate-pulse border-red-300 bg-red-50 text-red-600"
                          : micInitializing
                            ? "border-stone-200 bg-stone-100 text-stone-400"
                            : "border-stone-200 bg-white text-stone-600 hover:border-stone-300"
                      }`}
                    >
                      {isRecording ? "⏹ 停止" : micInitializing ? "初始化中..." : "🎙 说话"}
                    </button>
                    <button
                      type="button"
                      onClick={handlePolish}
                      disabled={polishLoading || !polishInput.trim()}
                      className="ml-auto rounded-full bg-stone-900 px-4 py-1.5 text-xs font-black text-white transition hover:bg-stone-700 disabled:opacity-40"
                    >
                      {polishLoading ? "整理中..." : "整理 →"}
                    </button>
                  </div>
                </div>
              )}

              {/* 碎碎念：审阅阶段 */}
              {polishStep === "reviewing" && (
                <div className="mb-3 rounded-2xl border border-stone-300 bg-stone-50 p-3">
                  {/* 图例 */}
                  <div className="mb-2 flex flex-wrap gap-2 text-xs">
                    <span className="font-black text-stone-600">修改标注</span>
                    <span className="rounded bg-red-100 px-1.5 text-red-600 line-through">删除</span>
                    <span className="rounded bg-emerald-100 px-1.5 text-emerald-700">补充</span>
                    <span className="rounded bg-amber-100 px-1.5 text-amber-800">调整</span>
                    <span className="rounded bg-blue-100 px-1.5 text-blue-700">错字</span>
                  </div>
                  {/* 标注文本 */}
                  <div className="max-h-36 overflow-y-auto rounded-xl border border-stone-200 bg-white p-3 text-sm leading-7">
                    {polishEdits.length > 0 ? renderDiff(polishEdits) : <span className="text-stone-400">无显著修改</span>}
                  </div>
                  {/* 可编辑整理结果 */}
                  <textarea
                    className="mt-2 min-h-[72px] w-full resize-y rounded-xl border border-stone-200 bg-white p-2.5 text-sm leading-6 text-stone-800 outline-none transition focus:border-stone-400"
                    placeholder="整理后的文字（可直接修改）"
                    value={polishClean}
                    onChange={(e) => setPolishClean(e.target.value)}
                  />
                  {/* 待确认项 */}
                  {polishMarkers.length > 0 && (
                    <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
                      <p className="mb-2 text-xs font-black text-amber-800">
                        待确认（{polishMarkers.filter((m) => !markerStates[m.key] || markerStates[m.key] === "editing" || markerStates[m.key] === "pending").length} / {polishMarkers.length}项）
                      </p>
                      <div className="space-y-2">
                        {polishMarkers.map((m) => {
                          const state = markerStates[m.key] ?? "pending";
                          const label = m.type === "疑音" ? "语音偏差" : m.type === "疑义" ? "语义存疑" : "专名确认";
                          const done = state === "confirmed" || state === "edited";
                          return (
                            <div key={m.key} className={`transition-opacity ${done ? "opacity-40" : ""}`}>
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs text-amber-900">
                                  <span className="font-bold">{label}</span>
                                  {" · "}「{state === "edited" ? editValues[m.key] : m.content}」
                                  {done ? (state === "edited" ? " — 已修改 ✓" : " — 已确认 ✓") : " 是你想表达的吗？"}
                                </span>
                                {!done && state !== "editing" && (
                                  <div className="flex shrink-0 gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleMarkerConfirm(m.key)}
                                      className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700 hover:bg-emerald-200"
                                    >
                                      ✓ 正确
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleMarkerStartEdit(m.key, m.content)}
                                      className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-bold text-stone-700 hover:bg-stone-200"
                                    >
                                      ✎ 修改
                                    </button>
                                  </div>
                                )}
                              </div>
                              {state === "editing" && (
                                <div className="mt-1.5 flex gap-2">
                                  <input
                                    type="text"
                                    value={editValues[m.key] ?? m.content}
                                    onChange={(e) => setEditValues((prev) => ({ ...prev, [m.key]: e.target.value }))}
                                    className="flex-1 rounded-lg border border-amber-300 bg-white px-2.5 py-1 text-xs outline-none focus:border-amber-500"
                                    autoFocus
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleMarkerConfirmEdit(m.key, m.content)}
                                    className="rounded-full bg-stone-900 px-3 py-1 text-xs font-black text-white hover:bg-stone-700"
                                  >
                                    确认
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {/* 操作按钮 */}
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => { setPolishStep("input"); setMarkerStates({}); setEditValues({}); }}
                      className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-bold text-stone-600 hover:bg-stone-50"
                    >
                      ← 重新整理
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmPolish}
                      className="ml-auto rounded-full bg-stone-900 px-4 py-1.5 text-xs font-black text-white hover:bg-stone-700"
                    >
                      确认填入 →
                    </button>
                  </div>
                </div>
              )}

              <textarea
                className="min-h-[160px] flex-1 resize-none rounded-2xl border border-stone-200 bg-[#fffdf8] p-4 text-sm leading-6 text-stone-800 outline-none transition placeholder:text-stone-400 focus:border-stone-400 focus:bg-white md:min-h-[220px]"
                placeholder="先粘贴草稿、提纲、文章、口述稿或几句零散想法，再确认表达方向。"
                value={content}
                onChange={(event) => handleContentChange(event.target.value)}
              />
              <div className="mt-2 flex items-center justify-between text-xs text-stone-400">
                <span>{content.length > 0 ? inputState : "导入内容后，再做风格判断和选择。"}</span>
                <span>{content.length} / 3000</span>
              </div>
            </div>

            {!content.trim() && (
              <div className="mt-5 rounded-2xl border border-stone-200 bg-stone-50 p-4">
                <p className="text-sm font-black text-stone-800">下一步：导入内容后再选择</p>
                <p className="mt-2 text-xs leading-5 text-stone-500">
                  先让 AI 看见材料，再推荐或确认风格，避免用户一开始凭空判断。
                </p>
              </div>
            )}

            {/* 小红书：AI 判断 + 用户确认 */}
            {platform === "xiaohongshu" && content.trim() && (
              <>
                <div className="mt-5">
                  <SectionTitle eyebrow="3" title="AI 先判断表达方向" compact />
                  <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
                    <p className="text-sm font-black text-red-700">
                      {analysis
                        ? analysis.recommended_style
                        : "粘贴内容后，先让 AI 判断它适合哪种小红书短文。"}
                    </p>
                    <p className="mt-2 text-xs leading-5 text-stone-600">
                      {analysis
                        ? analysis.user_facing_summary
                        : "用户不用一开始选分类，AI 先给推荐，用户再确认或改选。"}
                    </p>
                  </div>
                </div>

                {analysis && (
                  <div className="mt-5">
                    <SectionTitle eyebrow="4" title="确认或改选风格" compact />
                    <div className="grid gap-2 sm:grid-cols-2">
                      {xhsStyles.map((style) => (
                        <button
                          key={style.value}
                          type="button"
                          onClick={() => handleStyleSelect(style.value)}
                          className={`rounded-2xl border px-4 py-3 text-left transition ${
                            selectedStyle === style.value
                              ? "border-red-300 bg-red-50"
                              : "border-stone-200 bg-stone-50 hover:bg-white"
                          }`}
                        >
                          <span className="block text-sm font-black text-stone-900">{style.label}</span>
                          <span className="mt-1 block text-xs text-stone-500">{style.desc}</span>
                        </button>
                      ))}
                    </div>
                    {styleCheck?.warning && styleCheck.mismatch_level !== "none" && (
                      <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                        <p>{styleCheck.warning}</p>
                        {styleCheck.rewrite_impact && (
                          <p className="mt-1 text-xs text-amber-700">{styleCheck.rewrite_impact}</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* 公众号：AI 判断 + 用户确认 */}
            {platform === "weixin" && content.trim() && (
              <>
                <div className="mt-5">
                  <SectionTitle eyebrow="3" title="AI 先判断内容类型" compact />
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                    <p className="text-sm font-black text-emerald-700">
                      {weixinAnalysis
                        ? weixinAnalysis.recommended_type
                        : "粘贴内容后，先让 AI 判断适合哪种公众号写法。"}
                    </p>
                    <p className="mt-2 text-xs leading-5 text-stone-600">
                      {weixinAnalysis
                        ? weixinAnalysis.user_facing_summary
                        : "AI 先分析，用户再确认，减少判断成本。"}
                    </p>
                  </div>
                </div>

                {weixinAnalysis && (
                  <div className="mt-5">
                    <SectionTitle eyebrow="4" title="确认或改选类型" compact />
                    <div className="grid gap-2 sm:grid-cols-2">
                      {weixinTypes.map((type) => (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => handleWeixinTypeSelect(type.value)}
                          className={`rounded-2xl border px-4 py-3 text-left transition ${
                            selectedWeixinType === type.value
                              ? "border-emerald-300 bg-emerald-50"
                              : "border-stone-200 bg-stone-50 hover:bg-white"
                          }`}
                        >
                          <span className="block text-sm font-black text-stone-900">{type.label}</span>
                          <span className="mt-1 block text-xs text-stone-500">{type.desc}</span>
                        </button>
                      ))}
                    </div>
                    {weixinTypeCheck?.warning && weixinTypeCheck.mismatch_level !== "none" && (
                      <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                        <p>{weixinTypeCheck.warning}</p>
                        {weixinTypeCheck.rewrite_impact && (
                          <p className="mt-1 text-xs text-amber-700">{weixinTypeCheck.rewrite_impact}</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            <button
              onClick={step === "confirm" ? () => handleGenerate("") : handleConvert}
              disabled={loading || !content.trim()}
              className={`mt-5 w-full rounded-2xl px-4 py-4 text-sm font-black text-white shadow-lg transition disabled:cursor-not-allowed disabled:opacity-45 ${
                config.accent === "red"
                  ? "bg-red-500 shadow-red-200 hover:bg-red-600"
                  : "bg-emerald-600 shadow-emerald-200 hover:bg-emerald-700"
              }`}
            >
              {loading
                ? step === "confirm"
                  ? "正在生成..."
                  : "正在分析..."
                : step === "confirm"
                  ? "按这个方向生成"
                  : config.targetLabel}
            </button>
          </section>

          <section className="flex flex-col rounded-[28px] border border-stone-200 bg-[#11100e] p-5 text-white shadow-[0_28px_90px_rgba(17,16,14,.22)] md:min-h-[720px]">
            <div className="mb-5 flex flex-col justify-between gap-3 border-b border-white/10 pb-5 sm:flex-row sm:items-center">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">Preview</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight">输出结果</h2>
              </div>
              {result && platform === "weixin" && (
                <button
                  onClick={handleCopy}
                  className="rounded-full bg-white px-4 py-2 text-xs font-black text-stone-950 transition hover:bg-stone-200"
                >
                  {copied ? "已复制" : "复制公众号版本"}
                </button>
              )}
              {result && platform === "xiaohongshu" && (
                <div className="flex gap-2">
                  <button
                    onClick={handleCopyXhsTitle}
                    className="rounded-full bg-white px-4 py-2 text-xs font-black text-stone-950 transition hover:bg-stone-200"
                  >
                    {copiedTitle ? "已复制" : "复制标题"}
                  </button>
                  <button
                    onClick={handleCopyXhsBody}
                    className="rounded-full bg-white/20 px-4 py-2 text-xs font-black text-white transition hover:bg-white/30"
                  >
                    {copiedBody ? "已复制" : "复制正文+标签"}
                  </button>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <CompactTag label="目标" value={config.name} tone={config.accent} />
              {platform === "weixin" ? (
                <CompactTag label="类型" value={weixinAnalysis ? selectedWeixinType : "待分析"} />
              ) : (
                <>
                  <CompactTag label="分类" value={selectedStyle} />
                  <CompactTag label="语气" value={analysis?.tone || "待分析"} />
                </>
              )}
            </div>

            <div className="mt-4 rounded-3xl border border-white/10 bg-white/[0.06] p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-stone-950">原文识别</span>
                <span className="text-sm text-stone-300">{inputState}</span>
              </div>
              {platform === "xiaohongshu" && analysis && (
                <div className="mt-3 rounded-2xl bg-black/20 p-3">
                  <p className="text-sm font-black text-white">
                    AI 推荐：{analysis.recommended_style}｜{analysis.sub_direction}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-stone-300">{analysis.reason}</p>
                  <p className="mt-2 text-xs text-stone-400">
                    emoji 密度：{analysis.emoji_density} · 置信度：
                    {Math.round((analysis.confidence || 0) * 100)}%
                  </p>
                </div>
              )}
              {platform === "weixin" && weixinAnalysis && (
                <div className="mt-3 rounded-2xl bg-black/20 p-3">
                  <p className="text-sm font-black text-white">
                    AI 推荐：{weixinAnalysis.recommended_type}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-stone-300">{weixinAnalysis.reason}</p>
                  <p className="mt-2 text-xs text-stone-400">
                    置信度：{Math.round((weixinAnalysis.confidence || 0) * 100)}%
                  </p>
                </div>
              )}
            </div>

            <div className="mt-4 flex min-h-0 flex-1 flex-col rounded-3xl border border-white/10 bg-[#fbfaf6] text-stone-950">
              <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">Draft</p>
                  <h3 className="mt-1 text-lg font-black">
                    {result
                      ? `${config.name}改写稿`
                      : analysis || weixinAnalysis
                        ? "确认方向后生成真实结果"
                        : "示例改写稿"}
                  </h3>
                </div>
                {!result && !loading && !analysis && !weixinAnalysis && (
                  <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-bold text-stone-500">示例预览</span>
                )}
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-5">
                {error && <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">{error}</p>}
                {loading && !result && (
                  <div className="space-y-3">
                    <div className="h-4 w-2/3 animate-pulse rounded-full bg-stone-200" />
                    <div className="h-4 w-full animate-pulse rounded-full bg-stone-200" />
                    <div className="h-4 w-5/6 animate-pulse rounded-full bg-stone-200" />
                    <p className="pt-3 text-sm text-stone-500">
                      {step !== "confirm" ? "正在判断最适合的表达方向..." : "正在按目标平台改写..."}
                    </p>
                  </div>
                )}
                {!loading && !error && (analysis || weixinAnalysis) && !result && (
                  <div
                    className={`rounded-2xl border p-4 ${
                      platform === "xiaohongshu"
                        ? "border-red-100 bg-red-50"
                        : "border-emerald-100 bg-emerald-50"
                    }`}
                  >
                    <p
                      className={`text-sm font-black ${
                        platform === "xiaohongshu" ? "text-red-700" : "text-emerald-700"
                      }`}
                    >
                      {platform === "xiaohongshu"
                        ? analysis?.user_facing_summary
                        : weixinAnalysis?.user_facing_summary}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-stone-700">
                      你可以直接生成，也可以在左侧改选成其他风格。AI 只负责降低判断成本，用户最终拍板。
                    </p>
                  </div>
                )}
                {!loading && !error && !analysis && !weixinAnalysis && (
                  platform === "weixin" ? (
                    <div
                      className="text-stone-500"
                      dangerouslySetInnerHTML={{ __html: markdownToWeixinHtml(displayResult) }}
                    />
                  ) : (
                    <pre className="whitespace-pre-wrap font-sans text-sm leading-7 text-stone-500">
                      {displayResult}
                    </pre>
                  )
                )}
                {!error && result && (
                  platform === "weixin" ? (
                    <div
                      className="text-stone-950"
                      dangerouslySetInnerHTML={{ __html: markdownToWeixinHtml(result) }}
                    />
                  ) : (
                    <pre className="whitespace-pre-wrap font-sans text-sm leading-7 text-stone-950">
                      {result}
                    </pre>
                  )
                )}
              </div>
            </div>

            <div className="mt-4 rounded-3xl border border-white/10 bg-white/[0.06] p-4">
              <p className="text-sm font-black text-white">改写策略</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <ReasonPill label="保留" text="核心观点" />
                <ReasonPill label="强化" text={platform === "xiaohongshu" ? "钩子和收藏点" : "结构和论证"} />
                <ReasonPill label="删掉" text={platform === "xiaohongshu" ? "长铺垫" : "标签感"} />
              </div>
              {result && (
                <div className="mt-4 border-t border-white/10 pt-4">
                  <p className="text-sm font-black text-white">不满意就直接说</p>
                  <textarea
                    value={preference}
                    onChange={(event) => setPreference(event.target.value)}
                    className="mt-3 min-h-[82px] w-full resize-none rounded-2xl border border-white/10 bg-black/20 p-3 text-sm text-white outline-none placeholder:text-stone-500 focus:border-white/30"
                    placeholder="比如：不要 emoji、语气更克制、开头更有冲击力..."
                  />
                  <div className="mt-3 flex flex-wrap gap-2">
                    {platform === "xiaohongshu" ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            const next = "少用 emoji，语气更自然克制，不要太像营销号";
                            setPreference(next);
                            handleGenerate(next);
                          }}
                          className="rounded-full bg-white/10 px-3 py-2 text-xs font-bold text-stone-200 hover:bg-white/15"
                        >
                          更自然克制
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const next = "表达更口语、更有小红书轻吐槽感，可以适度增加 emoji";
                            setPreference(next);
                            handleGenerate(next);
                          }}
                          className="rounded-full bg-white/10 px-3 py-2 text-xs font-bold text-stone-200 hover:bg-white/15"
                        >
                          更有吐槽感
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            const next = "语气更克制、专业，减少情绪化表达";
                            setPreference(next);
                            handleGenerate(next);
                          }}
                          className="rounded-full bg-white/10 px-3 py-2 text-xs font-bold text-stone-200 hover:bg-white/15"
                        >
                          更克制专业
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const next = "开头更有冲击力，第一句话更抓人";
                            setPreference(next);
                            handleGenerate(next);
                          }}
                          className="rounded-full bg-white/10 px-3 py-2 text-xs font-bold text-stone-200 hover:bg-white/15"
                        >
                          开头更抓人
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => handleGenerate()}
                      disabled={!preference.trim() || loading}
                      className="ml-auto rounded-full bg-white px-4 py-2 text-xs font-black text-stone-950 transition hover:bg-stone-200 disabled:opacity-40"
                    >
                      按意见再改一版
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function SectionTitle({ eyebrow, title, compact = false }: { eyebrow: string; title: string; compact?: boolean }) {
  return (
    <div className={compact ? "mb-3" : "mb-4"}>
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-stone-400">Step {eyebrow}</p>
      <h2 className="mt-1 text-base font-black text-stone-950">{title}</h2>
    </div>
  );
}

function CompactTag({ label, value, tone }: { label: string; value: string; tone?: "red" | "green" }) {
  return (
    <div className="rounded-full border border-white/10 bg-white/[0.07] px-3 py-2 text-sm">
      <span className="text-stone-400">{label}</span>
      <span
        className={`ml-2 font-black ${
          tone === "red" ? "text-red-300" : tone === "green" ? "text-emerald-300" : "text-white"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function ReasonPill({ label, text }: { label: string; text: string }) {
  return (
    <div className="rounded-2xl bg-black/20 p-3">
      <p className="text-xs font-black text-stone-300">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white">{text}</p>
    </div>
  );
}
