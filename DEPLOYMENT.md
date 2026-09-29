# 部署说明

当前生产服务部署于阿里云 ECS：`/opt/nuomanhunli`，systemd 服务名 `nuomanhunli`，Node.js 24.20.0 位于 `/opt/nuoman-node/bin/node`。网站仅监听 `127.0.0.1:4188`，由 Nginx 转发；正式地址为 <https://nuomanhunli.cn>，HTTP 自动跳转 HTTPS。

## 更新网站

1. 通过已授权的阿里云 Workbench 连接目标 ECS。不要把登录凭据放进命令行或文档。
2. 备份线上代码与业务数据，记录备份位置；线上 `data/` 是持久业务资料，更新代码时不得覆盖或用本地旧数据替换。
3. 将本次代码文件同步到 `/opt/nuomanhunli`，保留线上环境配置和 `data/`。
4. 如依赖有变更，在项目目录执行 `npm ci`。
5. 检查服务环境文件 `/opt/nuomanhunli/.codex/.env` 已由受控流程配置必需变量；禁止将该文件复制到代码仓库或日志。
6. 重启 `nuomanhunli` systemd 服务，确认服务运行且监听 `127.0.0.1:4188`。
7. 查看服务和 Nginx 状态，检查 HTTPS 首页、案例访问权限、管理员登录及客服留言权限。
8. 可运行只读/拒绝路径检查：`env -C /opt/nuomanhunli /opt/nuoman-node/bin/node scripts/check-deployment.js`。

管理员密码仅通过 `NUOMANHUNLI_API_KEY` 配置；生产值必须至少 12 位且不能为默认密码。SMTP、飞书等可选功能按 [维护说明.md](./维护说明.md) 的权限要求配置。任何凭据值均不得写入代码、命令参数、日志或文档。

## 微信小程序

客户展示端和管理员端源码分别位于 `miniprogram-showcase/` 与 `miniprogram-admin/`。两端需使用各自获批的 AppID；管理员端未确认独立 AppID 前，不得上传到客户展示端账号。使用 `node scripts/prepare-release.js https://nuomanhunli.cn 客户端AppID 管理端AppID` 生成发布包，然后用微信开发者工具分别编译、真机验证、上传并按平台流程审核发布。不要提交工程私有配置或发布包。

更多线上状态和检查记录见 [上线状态.md](./上线状态.md)。
