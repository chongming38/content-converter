import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import fs from "fs";
import path from "path";

const client = new OpenAI({
  apiKey: process.env.SILICONFLOW_API_KEY,
  baseURL: "https://api.siliconflow.cn/v1",
});

export async function POST(req: NextRequest) {
  try {
    const { content, platform, accountType, style, customStyle } = await req.json();

    if (!content || content.trim() === "") {
      return NextResponse.json({ error: "请输入内容" }, { status: 400 });
    }

    if (content.length > 3000) {
      return NextResponse.json({ error: "内容过长，请控制在 3000 字以内" }, { status: 400 });
    }

    if (!["weixin", "xiaohongshu"].includes(platform)) {
      return NextResponse.json({ error: "平台参数错误" }, { status: 400 });
    }

    const promptPath = path.join(process.cwd(), "prompts", `${platform}.txt`);
    const systemPrompt = fs.readFileSync(promptPath, "utf-8");
    const targetPlatform = platform === "weixin" ? "微信公众号" : "小红书";

    const preferenceLines = [
      `目标平台：${targetPlatform}`,
      accountType ? `账号类型：${accountType}` : "",
      style ? `写作风格：${style}` : "",
      customStyle ? `额外偏好：${customStyle}` : "",
    ].filter(Boolean);

    const completion = await client.chat.completions.create({
      model: "deepseek-ai/DeepSeek-V3",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `请根据以下账号画像和偏好，把原始内容改写成适合${targetPlatform}发布的版本。\n\n${preferenceLines.join("\n")}\n\n原始内容：\n${content}`,
        },
      ],
    });

    const result = completion.choices[0].message.content || "";
    return NextResponse.json({ result });
  } catch (error) {
    console.error("转换失败:", error);
    return NextResponse.json({ error: "转换失败，请稍后重试" }, { status: 500 });
  }
}
