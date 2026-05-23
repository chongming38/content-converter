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
    const { content, platform } = await req.json();

    if (!content || content.trim() === "") {
      return NextResponse.json({ error: "请输入内容" }, { status: 400 });
    }

    if (content.length > 3000) {
      return NextResponse.json(
        { error: "内容过长，请控制在 3000 字以内" },
        { status: 400 }
      );
    }

    if (!["weixin", "xiaohongshu"].includes(platform)) {
      return NextResponse.json({ error: "平台参数错误" }, { status: 400 });
    }

    const promptPath = path.join(process.cwd(), "prompts", `${platform}.txt`);
    const systemPrompt = fs.readFileSync(promptPath, "utf-8");

    const completion = await client.chat.completions.create({
      model: "deepseek-ai/DeepSeek-V3",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `请把以下内容转换为对应平台风格：\n\n${content}`,
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
