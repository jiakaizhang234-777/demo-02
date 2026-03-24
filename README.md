# IDL Mock MCP Server

一个最小 MCP Server 示例：
- 通过 `CallToolRequestSchema` 响应客户端工具调用
- 查询接口 IDL（当前用本地文件 mock，模拟 API）
- 返回增强 Prompt 给 agent，让 agent 按 IDL 生成 mock 数据

## Tool

工具名：`generate_mock_from_idl_prompt`

入参：
- `interfaceName` (required): 接口名
- `scene` (optional): 业务场景
- `language` (optional): `zh | en`
- `outputFormat` (optional): `json | ts`
- `count` (optional): 样本数量，1-50
- `extraRules` (optional): 附加规则

返回：
- `text` 内容为增强后的 Prompt，直接可投喂给 agent 继续生成 mock。

## Run

```bash
npm install
npm run dev
```

或构建后运行：

```bash
npm run build
npm start
```

## IDL Mock 数据

文件：`src/data/idl-mock.json`

你可以继续扩展 `interfaces` 列表来模拟更多接口。

## 示例调用参数

```json
{
  "interfaceName": "ListOrders",
  "scene": "电商订单分页查询",
  "language": "zh",
  "outputFormat": "json",
  "count": 8,
  "extraRules": "金额保留2位小数，状态分布要包含PAID"
}
```
