# Windows 浏览器本地版

发布包包含正式网页、Windows x64 Node.js 运行环境、离线图标及 pako。用户完整解压后双击 `启动明尊计算器.cmd`，浏览器自动访问 `http://127.0.0.1:17808/`。服务仅监听本机；方案保存在浏览器同一地址的 localStorage 中，不与 localhost:3000 或线上地址共用缓存。

制作步骤（在项目根目录执行，下载资源使用 PowerShell 7.2 或以上）：

```powershell
pnpm run build:local
node scripts/package-local-calculator.cjs --runtime "<包含node.exe和LICENSE.txt的Windows运行环境目录>" --output "<工作区下尚不存在的发布目录>"
pwsh -File scripts/download-local-assets.ps1 -PackageDirectory "<发布目录>"
node scripts/verify-local-calculator.cjs "<发布目录>"
node scripts/verify-mingzun-worker.cjs "<发布目录>/web"
Compress-Archive -LiteralPath "<发布目录>" -DestinationPath "<压缩包路径>"
```

打包只处理输出副本：移除联网统计、登录验证脚本，将图片地址映射到本地缓存，保留网页版本的源码和部署行为。缺失的非关键图片使用本地占位图，不影响数值计算；pako 等必需依赖缺失则验证失败，不发布。资源下载缓存在工作区 `.cache/local-calculator-assets`，再次打包时复用。

明尊入口不再引用其他心法的模拟器或旧多心法加载页，避免把无法使用的代码打进发布包。图标清单只解析实际图标字段，不把技能ID、Buff数值等数字当成图标。输出副本会移除源码映射和旧版使用须知，启动器与网页共同参与版本校验。

验证脚本会检查本地运行环境、离线压缩库、静态文件的 MIME、方案推荐 Worker、重复启动的健康检查接口，以及禁止越界读取和写入请求。Worker 验证可以接收网页目录参数，覆盖根目录和 GitHub Pages 子目录两种资源加载方式。

本次精简装备黄字接入属于数据与显示阶段。特效条件和数值已结构化，`calculateLoadout`返回逐部位特效清单；特效伤害与增益的实际结算仍待后续接入，不用未经确认的覆盖率替代机制。
