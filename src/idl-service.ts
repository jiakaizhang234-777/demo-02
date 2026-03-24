import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export interface IdlInterface {
  service: string;
  interfaceName: string;
  description?: string;
  http?: {
    method?: string;
    path?: string;
  };
  request?: Record<string, unknown>;
  response?: Record<string, unknown>;
}

interface IdlMockStore {
  interfaces: IdlInterface[];
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function resolveMockPath(): Promise<string> {
  const candidates = [
    path.resolve(process.cwd(), "src/data/idl-mock.json"),
    path.resolve(__dirname, "data/idl-mock.json"),
  ];

  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // continue
    }
  }

  throw new Error("未找到 IDL mock 文件: src/data/idl-mock.json");
}

async function queryIdlFromMockApi(interfaceName: string): Promise<IdlInterface | null> {
  // 模拟一次 API 查询（当前实现读取本地 mock 文件）
  const mockPath = await resolveMockPath();
  const raw = await readFile(mockPath, "utf-8");
  const store = JSON.parse(raw) as IdlMockStore;
  return (
    store.interfaces.find(
      (item) => item.interfaceName.toLowerCase() === interfaceName.toLowerCase(),
    ) ?? null
  );
}

export async function getIdlByInterfaceName(interfaceName: string): Promise<IdlInterface | null> {
  return queryIdlFromMockApi(interfaceName);
}

export function buildEnhancedMockPrompt(params: {
  idl: IdlInterface;
  scene?: string;
  language?: "zh" | "en";
  outputFormat?: "json" | "ts";
  count?: number;
  extraRules?: string;
}): string {
  const {
    idl,
    scene = "通用业务场景",
    language = "zh",
    outputFormat = "json",
    count = 5,
    extraRules,
  } = params;

  const langGuide =
    language === "zh"
      ? "请使用中文注释与说明，字段值可混合英文业务值。"
      : "Use English comments and explanations.";

  const formatGuide =
    outputFormat === "ts"
      ? "输出 TypeScript mock 代码，包含可直接复用的 mock 常量。"
      : "输出 JSON mock 数据。";

  const rules = [
    "严格遵守 IDL 字段结构、字段类型和 required 约束。",
    "所有枚举值必须来自 IDL 声明。",
    "时间字段使用 ISO-8601 格式。",
    "金额、数量等数值字段要符合业务直觉，不要随机到不合理范围。",
    "分页列表至少返回 1 条数据，默认返回多条样本。",
    "若字段缺少明确约束，请给出合理且一致的默认值策略。",
  ];

  if (extraRules?.trim()) {
    rules.push(`附加规则: ${extraRules.trim()}`);
  }

  return [
    "你是一个资深后端测试工程师，请根据以下 IDL 生成接口 mock 数据。",
    `场景: ${scene}`,
    `语言要求: ${langGuide}`,
    `输出要求: ${formatGuide}`,
    `样本数量: ${count}`,
    "",
    "IDL 信息:",
    JSON.stringify(idl, null, 2),
    "",
    "生成规则:",
    ...rules.map((rule, index) => `${index + 1}. ${rule}`),
    "",
    "请只返回最终 mock 结果，不要输出额外解释。",
  ].join("\n");
}
