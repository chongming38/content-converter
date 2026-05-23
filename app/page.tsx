"use client";

import { useMemo, useState } from "react";

type Platform = "weixin" | "xiaohongshu";
type AccountType = "life" | "emotion" | "career" | "growth" | "review" | "opinion";

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

const platformConfig = {
  xiaohongshu: {
    name: "小红书",
    shortName: "小红书",
    accent: "red",
    description: "适合生活化表达、情绪共鸣、经验分享、种草和轻观点。",
    targetLabel: "改成小红书笔记",
    sourceGuess: "更适合从公众号长文、碎片想法或偏正式内容转入。",
  },
  weixin: {
    name: "微信公众号",
    shortName: "公众号",
    accent: "green",
    description: "适合完整观点、深度分析、品牌表达和系统化文章。",
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

const accountOptions: Record<Platform, AccountOption[]> = {
  xiaohongshu: [
    {
      id: "life",
      name: "生活记录",
      hint: "日常、旅行、消费体验、生活方式",
      styles: [
        { id: "diary", name: "真实碎碎念", description: "像朋友聊天，有场景、有细节、有情绪转折。" },
        { id: "list", name: "收藏清单", description: "用分点和步骤制造收藏价值。" },
        { id: "contrast", name: "反差吐槽", description: "先抛痛点，再给反差观点，适合评论互动。" },
      ],
    },
    {
      id: "emotion",
      name: "情绪疗愈",
      hint: "自我觉察、关系、低谷、内耗",
      styles: [
        { id: "soft", name: "温柔陪伴", description: "先接住情绪，再给低压力建议。" },
        { id: "wake", name: "反内耗", description: "更直接有力量，帮读者从纠结里出来。" },
        { id: "story", name: "故事共鸣", description: "用一个具体经历带出情绪和结论。" },
      ],
    },
    {
      id: "review",
      name: "种草测评",
      hint: "好物、工具、课程、服务体验",
      styles: [
        { id: "seed", name: "种草安利", description: "强调使用场景、真实感受和适合人群。" },
        { id: "compare", name: "对比测评", description: "先给结论，再讲优缺点和选择建议。" },
        { id: "guide", name: "新手攻略", description: "降低门槛，适合快速收藏照做。" },
      ],
    },
  ],
  weixin: [
    {
      id: "opinion",
      name: "深度观点",
      hint: "社会观察、个人判断、热点评论",
      styles: [
        { id: "argument", name: "观点论述", description: "先提出判断，再用逻辑和案例展开。" },
        { id: "analysis", name: "深度分析", description: "适合更正式、更完整的长文章结构。" },
        { id: "sharp", name: "克制犀利", description: "有立场但不吵闹，适合建立专业感。" },
      ],
    },
    {
      id: "career",
      name: "职场经验",
      hint: "工作方法、复盘、团队协作、成长",
      styles: [
        { id: "method", name: "方法论拆解", description: "把经验整理成框架、步骤和可执行建议。" },
        { id: "review", name: "经验复盘", description: "从真实经历出发，讲问题、选择和结果。" },
        { id: "case", name: "案例分析", description: "用一个案例展开，最后提炼结论。" },
      ],
    },
    {
      id: "growth",
      name: "个人成长",
      hint: "认知、学习、表达、长期主义",
      styles: [
        { id: "warm", name: "温和陪伴", description: "保留温度，降低说教感。" },
        { id: "system", name: "系统表达", description: "把零散观点组织成完整文章。" },
        { id: "essay", name: "叙事随笔", description: "更有个人气质，适合建立长期信任。" },
      ],
    },
  ],
};

const sampleResult = {
  xiaohongshu:
    "标题：别再把公众号原文直接搬到小红书了\n\n很多人做内容复用，最容易犯的错就是：\n把一篇完整文章压缩一下，就当成小红书笔记。\n\n但小红书不是短版公众号。\n\n它更需要一个能立刻让人停下来的开头，一个足够具体的场景，还有读完马上能收藏的结论。\n\n所以这次改写会做三件事：\n1. 把长铺垫改成痛点开头\n2. 把完整论证拆成短段落\n3. 把结尾改成互动问题\n\n同一份内容，换个平台，就要换一种说话方式。\n\n#内容运营 #小红书写作 #公众号改写 #自媒体",
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
    return platform === "xiaohongshu" ? "像公众号长文，适合压缩为小红书笔记" : "像完整文章，可继续打磨公众号结构";
  }
  return "像半成品内容，适合按目标平台重组";
}

export default function Home() {
  const [content, setContent] = useState("");
  const [platform, setPlatform] = useState<Platform>("xiaohongshu");
  const [accountType, setAccountType] = useState<AccountType>("life");
  const [styleId, setStyleId] = useState("diary");
  const [customStyle, setCustomStyle] = useState("");
  const [showCustomStyle, setShowCustomStyle] = useState(false);
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const accounts = accountOptions[platform];
  const activeAccount = accounts.find((item) => item.id === accountType) ?? accounts[0];
  const activeStyle = activeAccount.styles.find((item) => item.id === styleId) ?? activeAccount.styles[0];
  const inputState = useMemo(() => detectInputState(content, platform), [content, platform]);
  const config = platformConfig[platform];
  const displayResult = result || sampleResult[platform];

  function selectPlatform(nextPlatform: Platform) {
    const nextAccount = accountOptions[nextPlatform][0];
    setPlatform(nextPlatform);
    setAccountType(nextAccount.id);
    setStyleId(nextAccount.styles[0].id);
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

    try {
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
      }
    } catch {
      setError("网络错误，请重试");
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
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
              PlatformFit Content Studio
            </p>
            <h1 className="max-w-3xl text-3xl font-black tracking-tight text-stone-950 md:text-4xl">
              先选发布平台，再把内容改成它该有的样子
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
              面向小红书和公众号的双向内容改写。先确定目标平台，再用账号类型、写作风格和自定义偏好减少误判。
            </p>
          </div>
          <div className="rounded-full border border-stone-200 bg-white/70 px-4 py-2 text-sm font-medium text-stone-600 shadow-sm">
            当前目标：
            <span className={config.accent === "red" ? "text-red-600" : "text-emerald-700"}>{config.name}</span>
          </div>
        </header>

        <div className="grid flex-1 gap-5 md:grid-cols-[minmax(340px,0.9fr)_minmax(420px,1.1fr)]">
          <section className="flex min-h-[720px] flex-col rounded-[28px] border border-stone-200 bg-white/80 p-5 shadow-[0_20px_80px_rgba(48,36,18,.08)] backdrop-blur">
            <SectionTitle eyebrow="Step 1" title="选择你要发布的平台" />
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

            <div className="mt-5">
              <SectionTitle eyebrow="Step 2" title={`${config.shortName}账号更像哪一类`} compact />
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
                    <span className={`mt-1 block text-xs ${accountType === item.id ? "text-stone-300" : "text-stone-500"}`}>
                      {item.hint}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <SectionTitle eyebrow="Step 3" title="选择写作风格" compact />
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
                        ? config.accent === "red"
                          ? "border-red-300 bg-red-50"
                          : "border-emerald-300 bg-emerald-50"
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
                  placeholder="补充你的不确定要求，比如：不要太营销、保留一点个人吐槽、语气更像大学生..."
                  value={customStyle}
                  onChange={(event) => setCustomStyle(event.target.value)}
                />
              )}
            </div>

            <div className="mt-5 flex flex-1 flex-col">
              <SectionTitle eyebrow="Step 4" title="粘贴原始内容" compact />
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
              onClick={handleConvert}
              disabled={loading || !content.trim()}
              className={`mt-5 w-full rounded-2xl px-4 py-4 text-sm font-black text-white shadow-lg transition disabled:cursor-not-allowed disabled:opacity-45 ${
                config.accent === "red"
                  ? "bg-red-500 shadow-red-200 hover:bg-red-600"
                  : "bg-emerald-600 shadow-emerald-200 hover:bg-emerald-700"
              }`}
            >
              {loading ? "正在转换..." : config.targetLabel}
            </button>
          </section>

          <section className="flex min-h-[720px] flex-col rounded-[28px] border border-stone-200 bg-[#11100e] p-5 text-white shadow-[0_28px_90px_rgba(17,16,14,.22)]">
            <div className="mb-5 flex flex-col justify-between gap-3 border-b border-white/10 pb-5 sm:flex-row sm:items-center">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">Conversion Preview</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight">转换预览</h2>
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

            <div className="grid gap-3 md:grid-cols-3">
              <InsightCard title="目标平台" value={config.name} detail={config.description} tone={config.accent} />
              <InsightCard title="账号画像" value={activeAccount.name} detail={activeAccount.hint} />
              <InsightCard title="写作风格" value={activeStyle.name} detail={customStyle || activeStyle.description} />
            </div>

            <div className="mt-4 rounded-3xl border border-white/10 bg-white/[0.06] p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-stone-950">原文识别</span>
                <span className="text-sm text-stone-300">{inputState}</span>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <ReasonPill label="保留" text="核心观点和真实语气" />
                <ReasonPill label="重组" text={platform === "xiaohongshu" ? "钩子、短段落、收藏点" : "标题、论证、段落层次"} />
                <ReasonPill label="避免" text={platform === "xiaohongshu" ? "公众号式长铺垫" : "过度口语和标签感"} />
              </div>
            </div>

            <div className="mt-4 flex min-h-0 flex-1 flex-col rounded-3xl border border-white/10 bg-[#fbfaf6] text-stone-950">
              <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">Result Draft</p>
                  <h3 className="mt-1 text-lg font-black">{result ? `${config.name}改写结果` : "生成后会替换为真实结果"}</h3>
                </div>
                {!result && !loading && (
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
                    <p className="pt-3 text-sm text-stone-500">正在按你的账号画像和目标平台改写...</p>
                  </div>
                )}
                {!loading && !error && (
                  <pre className={`whitespace-pre-wrap font-sans text-sm leading-7 ${result ? "text-stone-950" : "text-stone-500"}`}>{displayResult}</pre>
                )}
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <StrategyCard
                title="为什么这样改"
                text={
                  platform === "xiaohongshu"
                    ? "小红书要先建立“和我有关”的感觉，所以会压缩铺垫，强化场景、情绪和可收藏的信息密度。"
                    : "公众号读者愿意读更完整的逻辑，所以会补足背景、段落推进和观点支撑。"
                }
              />
              <StrategyCard
                title="可继续微调"
                text={customStyle ? `已加入你的要求：${customStyle}` : "可以点左侧“自定义”，补充不要太营销、保留吐槽、更正式等细节。"}
              />
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
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-stone-400">{eyebrow}</p>
      <h2 className="mt-1 text-base font-black text-stone-950">{title}</h2>
    </div>
  );
}

function InsightCard({
  title,
  value,
  detail,
  tone,
}: {
  title: string;
  value: string;
  detail: string;
  tone?: "red" | "green";
}) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.07] p-4">
      <p className="text-xs font-semibold text-stone-400">{title}</p>
      <p
        className={`mt-2 text-base font-black ${
          tone === "red" ? "text-red-300" : tone === "green" ? "text-emerald-300" : "text-white"
        }`}
      >
        {value}
      </p>
      <p className="mt-2 text-xs leading-5 text-stone-400">{detail}</p>
    </article>
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

function StrategyCard({ title, text }: { title: string; text: string }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
      <p className="text-sm font-black text-white">{title}</p>
      <p className="mt-2 text-sm leading-6 text-stone-300">{text}</p>
    </article>
  );
}
