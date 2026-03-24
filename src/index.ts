import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { buildEnhancedMockPrompt, getIdlByInterfaceName } from "./idl-service.js";

const TOOL_NAME = "generate_mock_from_idl_prompt";

const argsSchema = z.object({
  interfaceName: z.string().min(1, "interfaceName 不能为空"),
  scene: z.string().optional(),
  language: z.enum(["zh", "en"]).optional(),
  outputFormat: z.enum(["json", "ts"]).optional(),
  count: z.number().int().min(1).max(50).optional(),
  extraRules: z.string().optional(),
});

const server = new Server(
  {
    name: "idl-mock-prompt-server",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: TOOL_NAME,
        description:
          "根据接口 IDL 生成可直接给 agent 使用的增强 Prompt，让 agent 按 IDL 产出 mock 数据",
        inputSchema: {
          type: "object",
          properties: {
            interfaceName: {
              type: "string",
              description: "接口名，例如: GetUserProfile",
            },
            scene: {
              type: "string",
              description: "业务场景描述",
            },
            language: {
              type: "string",
              enum: ["zh", "en"],
              description: "Prompt 语言",
            },
            outputFormat: {
              type: "string",
              enum: ["json", "ts"],
              description: "希望 agent 产出的 mock 格式",
            },
            count: {
              type: "number",
              description: "mock 样本条数，1-50",
            },
            extraRules: {
              type: "string",
              description: "附加生成规则",
            },
          },
          required: ["interfaceName"],
          additionalProperties: false,
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: rawArgs } = request.params;

  if (name !== TOOL_NAME) {
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: `未知工具: ${name}`,
        },
      ],
    };
  }

  const parsed = argsSchema.safeParse(rawArgs ?? {});  
  
  if (!parsed.success) {
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: `参数错误: ${parsed.error.message}`,
        },
      ],
    };
  }

  const args = parsed.data;
  const idl = await getIdlByInterfaceName(args.interfaceName);

  if (!idl) {
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: `未找到接口 IDL: ${args.interfaceName}`,
        },
      ],
    };
  }

  const enhancedPrompt = buildEnhancedMockPrompt({
    idl,
    scene: args.scene,
    language: args.language,
    outputFormat: args.outputFormat,
    count: args.count,
    extraRules: args.extraRules,
  });

  return {
    content: [
      {
        type: "text",
        text: enhancedPrompt,
      },
    ],
  };
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("MCP server 启动失败:", error);
  process.exit(1);
});
