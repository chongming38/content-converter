"use client";

import { useState } from "react";

type Platform = "weixin" | "xiaohongshu";

export default function Home() {
  const [content, setContent] = useState("");
  const [platform, setPlatform] = useState<Platform>("weixin");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

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
        body: JSON.stringify({ content, platform }),
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
    <main className="min-h-screen bg-gray-50">
      {/* 顶部标题 */}
      <div className="bg-white border-b border-gray-200 px-6 py-5">
        <h1 className="text-2xl font-bold text-gray-900">把你的文字，变成能发的内容</h1>
        <p className="text-gray-500 mt-1 text-sm">粘贴任意内容，选平台，AI 一键转换</p>
      </div>

      {/* 主体两栏 */}
      <div className="flex flex-col md:flex-row h-[calc(100vh-81px)]">

        {/* 左栏：输入 */}
        <div className="w-full md:w-1/2 flex flex-col p-6 border-r border-gray-200 bg-white">
          <p className="text-sm font-medium text-gray-700 mb-2">输入内容</p>
          <textarea
            className="flex-1 w-full border border-gray-200 rounded-xl p-4 text-sm text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
            placeholder="粘贴你的内容，草稿、碎片、完整文章都可以..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <p className="text-xs text-gray-400 mt-1 text-right">{content.length} / 3000</p>

          {/* 平台选择 */}
          <div className="mt-4">
            <p className="text-sm font-medium text-gray-700 mb-2">选择平台</p>
            <div className="flex gap-3">
              <button
                onClick={() => setPlatform("weixin")}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  platform === "weixin"
                    ? "bg-green-500 text-white shadow-sm"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                微信公众号
              </button>
              <button
                onClick={() => setPlatform("xiaohongshu")}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  platform === "xiaohongshu"
                    ? "bg-red-500 text-white shadow-sm"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                小红书
              </button>
            </div>
          </div>

          {/* 转换按钮 */}
          <button
            onClick={handleConvert}
            disabled={loading || !content.trim()}
            className="mt-4 w-full py-3 rounded-xl bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? "转换中..." : "开始转换"}
          </button>
        </div>

        {/* 右栏：输出 */}
        <div className="w-full md:w-1/2 flex flex-col p-6 bg-gray-50">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-700">转换结果</p>
            {result && (
              <button
                onClick={handleCopy}
                className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-all"
              >
                {copied
                  ? "已复制 ✓"
                  : platform === "weixin"
                  ? "复制 → 粘贴到公众号编辑器"
                  : "复制 → 粘贴到小红书"}
              </button>
            )}
          </div>

          <div className="flex-1 bg-white rounded-xl border border-gray-200 p-5 overflow-y-auto">
            {error && (
              <p className="text-red-500 text-sm">{error}</p>
            )}
            {!result && !error && !loading && (
              <p className="text-gray-400 text-sm">转换后的内容会显示在这里</p>
            )}
            {loading && (
              <p className="text-gray-400 text-sm">AI 正在转换中，请稍候...</p>
            )}
            {result && (
              <pre className="whitespace-pre-wrap text-sm text-gray-800 font-sans leading-relaxed">
                {result}
              </pre>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
