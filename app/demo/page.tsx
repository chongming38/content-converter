import Link from "next/link";

const steps = [
  {
    title: "选择目标平台",
    text: "先告诉系统你要发到小红书还是公众号。",
  },
  {
    title: "补充账号画像",
    text: "用账号类型和写作风格减少单篇内容带来的误判。",
  },
  {
    title: "生成改写稿",
    text: "输出可发布版本，同时说明保留、强化和删掉了什么。",
  },
];

const platformRules = [
  {
    label: "小红书",
    title: "先抓住人，再给价值",
    points: ["情绪钩子", "短段落", "收藏点", "互动结尾"],
  },
  {
    label: "公众号",
    title: "先立住观点，再展开逻辑",
    points: ["标题结构", "论证层次", "案例支撑", "思考结尾"],
  },
];

export default function DemoPage() {
  return (
    <main className="min-h-screen bg-[#f8f4ed] text-stone-950">
      <section className="relative overflow-hidden border-b border-stone-200">
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(239,68,68,.14),transparent_30%),linear-gradient(260deg,rgba(16,185,129,.16),transparent_34%)]" />
        <div className="relative mx-auto grid min-h-[92vh] max-w-7xl gap-10 px-6 py-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div>
            <p className="mb-5 text-xs font-black uppercase tracking-[0.24em] text-stone-500">PlatformFit</p>
            <h1 className="max-w-3xl text-5xl font-black leading-[0.95] tracking-tight md:text-7xl">
              内容跨平台改写器
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-stone-650">
              小红书 ↔ 公众号，一键改写成适合发布的版本，并说明原因。
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/"
                className="rounded-full bg-stone-950 px-6 py-3 text-sm font-black text-white shadow-[0_18px_40px_rgba(17,16,14,.22)] transition hover:translate-y-[-1px]"
              >
                打开工作台
              </Link>
              <a
                href="#case"
                className="rounded-full border border-stone-300 bg-white/70 px-6 py-3 text-sm font-black text-stone-800 transition hover:border-stone-500"
              >
                看演示案例
              </a>
            </div>
          </div>

          <div className="rounded-[34px] border border-stone-200 bg-white/80 p-4 shadow-[0_30px_90px_rgba(58,40,22,.16)] backdrop-blur">
            <div className="rounded-[26px] bg-[#11100e] p-5 text-white">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-red-500/15 px-3 py-1.5 text-sm font-black text-red-200">目标 小红书</span>
                <span className="rounded-full bg-white/10 px-3 py-1.5 text-sm font-black">账号 生活记录</span>
                <span className="rounded-full bg-white/10 px-3 py-1.5 text-sm font-black">风格 真实碎碎念</span>
              </div>
              <div className="mt-5 rounded-3xl bg-[#fbfaf6] p-5 text-stone-950">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-stone-400">Output</p>
                <h2 className="mt-2 text-2xl font-black">别再把公众号原文直接搬到小红书了</h2>
                <div className="mt-5 space-y-4 text-sm leading-7 text-stone-650">
                  <p>很多人做内容复用，最容易犯的错就是：把一篇完整文章压缩一下，就当成小红书笔记。</p>
                  <p>但小红书不是短版公众号。它需要一个能让人停下来的开头，一个具体场景，还有读完能收藏的结论。</p>
                  <p className="font-black text-stone-950">同一份内容，换个平台，就要换一种说话方式。</p>
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <MiniCard title="保留" text="核心观点" />
                <MiniCard title="强化" text="钩子和收藏点" />
                <MiniCard title="删掉" text="长铺垫" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-5 md:grid-cols-3">
          <ValueCard
            title="不是简单换语气"
            text="平台差异不只是语言风格，而是阅读习惯、信息结构和用户期待。"
          />
          <ValueCard
            title="先判断，再改写"
            text="系统会根据目标平台、账号类型和原文状态决定怎么重组内容。"
          />
          <ValueCard
            title="给结果，也给原因"
            text="改写后会解释保留什么、强化什么、删掉什么，方便用户理解。"
          />
        </div>
      </section>

      <section className="border-y border-stone-200 bg-white/55">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-16 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-stone-400">Workflow</p>
            <h2 className="mt-3 text-4xl font-black tracking-tight">用户只需要做三件事</h2>
            <p className="mt-4 max-w-md text-sm leading-7 text-stone-600">
              不让用户研究提示词，不让用户判断平台规则。选择目标，粘贴内容，剩下的交给系统。
            </p>
          </div>
          <div className="grid gap-3">
            {steps.map((step, index) => (
              <article key={step.title} className="grid gap-4 rounded-3xl border border-stone-200 bg-[#fbfaf6] p-5 sm:grid-cols-[56px_1fr]">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-950 text-xl font-black text-white">
                  {index + 1}
                </div>
                <div>
                  <h3 className="text-xl font-black">{step.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-stone-600">{step.text}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="case" className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-7 flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-stone-400">Why It Works</p>
            <h2 className="mt-3 text-4xl font-black tracking-tight">两个平台，不是同一种写法</h2>
          </div>
          <Link href="/" className="w-fit rounded-full bg-stone-950 px-5 py-3 text-sm font-black text-white">
            去试一次
          </Link>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          {platformRules.map((rule) => (
            <article key={rule.label} className="rounded-[30px] border border-stone-200 bg-white p-6 shadow-[0_20px_60px_rgba(58,40,22,.08)]">
              <span className={rule.label === "小红书" ? "text-sm font-black text-red-600" : "text-sm font-black text-emerald-700"}>
                {rule.label}
              </span>
              <h3 className="mt-3 text-2xl font-black">{rule.title}</h3>
              <div className="mt-5 flex flex-wrap gap-2">
                {rule.points.map((point) => (
                  <span key={point} className="rounded-full bg-stone-100 px-3 py-2 text-sm font-bold text-stone-700">
                    {point}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

function MiniCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl bg-white/10 p-4">
      <p className="text-xs font-black text-stone-400">{title}</p>
      <p className="mt-1 text-sm font-black text-white">{text}</p>
    </div>
  );
}

function ValueCard({ title, text }: { title: string; text: string }) {
  return (
    <article className="rounded-[30px] border border-stone-200 bg-white/80 p-6 shadow-[0_18px_54px_rgba(58,40,22,.08)]">
      <h3 className="text-2xl font-black">{title}</h3>
      <p className="mt-4 text-sm leading-7 text-stone-600">{text}</p>
    </article>
  );
}
