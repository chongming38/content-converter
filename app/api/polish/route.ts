import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import fs from "fs";
import path from "path";

function splitKeys(value: string | undefined) {
  return (value || "").split(/[\n,;]+/).map((k) => k.trim()).filter(Boolean);
}

function getClient() {
  const deepseekKey = [
    ...splitKeys(process.env.DEEPSEEK_API_KEYS),
    process.env.DEEPSEEK_API_KEY,
    process.env.DEEPSEEK_API_KEY_1,
    process.env.DEEPSEEK_API_KEY_2,
    process.env.DEEPSEEK_API_KEY_3,
  ].filter(Boolean)[0];

  if (deepseekKey) {
    return {
      client: new OpenAI({
        apiKey: deepseekKey,
        baseURL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
      }),
      model: process.env.DEEPSEEK_MODEL_ROUTE || "deepseek-chat",
    };
  }

  const siliconflowKey = process.env.SILICONFLOW_API_KEY;
  if (siliconflowKey) {
    return {
      client: new OpenAI({
        apiKey: siliconflowKey,
        baseURL: process.env.SILICONFLOW_BASE_URL || "https://api.siliconflow.cn/v1",
      }),
      model: process.env.SILICONFLOW_MODEL_ROUTE || "deepseek-ai/DeepSeek-V3",
    };
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();

    if (!text?.trim()) {
      return NextResponse.json({ error: "请输入内容" }, { status: 400 });
    }
    if (text.length > 3000) {
      return NextResponse.json({ error: "内容过长，请控制在 3000 字以内" }, { status: 400 });
    }

    const config = getClient();
    if (!config) {
      return NextResponse.json({ error: "API key 未配置" }, { status: 500 });
    }

    const promptPath = path.join(process.cwd(), "prompts", "polish.txt");
    const systemPrompt = fs.readFileSync(promptPath, "utf-8");

    const completion = await config.client.chat.completions.create({
      model: config.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: text },
      ],
      temperature: 0.3,
    });

    const result = completion.choices[0].message.content || "";
    return NextResponse.json({ result });
  } catch (error) {
    console.error("整理失败:", error);
    return NextResponse.json({ error: "整理失败，请稍后重试" }, { status: 500 });
  }
}
