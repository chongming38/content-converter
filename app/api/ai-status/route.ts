import { NextResponse } from "next/server";

type Provider = "deepseek" | "siliconflow";

function splitKeys(value: string | undefined) {
  return (value || "")
    .split(/[\n,;]+/)
    .map((key) => key.trim())
    .filter(Boolean);
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

function getProvider(): Provider {
  const configured = process.env.AI_PROVIDER?.toLowerCase();
  if (configured === "deepseek" || configured === "siliconflow") {
    return configured;
  }

  return getDeepSeekKeys().length > 0 ? "deepseek" : "siliconflow";
}

export async function GET() {
  const provider = getProvider();
  const deepseekKeys = getDeepSeekKeys();
  const siliconflowKeys = getSiliconFlowKeys();

  return NextResponse.json({
    provider,
    baseURL:
      provider === "deepseek"
        ? process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com"
        : process.env.SILICONFLOW_BASE_URL || "https://api.siliconflow.cn/v1",
    routeModel:
      provider === "deepseek"
        ? process.env.DEEPSEEK_MODEL_ROUTE || "deepseek-v4-flash"
        : process.env.SILICONFLOW_MODEL_ROUTE || "deepseek-ai/DeepSeek-V3",
    generateModel:
      provider === "deepseek"
        ? process.env.DEEPSEEK_MODEL_GENERATE || "deepseek-v4-pro"
        : process.env.SILICONFLOW_MODEL_GENERATE || "deepseek-ai/DeepSeek-V3",
    configuredKeyCount:
      provider === "deepseek" ? deepseekKeys.length : siliconflowKeys.length,
    hasDeepSeekKeys: deepseekKeys.length > 0,
    hasSiliconFlowKeys: siliconflowKeys.length > 0,
  });
}
