# 问题解决记录：测试环境和 Live 环境搜索结果难区分

日期：2026-04-25

## 背景

Tipi 的核心目标是帮助用户从本地浏览历史中快速找回网页。早期搜索主要依赖标题、URL、域名、访问时间和访问频率进行排序。

这个机制对普通网页足够有效，但在内部工作系统里会遇到一个典型场景：同一个服务存在多个环境。

例如：

```text
https://stellios-abtest.fp-data.test.shopee.io
https://stellios-abtest.fp-data.shopee.io
```

这两个 URL 实际上属于同一个服务，只是一个是测试环境，一个是 live 环境。

## 问题

当用户搜索 `abtest` 时，如果平时测试环境访问更多，测试环境结果会因为访问频率、最近访问时间等因素排在前面，甚至占据主要可见结果区域。

这会导致 live 环境页面虽然存在于历史记录中，但用户不容易快速找到。

更具体的问题是：

- `abtest` 能命中测试环境，也能命中 live 环境，但排序无法理解它们是同一服务的不同环境。
- `abtest live` 这类查询原本不稳定，因为 live 环境 URL 不一定显式包含 `live` 字样。
- 同一个测试环境 host 的多个页面可能连续出现，挤掉同服务的 live 页面。
- 用户需要靠肉眼区分 URL，搜索结果缺少环境标签提示。

## 原因

原有搜索逻辑只理解文本，不理解 URL 结构。

也就是说，Tipi 原本知道这些字段：

- 标题是否包含关键词
- hostname 是否包含关键词
- URL 是否包含关键词
- 最近是否访问过
- 访问次数是否更多

但它不知道：

- `test` 是环境标识
- 无环境后缀的同族 host 很可能是 live 环境
- `stellios-abtest.fp-data.test.shopee.io` 和 `stellios-abtest.fp-data.shopee.io` 是同一个服务族
- 用户输入 `live` / `test` 时，可能是在表达环境意图，而不只是普通关键词

## 解决方案

新增一层运行时搜索元数据解析，不改 IndexedDB 数据结构。

每条历史记录在搜索时临时解析出：

```ts
type SearchMetadata = {
  environment: SearchEnvironment;
  serviceKey: string | null;
  domainKey: string | null;
  hostFamily: string;
};
```

核心思路：

1. 从 hostname 片段中识别环境词，例如 `test`、`prod`、`staging`、`dev`、`qa`。
2. 把环境片段移除后生成 `hostFamily`，用于识别同一个服务族。
3. 如果某个无环境 host 和一个明确环境 host 属于同一个 `hostFamily`，则把无环境 host 推断为 `live`。
4. 如果查询里出现环境词，例如 `abtest live`，则对匹配环境的结果加分，对明显不匹配的环境降权。
5. 搜索结果按 exact host 和 hostFamily 做轻量去重，避免一个环境连续占满结果列表。
6. UI 上展示 `LIVE`、`TEST` 等环境标签，降低用户识别成本。

## 示例

输入：

```text
abtest
```

期望结果不再全部被测试环境占据，而是更容易看到同服务的 live 页面。

输入：

```text
abtest live
```

期望结果优先返回：

```text
https://stellios-abtest.fp-data.shopee.io
```

即使这个 URL 本身没有显式包含 `live`，Tipi 也可以通过同族 host 推断它是 live 环境。

输入：

```text
abtest test
```

期望结果优先返回：

```text
https://stellios-abtest.fp-data.test.shopee.io
```

## 实现位置

- `src/lib/search/metadata.ts`
  负责解析环境、hostFamily、serviceKey、domainKey，并处理同族 live 推断。

- `src/lib/search/ranking.ts`
  负责把环境意图加入搜索匹配和排序，并做 host / hostFamily 结果多样化。

- `src/components/ResultList.tsx`
  负责展示更紧凑的搜索结果，并显示环境标签。

- `src/types/tipi.ts`
  定义 `SearchEnvironment`、`SearchMetadata`，并把 metadata 挂到 `SearchResult` 上。

## 验收用例

已覆盖以下自动化测试：

- 能从 `stellios-abtest.fp-data.test.shopee.io` 解析出 `test` 环境。
- 能把同族的 `stellios-abtest.fp-data.shopee.io` 推断为 `live`。
- 查询 `abtest live` 时，推断出的 live host 排在高频 test host 前面。
- 查询 `abtest test` 时，test host 排在 live host 前面。
- 查询 `abtest` 时，同族 live host 不会被多个 test host 完全挤掉。

## 边界

当前方案是启发式解析，不追求一次性覆盖所有公司或所有域名结构。

已知边界：

- 不使用 Public Suffix List，因此复杂公网域名的 service/domain 拆分不一定完美。
- 不存储 metadata 到 IndexedDB，因此每次搜索都会运行解析逻辑，但当前历史量下成本可控。
- 不支持用户自定义环境别名，例如 `gray`、`pre`、`beta` 等。
- 不支持用户手动 pin 某个环境结果。

## 后续迭代

可以继续增强：

- 支持更多环境别名，例如 `pre`、`gray`、`beta`。
- 允许用户为特定 hostFamily 设置默认偏好，例如默认优先 live。
- 增加搜索解释信息，展示为什么某条结果被识别为 `LIVE`。
- 如果 metadata 规则稳定，再考虑持久化到 IndexedDB，减少重复解析。
