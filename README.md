# 🌍 留学生出入境天数计算器

一个帮助留学生计算境外停留天数的工具，用于判断是否满足免税车申购资格。

## ✨ 功能特点

- **PDF 解析**：自动解析国家移民管理局的出入境记录 PDF 文件
- **智能计算**：精确计算境外停留天数，支持港澳通行证和普通护照两种证件类型
- **数据修正**：自动检测并修正证件不匹配问题，提示同日多次出入境情况
- **数据可视化**：使用饼图直观展示境外、境内和未来时间分配
- **免税车资格判定**：自动判断是否满足 270 天境外停留要求
- **隐私保护**：纯前端处理，所有数据仅在浏览器中计算，不上传到任何服务器
- **现代化 UI**：基于 shadcn/ui 风格的组件封装，并逐步引入 Radix UI primitives（稳定的交互 state machine），响应式设计，支持深色模式

## 🛠️ 技术栈

- **框架**：[Next.js 16](https://nextjs.org/) + [React 19](https://react.dev/)
- **语言**：[TypeScript](https://www.typescriptlang.org/)
- **样式**：[Tailwind CSS 4](https://tailwindcss.com/)
- **UI 组件**：[shadcn/ui](https://ui.shadcn.com/) + [Radix UI Primitives](https://www.radix-ui.com/primitives)
- **图表**：[Recharts](https://recharts.org/)
- **PDF 解析**：[pdf-parse](https://www.npmjs.com/package/pdf-parse)
- **日期处理**：[date-fns](https://date-fns.org/)
- **包管理器**：[pnpm](https://pnpm.io/)

## 🚀 快速开始

### 环境要求

- Node.js 20+
- pnpm 10+

### 安装依赖

```bash
pnpm install
```

### 开发模式

```bash
pnpm dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看应用。

### 生产构建

```bash
pnpm build
pnpm start
```

## 📖 使用说明

1. **上传 PDF**：点击上传按钮，选择从国家移民管理局下载的出入境记录 PDF 文件
2. **选择类型**：根据你的情况选择"港澳留学生"或"海外留学生"
3. **选择时间范围**：设置学期开始和结束日期
4. **查看结果**：系统会自动计算并显示：
   - 境外停留天数（蓝色）
   - 境内停留天数（棕灰色）
   - 未来可用天数（紫色，如果毕业时间在未来）
   - 免税车申购资格状态

## 📊 免税车申购政策

根据中国海关规定，留学生申请购买免税车需要满足：

- **境外停留时间**：累计 ≥ 270 天（约 9 个月）
- **回国时间**：毕业后首次入境日起 1 年内
- **购车限制**：留学期间内每学习一年可购买一辆免税车

## 🗂️ 项目结构

```
border-tally/
├── app/                    # Next.js App Router 页面
│   ├── globals.css        # 全局样式
│   ├── layout.tsx         # 根布局
│   └── page.tsx           # 主页面
├── components/            # React 组件
│   ├── ui/               # UI 组件封装（shadcn 风格 + Radix primitives）
│   │   ├── radix/        # Radix primitives 封装（渐进迁移）
│   │   │   └── toast.tsx # Radix Toast primitives（Provider/Viewport/Root 等）
│   │   ├── hover-card.tsx # HoverCard（基于 Radix HoverCard）
│   │   ├── popover.tsx   # Popover（基于 Radix Popover）
│   │   ├── toast.tsx     # toast()/useToast() API + Toaster（渲染层基于 Radix Toast）
│   │   └── toaster.tsx   # App 级 Toaster 挂载点
│   ├── pdf-upload.tsx    # PDF 上传组件
│   ├── date-range-picker.tsx  # 日期选择器
│   ├── result-card.tsx   # 结果展示卡片
│   └── result-actions.tsx # 导出/分享按钮
├── lib/                   # 工具函数
│   ├── border-calculation.ts  # 境外天数计算逻辑
│   ├── data-correction.ts     # 数据修正和验证逻辑
│   ├── pdf-parser.ts     # PDF 解析逻辑
│   └── utils.ts          # 通用工具
├── types/                 # TypeScript 类型定义
└── public/               # 静态资源
```

## 🧪 测试

```bash
pnpm test
```

## 📝 开发笔记

### Radix UI 渐进迁移（HoverCard + Toast）

本项目正在将高优先级交互组件渐进迁移到 **Radix UI Primitives**，以获得更稳定的交互 state machine（开关状态、延迟控制、dismiss、swipe、unmount 时机等）。

当前已迁移/引入的组件：

- **HoverCard**
  - `components/ui/hover-card.tsx`
  - 说明：改为基于 `@radix-ui/react-hover-card`，避免边界 hover 抖动导致的 flicker。
- **Toast**
  - `components/ui/toast.tsx`：保留 `toast({ ... })` / `useToast()` 的调用方式（对业务层无破坏），但渲染层使用 Radix Toast。
  - `components/ui/radix/toast.tsx`：Radix Toast primitives 封装（`Provider` / `Viewport` / `Root` / `Title` / `Description` / `Action` / `Close` 等），并集中管理 toast 的 variant 样式与图标。

设计原则（第一性原理）：

- 当一个组件的主要复杂度来自 **交互状态机 + 可访问性语义 + 边界行为**（例如：open/close、延迟、焦点、dismiss、手势），优先使用 Radix primitives。
- 纯展示型组件（如 Card/Badge 等）保持轻量封装即可，不强制替换。


### 时区处理

项目中所有日期计算统一使用 **CST (UTC+8)** 时区，确保计算准确性：

- 入境/出境记录统一转换为 CST 日期
- 日期范围选择使用 CST 日历日
- 天数计算采用"包含首尾"的逻辑

### 证件类型区分

- **港澳留学生**：仅统计"往来港澳通行证"的出入境记录
- **海外留学生**：仅统计"普通护照"的出入境记录
- 每种证件类型独立计算，避免跨证件混淆

### 数据修正机制

- **证件匹配修正**：使用栈结构进行出入境配对，自动修正证件不匹配
- **异常检测**：检测同日多次出入境等特殊情况
- **算法优化**：采用"逐日填充"方式计算境外天数，准确处理同日多次出入境

### 未来日期处理

- 如果毕业日期在未来，系统会显示"未来可用"天数
- 未来天数不计入境外/境内占比和免税车资格判定
- 仅用于预估剩余可用学习时间

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

本项目采用 [GPL-3.0 License](https://www.gnu.org/licenses/gpl-3.0.html) 开源协议。

这意味着：
- ✅ 可以自由使用、修改和分发本项目
- ✅ 可以用于商业目的
- ⚠️ 修改后的代码必须同样以 GPL 协议开源
- ⚠️ 必须保留原作者版权信息

## 👨‍💻 作者

[@efan404](https://github.com/efan404)

## 🙏 致谢

- [shadcn/ui](https://ui.shadcn.com/) - 优雅的 UI 组件库
- [Recharts](https://recharts.org/) - 强大的图表库
- [pdf-parse](https://gitlab.com/autokent/pdf-parse) - PDF 解析工具

---

**免责声明**：本工具仅供参考，结果以官方解释为准。使用本工具产生的任何后果，作者不承担任何责任。
