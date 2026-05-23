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

export async function POST(req: NextRequest) {
  try {
    const {
      content,
      platform,
      accountType,
      style,
      customStyle,
      task = "convert",
      selectedStyle,
      subDirection,
      tone,
      emojiDensity,
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

    let promptFile = `${platform}.txt`;
    if (platform === "xiaohongshu") {
      if (task === "route") promptFile = "xiaohongshu-route.txt";
      if (task === "check") promptFile = "xiaohongshu-check.txt";
      if (task === "generate" || task === "convert") {
        promptFile = "xiaohongshu-generate.txt";
      }
    }

    const promptPath = path.join(process.cwd(), "prompts", promptFile);
    const systemPrompt = fs.readFileSync(promptPath, "utf-8");
    const targetPlatform = platform === "weixin" ? "微信公众号" : "小红书";

    let userMessage = `请把以下内容转换为对应平台风格：\n\n${content}`;

    if (platform === "weixin") {
      const preferenceLines = [
        `目标平台：${targetPlatform}`,
        accountType ? `账号类型：${accountType}` : "",
        style ? `写作风格：${style}` : "",
        customStyle ? `额外偏好：${customStyle}` : "",
      ].filter(Boolean);

      userMessage = `请根据以下账号画像和偏好，把原始内容改写成适合${targetPlatform}发布的版本。\n\n${preferenceLines.join(
        "\n"
      )}\n\n原始内容：\n${content}`;
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

    const completion = await createChatCompletion({
      task,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
    });

    const result = completion.choices[0].message.content || "";
    return NextResponse.json({ result });
  } catch (error) {
    console.error("转换失败:", error);
    return NextResponse.json({ error: "转换失败，请稍后重试" }, { status: 500 });
  }
}
