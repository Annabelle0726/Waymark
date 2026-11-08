# Waymark 个人求职工作空间

在自己的电脑上整理岗位、跟进投递、保存资料和准备面试。React 与 TypeScript 构建网页，Node.js 与 Express 提供本机认证、文件和工作空间接口。一个 Docker 容器提供网页和后端，SQLite 使用宿主机目录保存数据。

## 在本机启动

需要 Git、Docker Desktop（Windows 使用 Linux 容器）或 Docker Engine，以及带有 `--wait` 支持的 Docker Compose v2 或更高版本。首次构建需要联网下载基础镜像和 npm 依赖；已有镜像后，日常离线使用无需云服务器。

在已有项目目录打开 PowerShell。新电脑可先运行以下命令：

```powershell
git clone https://github.com/Annabelle0726/Waymark.git
cd Waymark
```

```powershell
docker compose up -d --build --wait
docker compose ps
```

打开 [本机工作空间](http://127.0.0.1:4173)。默认端口仅绑定本机回环地址。首次打开会进入登录页。已有账号可直接登录，新用户点击「还没有账号？注册」。注册成功后进入空白私人工作空间。登录状态有效时刷新会恢复自己的工作空间，退出登录后返回登录页。

Compose 自动绑定项目下的 `data/` 和 `private/`。原生 Linux 上请先创建这两个目录，并确保容器用户 UID 1000 可写 `data/`、可读 `private/backend.env`。端口被占用时可在项目根目录的本机 `.env` 写入 `WAYMARK_PORT=4174`，然后再次运行启动命令。更改端口会改变浏览器访问地址。

## 可选的 DeepSeek 配置

离线岗位管理、带标签文字提取、文件上传、笔记、账号和模板提纲均可直接使用。在线草稿需要有效的 DeepSeek API Key、可用余额以及到官方接口的网络连接。

首次配置时运行以下命令。已有配置时直接编辑原文件：

```powershell
New-Item -ItemType Directory -Force private | Out-Null
if (-not (Test-Path private/backend.env)) {
  Copy-Item backend.env.example private/backend.env
}
notepad private/backend.env
```

在本机编辑器中将密钥填在 `DEEPSEEK_API_KEY=` 后面，保存后运行 `docker compose restart app`。默认模型为 `deepseek-flash`。配置目录仅在运行时只读挂载。镜像构建不读取该目录。模板只包含空值和模型名。

登录后，笔记工具栏有两个入口：

- **离线提纲**会根据当前岗位字段和本人填写的资料摘要，在本机整理可编辑提纲。缺少的个人经历标记为待补充。
- **在线草稿**会显示可编辑的发送摘录。岗位页默认带入岗位名称、描述和技能，通用准备页默认为空。点击「确认发送并生成草稿」后，后端才会向 DeepSeek 发送该摘录和整理面试草稿的系统指令。密钥用于请求认证。附件、原始简历、账号邮箱与已有笔记不会自动附加。返回文本追加到当前草稿，点击「保存笔记」后持久化。认证、余额或网络错误会在表单内显示。

接口依据见 [DeepSeek 官方 API 文档](https://api-docs.deepseek.com/)。

## 日常使用

- **岗位**按独立 ID 保存，同公司多个职位可分别管理。侧栏展开岗位可查看平台、进度和时间。使用唯一的「添加岗位」入口选择手动、链接、文字或截图，核对后保存。
- **原始来源**保存最初的文字、链接、截图或手动录入快照。文字提取支持每行一个带中文或英文冒号的字段，如「公司：虚构公司」「岗位：前端工程师」。链接保存地址。多选、拖入或连续粘贴 PNG、JPEG 截图后，Docker 内置的 Tesseract 会在本机读取简体中文及英文，展示可编辑候选字段和识别原文。残缺截图可直接保存，日后可在「编辑岗位」中追加截图，只补空字段；点缩略图可放大，点删除可移除对应截图，保存后生效。单张 10 MB，一次新增最多 40 MB；识别不清时可更换图片或只保留原图。直接运行 Node 开发模式时，OCR 需要 PATH 中的 tesseract 及 chi_sim、eng 语言包。缺失字段显示「待确认」。可编辑岗位、填写用户补充、查看原文或记录带来源的进度更新。
- **笔记**支持标题、加粗、列表标记和预览。普通编辑与放大编辑共享草稿，支持清空、手动保存及 Ctrl/Cmd + S。多页面发生版本冲突时会拒绝旧版本写入；先复制草稿，再刷新并合并。通用笔记与各岗位笔记独立。
- **资料**支持上传、下载、修改名称和摘要、替换文件及删除。单个文件最大 10 MB。资料文件和截图保存在 SQLite 的附件表内。
- **设置**提供个人昵称、邮箱、数据说明、退出登录及输入密码删除账号。密码使用随机盐和 scrypt 派生值保存，登录使用 HttpOnly 会话 cookie。数据库按账号检查工作空间和附件访问权限。持有本机数据库文件或 Docker 管理权限的人仍能读取本机数据，备份请放在自己控制的目录。
- 当前没有小程序、跨设备同步、招聘平台授权、Dot personal agent、自动投递、消息发送或邮箱找回密码服务。

## 停止、更新与日志

```powershell
docker compose stop
docker compose start
docker compose logs --tail=80 app
```

移除容器与网络可运行 `docker compose down`。再次运行 `docker compose up -d --wait` 即可使用原有宿主机数据。

更新前先完成下方备份，再在工作目录运行：

```powershell
git pull --ff-only
docker compose up -d --build --wait
```

应用不记录请求正文、个人资料或密钥。日志可见启动信息和运行时提示。排查配置时使用 `docker compose config --quiet`。

## 数据位置、备份与恢复

默认数据库是项目下的 `data/workspace.sqlite`。账号、会话、岗位、历史、通用笔记、专属笔记、资料信息和文件字节都在同一数据库中。运行期间还可能有 `workspace.sqlite-wal` 和 `workspace.sqlite-shm`。挂载目标为 `/var/lib/waymark`。停止、替换容器或更新镜像会继续使用同一宿主机目录。私有配置独立存放在 `private/backend.env`。

以下 PowerShell 操作针对默认目录。在同一个终端中执行，备份时停掉所有访问该数据库的服务（包括本地开发进程）：

```powershell
docker compose stop
$backupDir = Join-Path $env:USERPROFILE ("Waymark-Backups/" + (Get-Date -Format "yyyyMMdd-HHmmss"))
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
Copy-Item -LiteralPath ./data -Destination $backupDir -Recurse -ErrorAction Stop
Get-ChildItem (Join-Path $backupDir "data") -Name
docker compose start
```

备份包含个人资料和登录会话。密钥配置单独保管。以下恢复方式将备份复制到**新目录**，保留现有数据，适合先检查恢复结果。把第一行改成实际备份路径：

```powershell
$backupDir = Read-Host "输入要恢复的备份目录（其中应有 data 子目录）"
$restoreDir = Join-Path $env:LOCALAPPDATA ("Waymark-Restored/" + (Get-Date -Format "yyyyMMdd-HHmmss"))
if (-not (Test-Path (Join-Path $backupDir "data/workspace.sqlite"))) { throw "未找到备份数据库" }
New-Item -ItemType Directory -Path $restoreDir -ErrorAction Stop | Out-Null
Copy-Item -LiteralPath (Join-Path $backupDir "data") -Destination $restoreDir -Recurse -ErrorAction Stop
$env:WAYMARK_DATA_DIR = (Join-Path $restoreDir "data")
docker compose up -d --force-recreate --wait
```

登录并核对岗位、笔记，下载一个附件检查。要长期使用恢复目录，请在项目根目录的本机 `.env` 设置 `WAYMARK_DATA_DIR=C:/实际路径/data`（Windows 路径使用正斜杠）。该变量也能指定其他本机存储位置。更换设备或移动仓库时，需手动复制数据和私有配置。

应用内永久删除、移除宿主机数据目录或用旧库覆盖当前库都会造成数据丢失。只备份 SQLite 主文件可能遗漏尚在 WAL 中的写入。长期备份和私有配置勿放入 Git 或公开网盘。

## 开发模式

需要 Node.js 24.14 或更高的 24.x 版本。Docker 用户无需安装 Node.js。为避免两个实例跨环境同时写同一数据库，先停止 Docker 容器，或为开发服务指定独立目录：

```powershell
$env:WAYMARK_DATA = Join-Path $env:LOCALAPPDATA "Waymark-dev/data"
npm ci
npm run dev
```

开发地址为 [本机开发工作台](http://127.0.0.1:5173)。`npm run build` 执行 TypeScript 检查与前端构建，`npm start` 使用构建产物运行同源服务。前端按 app、features、components、domain、services 和 styles 目录组织，主题样式位于 `src/styles/theme/`，品牌资源位于 `public/brand/`，后端在 `server/`。主题与维护规范记录在 `agent.md` 与 `claude.md`。前后端通过 JSON 接口交换带版本号的工作空间，岗位更新与新增附件使用同一 SQLite 事务提交。
