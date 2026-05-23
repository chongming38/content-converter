"use client";

import { useMemo, useState } from "react";

type Platform = "weixin" | "xiaohongshu";
type AccountType = "life" | "emotion" | "career" | "growth" | "review" | "opinion";
type XhsStyle = "干货分享" | "经验分享" | "个人观点" | "情绪抒发" | "生活记录";

type StyleOption = {
  id: string;
  name: string;
  description: string;
};

type AccountOption = {
  id: AccountType;
  name: string;
  hint: string;
  styles: StyleOption[];
};

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
    targetLabel: "改成公众号文章",
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

const accountOptions: Record<"weixin", AccountOption[]> = {
  weixin: [
    {
      id: "opinion",
      name: "深度观点",
      hint: "观察 / 判断 / 评论",
      styles: [
        { id: "argument", name: "观点论述", description: "先提出判断，再用逻辑和案例展开。" },
        { id: "analysis", name: "深度分析", description: "适合更正式、更完整的长文章结构。" },
        { id: "sharp", name: "克制犀利", description: "有立场但不吵闹，适合建立专业感。" },
      ],
    },
    {
      id: "career",
      name: "职场经验",
      hint: "方法 / 复盘 / 成长",
      styles: [
        { id: "method", name: "方法论拆解", description: "把经验整理成框架、步骤和可执行建议。" },
        { id: "review", name: "经验复盘", description: "从真实经历出发，讲问题、选择和结果。" },
        { id: "case", name: "案例分析", description: "用一个案例展开，最后提炼结论。" },
      ],
    },
    {
      id: "growth",
      name: "个人成长",
      hint: "认知 / 学习 / 表达",
      styles: [
        { id: "warm", name: "温和陪伴", description: "保留温度，降低说教感。" },
        { id: "system", name: "系统表达", description: "把零散观点组织成完整文章。" },
        { id: "essay", name: "叙事随笔", description: "更有个人气质，适合建立长期信任。" },
      ],
    },
  ],
};

const xhsStyles: Array<{ value: XhsStyle; label: string; desc: string }> = [
  { value: "干货分享", label: "干货分享", desc: "方法、步骤、技巧" },
  { value: "经验分享", label: "经验分享", desc: "经历、踩坑、复盘" },
  { value: "个人观点", label: "个人观点", desc: "看法、判断、立场" },
  { value: "情绪抒发", label: "情绪抒发", desc: "心情、感受、内心独白" },
  { value: "生活记录", label: "生活记录", desc: "日常片段、状态记录" },
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

function parseJsonResponse<T>(raw: string): T {
  const cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  return JSON.parse(cleaned) as T;
}

export default function Home() {
  const [content, setContent] = useState("");
  const [platform, setPlatform] = useState<Platform>("xiaohongshu");
  const [accountType, setAccountType] = useState<AccountType>("opinion");
  const [styleId, setStyleId] = useState("argument");
  const [customStyle, setCustomStyle] = useState("");
  const [showCustomStyle, setShowCustomStyle] = useState(false);
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [step, setStep] = useState<"input" | "confirm" | "result">("input");
  const [analysis, setAnalysis] = useState<StyleAnalysis | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<XhsStyle>("经验分享");
  const [styleCheck, setStyleCheck] = useState<StyleCheck | null>(null);
  const [preference, setPreference] = useState("");

  const accounts = accountOptions.weixin;
  const activeAccount = accounts.find((item) => item.id === accountType) ?? accounts[0];
  const activeStyle = activeAccount.styles.find((item) => item.id === styleId) ?? activeAccount.styles[0];
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
    setPreference("");
  }

  function selectPlatform(nextPlatform: Platform) {
    setPlatform(nextPlatform);
    resetOutput();
  }

  function selectAccount(nextAccount: AccountOption) {
    setAccountType(nextAccount.id);
    setStyleId(nextAccount.styles[0].id);
  }

  async function handleConvert() {
    if (!content.trim()) return;
    setLoading(true);
    setError("");
    setResult("");
    setCopied(false);
    setStyleCheck(null);

    try {
      if (platform === "xiaohongshu") {
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

        const parsed = parseJsonResponse<StyleAnalysis>(data.result);
        setAnalysis(parsed);
        setSelectedStyle(parsed.recommended_style);
        setStep("confirm");
        return;
      }

      const res = await fetch("/api/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          platform,
          accountType: activeAccount.name,
          style: activeStyle.name,
          customStyle,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setResult(data.result);
        setStep("result");
      }
    } catch (err) {
      console.error(err);
      setError("转换失败，请重试");
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
        body: JSON.stringify({
          content,
          platform,
          task: "check",
          selectedStyle: style,
        }),
      });
      const data = await res.json();
      if (!data.error) {
        setStyleCheck(parseJsonResponse<StyleCheck>(data.result));
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
      const res = await fetch("/api/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          platform,
          task: "generate",
          selectedStyle,
          subDirection: analysis?.sub_direction,
          tone: analysis?.tone,
          emojiDensity: analysis?.emoji_density,
          userPreference,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setResult(data.result);
        setStep("result");
      }
    } catch (err) {
      console.error(err);
      setError("生成失败，请重试");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!result) return;
    await navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <main className="min-h-screen bg-[#f7f4ee] text-stone-950">
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(115deg,rgba(241,82,66,.12),transparent_28%),linear-gradient(245deg,rgba(23,146,91,.12),transparent_30%)]" />
      <div className="relative mx-auto flex min-h-screen max-w-[1500px] flex-col px-5 py-5">
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
          <section className="flex min-h-[720px] flex-col rounded-[28px] border border-stone-200 bg-white/80 p-5 shadow-[0_20px_80px_rgba(48,36,18,.08)] backdrop-blur">
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

            {platform === "weixin" ? (
              <>
                <div className="mt-5">
                  <SectionTitle eyebrow="2" title="账号类型" compact />
                  <div className="grid gap-2">
                    {accounts.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => selectAccount(item)}
                        className={`rounded-2xl border px-4 py-3 text-left transition ${
                          accountType === item.id
                            ? "border-stone-900 bg-stone-950 text-white"
                            : "border-stone-200 bg-white hover:border-stone-300"
                        }`}
                      >
                        <span className="block text-sm font-bold">{item.name}</span>
                        <span
                          className={`mt-1 block text-xs ${
                            accountType === item.id ? "text-stone-300" : "text-stone-500"
                          }`}
                        >
                          {item.hint}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-5">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <SectionTitle eyebrow="3" title="写作风格" compact />
                    <button
                      type="button"
                      onClick={() => setShowCustomStyle((value) => !value)}
                      className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-bold text-stone-600 transition hover:border-stone-300 hover:bg-stone-50"
                    >
                      自定义
                    </button>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {activeAccount.styles.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setStyleId(item.id)}
                        className={`min-h-[104px] rounded-2xl border p-3 text-left transition ${
                          styleId === item.id
                            ? "border-emerald-300 bg-emerald-50"
                            : "border-stone-200 bg-stone-50 hover:bg-white"
                        }`}
                      >
                        <span className="block text-sm font-black text-stone-900">{item.name}</span>
                        <span className="mt-2 block text-xs leading-5 text-stone-500">{item.description}</span>
                      </button>
                    ))}
                  </div>
                  {showCustomStyle && (
                    <textarea
                      className="mt-3 min-h-[82px] w-full resize-none rounded-2xl border border-stone-200 bg-white p-3 text-sm text-stone-800 outline-none transition placeholder:text-stone-400 focus:border-stone-400"
                      placeholder="补充你的不确定要求，比如：不要太营销、保留一点个人吐槽、更正式..."
                      value={customStyle}
                      onChange={(event) => setCustomStyle(event.target.value)}
                    />
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="mt-5">
                  <SectionTitle eyebrow="2" title="AI 先判断表达方向" compact />
                  <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
                    <p className="text-sm font-black text-red-700">
                      {analysis
                        ? `${analysis.recommended_style}｜${analysis.sub_direction}｜${analysis.tone}`
                        : "粘贴内容后，先让 AI 判断它适合哪种小红书短文。"}
                    </p>
                    <p className="mt-2 text-xs leading-5 text-stone-600">
                      {analysis
                        ? analysis.user_facing_summary
                        : "用户不用一开始选分类，AI 先给推荐，用户再确认或改选。"}
                    </p>
                  </div>
                </div>

                <div className="mt-5">
                  <SectionTitle eyebrow="3" title="确认或改选风格" compact />
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
              </>
            )}

            <div className="mt-5 flex flex-1 flex-col">
              <SectionTitle eyebrow="4" title="粘贴内容" compact />
              <textarea
                className="min-h-[220px] flex-1 resize-none rounded-2xl border border-stone-200 bg-[#fffdf8] p-4 text-sm leading-6 text-stone-800 outline-none transition placeholder:text-stone-400 focus:border-stone-400 focus:bg-white"
                placeholder="粘贴已有的小红书文案、公众号文章、草稿或碎片想法..."
                value={content}
                onChange={(event) => setContent(event.target.value)}
              />
              <div className="mt-2 flex items-center justify-between text-xs text-stone-400">
                <span>{content.length > 0 ? inputState : config.sourceGuess}</span>
                <span>{content.length} / 3000</span>
              </div>
            </div>

            <button
              onClick={platform === "xiaohongshu" && step === "confirm" ? () => handleGenerate("") : handleConvert}
              disabled={loading || !content.trim()}
              className={`mt-5 w-full rounded-2xl px-4 py-4 text-sm font-black text-white shadow-lg transition disabled:cursor-not-allowed disabled:opacity-45 ${
                config.accent === "red"
                  ? "bg-red-500 shadow-red-200 hover:bg-red-600"
                  : "bg-emerald-600 shadow-emerald-200 hover:bg-emerald-700"
              }`}
            >
              {loading
                ? platform === "xiaohongshu"
                  ? step === "confirm"
                    ? "正在生成..."
                    : "正在分析..."
                  : "正在转换..."
                : platform === "xiaohongshu" && step === "confirm"
                  ? "按这个方向生成"
                  : config.targetLabel}
            </button>
          </section>

          <section className="flex min-h-[720px] flex-col rounded-[28px] border border-stone-200 bg-[#11100e] p-5 text-white shadow-[0_28px_90px_rgba(17,16,14,.22)]">
            <div className="mb-5 flex flex-col justify-between gap-3 border-b border-white/10 pb-5 sm:flex-row sm:items-center">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">Preview</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight">输出结果</h2>
              </div>
              {result && (
                <button
                  onClick={handleCopy}
                  className="rounded-full bg-white px-4 py-2 text-xs font-black text-stone-950 transition hover:bg-stone-200"
                >
                  {copied ? "已复制" : platform === "weixin" ? "复制公众号版本" : "复制小红书版本"}
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <CompactTag label="目标" value={config.name} tone={config.accent} />
              {platform === "weixin" ? (
                <>
                  <CompactTag label="账号" value={activeAccount.name} />
                  <CompactTag label="风格" value={activeStyle.name} />
                </>
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
            </div>

            <div className="mt-4 flex min-h-0 flex-1 flex-col rounded-3xl border border-white/10 bg-[#fbfaf6] text-stone-950">
              <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">Draft</p>
                  <h3 className="mt-1 text-lg font-black">
                    {result ? `${config.name}改写稿` : analysis ? "确认方向后生成真实结果" : "示例改写稿"}
                  </h3>
                </div>
                {!result && !loading && !analysis && (
                  <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-bold text-stone-500">示例预览</span>
                )}
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-5">
                {error && <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">{error}</p>}
                {loading && (
                  <div className="space-y-3">
                    <div className="h-4 w-2/3 animate-pulse rounded-full bg-stone-200" />
                    <div className="h-4 w-full animate-pulse rounded-full bg-stone-200" />
                    <div className="h-4 w-5/6 animate-pulse rounded-full bg-stone-200" />
                    <p className="pt-3 text-sm text-stone-500">
                      {platform === "xiaohongshu" && step !== "confirm"
                        ? "正在判断最适合的小红书表达方向..."
                        : "正在按目标平台改写..."}
                    </p>
                  </div>
                )}
                {!loading && !error && analysis && !result && platform === "xiaohongshu" && (
                  <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
                    <p className="text-sm font-black text-red-700">{analysis.user_facing_summary}</p>
                    <p className="mt-2 text-sm leading-6 text-stone-700">
                      你可以直接生成，也可以在左侧改选成其他风格。用户最终拍板，AI 只负责降低判断成本。
                    </p>
                  </div>
                )}
                {!loading && !error && (!analysis || result || platform === "weixin") && (
                  <pre className={`whitespace-pre-wrap font-sans text-sm leading-7 ${result ? "text-stone-950" : "text-stone-500"}`}>
                    {displayResult}
                  </pre>
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
              {platform === "xiaohongshu" && result && (
                <div className="mt-4 border-t border-white/10 pt-4">
                  <p className="text-sm font-black text-white">不满意就直接说</p>
                  <textarea
                    value={preference}
                    onChange={(event) => setPreference(event.target.value)}
                    className="mt-3 min-h-[82px] w-full resize-none rounded-2xl border border-white/10 bg-black/20 p-3 text-sm text-white outline-none placeholder:text-stone-500 focus:border-white/30"
                    placeholder="比如：不要 emoji、标题更直接、语气更克制、不要像营销号..."
                  />
                  <div className="mt-3 flex flex-wrap gap-2">
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
              {platform === "weixin" && customStyle && (
                <p className="mt-3 text-sm leading-6 text-stone-300">已加入自定义要求：{customStyle}</p>
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
