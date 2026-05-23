import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import fs from "fs";
import path from "path";

type Provider = "deepseek" | "siliconflow";

function splitKeys(value: string | undefined) {
  return (value || "")
    .split(/[\n,;]+/)
    .map((key) => key.trim())
    .filter(Boolean);
}

function getProvider(): Provider {
  const configured = process.env.AI_PROVIDER?.toLowerCase();
  if (configured === "deepseek" || configured === "siliconflow") {
    return configured;
  }

  return getDeepSeekKeys().length > 0 ? "deepseek" : "siliconflow";
}

function getDeepSeekKeys() {
  const keys = [
    ...splitKeys(process.env.DEEPSEEK_API_KEYS),
    process.env.DEEPSEEK_API_KEY,
    process.env.DEEPSEEK_API_KEY_1,
    process.env.DEEPSEEK_API_KEY_2,
    process.env.DEEPSEEK_API_KEY_3,
  ].filter(Boolean) as string[];

  return Array.from(new Set(keys));
}

function getSiliconFlowKeys() {
  const keys = [
    ...splitKeys(process.env.SILICONFLOW_API_KEYS),
    process.env.SILICONFLOW_API_KEY,
  ].filter(Boolean) as string[];

  return Array.from(new Set(keys));
}

function getApiConfig(task: string) {
  const provider = getProvider();
  const isGenerationTask = task === "generate" || task === "convert";

  if (provider === "deepseek") {
    return {
      provider,
      baseURL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
      keys: getDeepSeekKeys(),
      model: isGenerationTask
        ? process.env.DEEPSEEK_MODEL_GENERATE || "deepseek-v4-pro"
        : process.env.DEEPSEEK_MODEL_ROUTE || "deepseek-v4-flash",
    };
  }

  return {
    provider,
    baseURL: process.env.SILICONFLOW_BASE_URL || "https://api.siliconflow.cn/v1",
    keys: getSiliconFlowKeys(),
    model: isGenerationTask
      ? process.env.SILICONFLOW_MODEL_GENERATE || "deepseek-ai/DeepSeek-V3"
      : process.env.SILICONFLOW_MODEL_ROUTE || "deepseek-ai/DeepSeek-V3",
  };
}

async function createChatCompletion(params: {
  task: string;
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[];
}) {
  const config = getApiConfig(params.task);

  if (config.keys.length === 0) {
    throw new Error(`${config.provider} API key 未配置`);
  }

  let lastError: unknown;

  for (const apiKey of config.keys) {
    try {
      const client = new OpenAI({
        apiKey,
        baseURL: config.baseURL,
      });

      return await client.chat.completions.create({
        model: config.model,
        messages: params.messages,
      });
    } catch (error) {
      lastError = error;
      console.error(`${config.provider} 调用失败，尝试下一个 key:`, error);
    }
  }

  throw lastError;
}

async function createStreamingCompletion(params: {
  task: string;
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[];
}) {
  const config = getApiConfig(params.task);

  if (config.keys.length === 0) {
    throw new Error(`${config.provider} API key 未配置`);
  }

  let lastError: unknown;

  for (const apiKey of config.keys) {
    try {
      const client = new OpenAI({
        apiKey,
        baseURL: config.baseURL,
      });

      return await client.chat.completions.create({
        model: config.model,
        messages: params.messages,
        stream: true,
      });
    } catch (error) {
      lastError = error;
      console.error(`${config.provider} 调用失败，尝试下一个 key:`, error);
    }
  }

  throw lastError;
}

export async function POST(req: NextRequest) {
  try {
    const {
      content,
      platform,
      task = "convert",
      // xiaohongshu
      selectedStyle,
      subDirection,
      tone,
      emojiDensity,
      // weixin
      selectedType,
      // shared
      userPreference,
    } = await req.json();

    if (!content || content.trim() === "") {
      return NextResponse.json({ error: "请输入内容" }, { status: 400 });
    }

    if (content.length > 3000) {
      return NextResponse.json({ error: "内容过长，请控制在 3000 字以内" }, { status: 400 });
    }

    if (!["weixin", "xiaohongshu"].includes(platform)) {
      return NextResponse.json({ error: "平台参数错误" }, { status: 400 });
    }

    let promptFile = "weixin-general.txt";
    if (platform === "xiaohongshu") {
      if (task === "route") promptFile = "xiaohongshu-route.txt";
      if (task === "check") promptFile = "xiaohongshu-check.txt";
      if (task === "generate" || task === "convert") promptFile = "xiaohongshu-generate.txt";
    } else {
      // weixin
      if (task === "route") {
        promptFile = "weixin-route.txt";
      } else if (task === "check") {
        promptFile = "weixin-check.txt";
      } else if (task === "generate" || task === "convert") {
        const typeToFile: Record<string, string> = {
          "情绪共鸣": "weixin-emotion.txt",
          "经验干货": "weixin-practical.txt",
          "热点观点": "weixin-hot-take.txt",
          "人设故事": "weixin-story.txt",
          "通用兜底": "weixin-general.txt",
        };
        promptFile = typeToFile[selectedType as string] || "weixin-general.txt";
      }
    }

    const promptPath = path.join(process.cwd(), "prompts", promptFile);
    const systemPrompt = fs.readFileSync(promptPath, "utf-8");
    const targetPlatform = platform === "weixin" ? "微信公众号" : "小红书";

    let userMessage = `请把以下内容转换为对应平台风格：\n\n${content}`;

    if (platform === "weixin" && task === "route") {
      userMessage = `用户输入内容：\n${content}`;
    }

    if (platform === "weixin" && task === "check") {
      userMessage = `用户选择的类型：${selectedType || ""}\n\n用户输入内容：\n${content}`;
    }

    if (platform === "weixin" && (task === "generate" || task === "convert")) {
      userMessage = [
        `内容类型：${selectedType || "通用兜底"}`,
        userPreference ? `用户额外要求：${userPreference}` : "",
        `原始内容：\n${content}`,
      ].filter(Boolean).join("\n\n");
    }

    if (platform === "xiaohongshu" && task === "route") {
      userMessage = `用户输入内容：\n${content}`;
    }

    if (platform === "xiaohongshu" && task === "check") {
      userMessage = `用户选择的风格：${selectedStyle || ""}\n\n用户输入内容：\n${content}`;
    }

    if (platform === "xiaohongshu" && (task === "generate" || task === "convert")) {
      userMessage = [
        `用户选择的小红书风格：${selectedStyle || "由你判断"}`,
        `内部表达方向：${subDirection || "由你判断"}`,
        `语气 tone：${tone || "由你判断"}`,
        `emoji 密度：${emojiDensity || "由你判断"}`,
        userPreference ? `用户个人偏好/修改意见：${userPreference}` : "",
        `用户原始内容：\n${content}`,
      ]
        .filter(Boolean)
        .join("\n\n");
    }

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ];

    if (task === "generate" || task === "convert") {
      const stream = await createStreamingCompletion({ task, messages });
      const readable = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();
          try {
            for await (const chunk of stream) {
              const content = chunk.choices[0]?.delta?.content;
              if (content) controller.enqueue(encoder.encode(content));
            }
          } finally {
            controller.close();
          }
        },
      });
      return new Response(readable, {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    const completion = await createChatCompletion({ task, messages });
    const result = completion.choices[0].message.content || "";
    return NextResponse.json({ result });
  } catch (error) {
    console.error("转换失败:", error);
    return NextResponse.json({ error: "转换失败，请稍后重试" }, { status: 500 });
  }
}
