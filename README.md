# Tipi

Tipi 是一个浏览器插件，用来基于浏览历史快速找回并打开网页。

当前版本已经具备以下基础能力：
- 读取浏览器历史并建立本地索引
- 在扩展弹窗中搜索标题、域名、URL
- 手动同步历史记录
- 清空本地缓存数据
- 通过快捷键快速打开插件

## 环境要求

- Node.js `22+`
- npm `10+`
- Chrome / Edge / Arc 等 Chromium 浏览器

## 安装依赖

在项目根目录执行：

```bash
npm install
```

## 本地开发

启动 WXT 开发模式：

```bash
npm run dev
```

Firefox 开发模式：

```bash
npm run dev:firefox
```

如果需要指定端口：

```bash
npm run dev -- --port 4000
```

说明：
- `wxt dev` 会尝试启动开发服务器并自动打开浏览器
- 如果本机开发模式不稳定，可以优先使用生产构建 + 手动加载解压目录的方式调试

## 构建插件

构建 Chrome / Chromium 版本：

```bash
npm run build
```

构建 Firefox 版本：

```bash
npm run build:firefox
```

构建完成后，产物目录：

- Chrome: `.output/chrome-mv3`
- Firefox: `.output/firefox-mv2`

## 加载到浏览器

### Chrome / Edge / Arc

1. 打开浏览器扩展管理页
2. 开启“开发者模式”
3. 选择“加载已解压的扩展程序”
4. 选择目录：

```text
.output/chrome-mv3
```

### Firefox

1. 打开 `about:debugging`
2. 进入“此 Firefox”
3. 选择“临时载入附加组件”
4. 选择：

```text
.output/firefox-mv2/manifest.json
```

## 使用方式

### 1. 打开插件

有两种方式：
- 点击浏览器工具栏中的 Tipi 图标
- 使用快捷键

当前默认快捷键：
- Windows / Linux: `Alt + K`
- macOS: `Option + K`

如果快捷键冲突，可以在浏览器扩展快捷键设置页中修改。

首次使用建议按这个顺序：

1. 打开设置页
2. 点击 `Sync History`
3. 按 `Alt + K` / `Option + K` 打开 Tipi
4. 输入关键词并按 `Enter` 打开高亮结果

### 2. 同步历史记录

首次使用建议先打开设置页执行一次历史同步：

1. 点击插件弹窗右上角 `Settings`
2. 点击 `Sync History`
3. 等待同步完成

同步完成后，Tipi 会把历史记录索引到本地数据库中。

### 3. 搜索网页

在插件弹窗输入任意关键词即可搜索，支持：
- 页面标题关键词
- 域名关键词
- URL 片段

示例：
- `github`
- `jira`
- `figma`
- `docs`

### 4. 打开网页

点击搜索结果即可在新标签页中打开对应页面。

### 5. 清空本地数据

在设置页点击 `Clear Local Data` 可以清空 Tipi 当前保存的本地索引。

## 权限说明

当前插件会申请以下权限：

- `history`
  读取浏览历史，用于搜索
- `storage`
  保存本地索引和状态
- `tabs`
  打开目标网页

Tipi 当前不上传历史数据到远程服务，索引默认仅保存在浏览器本地。

## 发布准备

如果准备上 Chrome Web Store，可以直接参考这些文档：

- [隐私政策](./PRIVACY.md)
- [Chrome Web Store 提交材料](./src/docs/release/chrome-web-store-submission.md)

建议先走 `Unlisted` 发布，再转 `Public`。

## 项目结构

```text
src/
  components/         UI 组件
  entrypoints/        WXT 入口
    background.ts     后台脚本
    popup/            插件弹窗
    options/          设置页
  lib/
    history/          历史记录读取
    storage/          IndexedDB 存储
    search/           搜索逻辑
  types/              类型定义
```

## 常用命令

```bash
npm run dev
npm run dev:firefox
npm run build
npm run build:firefox
npm run zip
npm run zip:firefox
```

## 当前实现说明

当前版本为了保证扩展后台运行稳定，搜索实现使用的是本地内存筛选 + 业务排序逻辑。

虽然项目依赖里已经包含 `FlexSearch`，但当前代码没有启用它作为正式搜索链路。后续如果要重新接入，需要先确认它在浏览器扩展 background 环境下的打包兼容性。

## 常见问题

### 1. 点击扩展图标是空白页

先确认：
- 是否已经执行过 `npm run build`
- 浏览器里加载的是 `.output/chrome-mv3`
- 如果使用的是 `dev` 模式，确认 WXT 开发服务器确实启动成功

建议优先使用构建产物手动加载的方式调试。

### 2. Sync History 或 Search 没结果

先打开设置页执行一次 `Sync History`。  
如果还是不正常，打开浏览器扩展页查看：
- popup 控制台报错
- background service worker 报错

### 3. 快捷键不生效

去浏览器扩展快捷键管理页检查：
- 快捷键是否已注册
- 是否和其他扩展冲突
- macOS 如果使用非 Apple 键盘，`Option` 通常对应键盘上的 `Alt`

### 4. 为什么有时是独立窗口，而不是网页内浮窗

在新标签页、`chrome://` 页面、扩展页面等浏览器受限页面中，Tipi 不能注入网页内浮窗，因此会自动打开独立窗口。这是浏览器限制下的正常 fallback 行为。

## 后续建议

如果继续开发，建议优先做这几项：
- 搜索结果键盘导航
- 更稳定的排序策略
- 增量同步历史
- 域名黑名单
- 常用站点置顶
