![MCTool-Plugin](https://socialify.git.ci/A1Panda/mcsmanager-plugin/image?description=1&font=Raleway&forks=1&issues=1&language=1&name=1&owner=1&pattern=Circuit%20Board&pulls=1&stargazers=1&theme=Auto)

<div align="center">
  <h1>🎮 MCSManager 管理插件</h1>
  
  <p>基于 Yunzai-Bot v3 的 Minecraft 服务器管理插件，提供强大的 MCSManager 管理功能</p>

  <p align="center">
    <a href="https://github.com/A1Panda/mcsmanager-plugin/blob/main/LICENSE">
      <img src="https://img.shields.io/github/license/A1Panda/mcsmanager-plugin?color=blue" alt="license">
    </a>
    <a href="https://github.com/A1Panda/mcsmanager-plugin/issues">
      <img src="https://img.shields.io/github/issues/A1Panda/mcsmanager-plugin?color=blue" alt="issues">
    </a>
    <a href="https://github.com/A1Panda/mcsmanager-plugin/stargazers">
      <img src="https://img.shields.io/github/stars/A1Panda/mcsmanager-plugin?color=blue" alt="stars">
    </a>
    <img src="https://img.shields.io/badge/Node.js-18.0.0+-blue" alt="node">
  </p>
</div>

## ✨ 功能特点

- 🛠️ 完整的 MCSManager 管理功能
- 🔐 安全的权限管理系统
- 🖥️ 多实例管理支持
- 📊 实时状态监控
- 🔄 便捷的命令执行
- 📁 文件管理与下载
- 👥 用户权限管理
- 🌐 多节点管理支持

## 📦 安装方法

<details>
<summary>展开查看安装步骤</summary>

1. 在 Yunzai-Bot 根目录下执行：

```bash
# 使用 Github
git clone https://github.com/A1Panda/mcsmanager-plugin.git ./plugins/mctool-plugin/

# 或使用 Gitee
git clone https://gitee.com/A1Panda/mcsmanager-plugin.git ./plugins/mctool-plugin/
```

2. 安装依赖：
```bash
cd ./plugins/mctool-plugin
pnpm install
```

3. 重启 Yunzai-Bot 

</details>

## 📖 功能指令

### 🔧 基础配置
| 指令 | 说明 |
|------|------|
| `#mcs绑定 <URL> <Api_key>` | 绑定 MCSManager 服务器 |
| `#mcs解绑` | 解除绑定 |
| `#mcs绑定信息` | 查看账号绑定信息 |
| `#mcs概览` | 查看所有面板信息 |

### 💻 实例管理
| 指令 | 说明 |
|------|------|
| `#mcs同步实例` | 更新管理的实例 |
| `#mcs实例列表` | 查看所有实例 |
| `#mcs实例信息 <ID> [页码]` | 查看指定实例详情 |
| `#mcs启动 <ID>` | 启动实例 |
| `#mcs停止 <ID>` | 停止实例 |
| `#mcs重启 <ID>` | 重启实例 |
| `#mcs强制结束 <ID>` | 强制结束实例 |

### ⌨️ 命令与日志
| 指令 | 说明 |
|------|------|
| `#mcs命令 <ID>` | 向实例发送命令 |
| `#mcs日志 <ID> <数据量KB>` | 查看实例日志 |

### 👥 用户管理
| 指令 | 说明 |
|------|------|
| `#mcs用户列表 [页码]` | 查看用户列表 |
| `#mcs创建用户 <ID> <密码> <权限等级>` | 创建新用户 |
| `#mcs删除用户 <ID>` | 删除用户 |
| `#mcs修改权限 <ID>` | 修改用户权限 |
| `#mcs重置密码 <ID>` | 重置用户密码 |

### 🌐 节点管理
| 指令 | 说明 |
|------|------|
| `#mcs节点列表` | 查看所有节点 |
| `#mcs添加节点 <IP> <端口> <API密钥> [备注]` | 添加新节点 |
| `#mcs删除节点 <ID>` | 删除节点 |
| `#mcs连接节点 <ID>` | 连接指定节点 |

### 📁 文件管理
| 指令 | 说明 |
|------|------|
| `#mcs文件列表 <实例ID> [页码] [路径]` | 查看实例文件列表 |
| `#mcs下载文件 <实例ID> <文件路径>` | 下载指定文件 |

## ⚠️ 注意事项

1. MCManager 相关功能必须使用管理账户的 API Key
2. 管理账户需要单独设置授权管理的实例
3. 请妥善保管 API Key，避免泄露
4. 请勿滥用管理账户，避免造成不必要的麻烦
5. 如有问题欢迎提交 Issue

## 🤝 支持与交流

- 💬 QQ交流群: [511802473](https://qm.qq.com/cgi-bin/qm/qr?k=6ZEMTIUuCLNrb-w_kl9YhLxYr33jg_Dk&jump_from=webapi&authKey=qSeeSA/4DY8gbMFaKBaTkHc3Jdj+LXMTTiesNWjWiS9iesQ7ohown421XaIA5dXS)
- 🐛 问题反馈: [Issues](https://github.com/A1Panda/mcsmanager-plugin/issues)
- 📝 功能建议: [Discussions](https://github.com/A1Panda/mcsmanager-plugin/discussions)

## 🔗 相关推荐

如果你在寻找更多 Minecraft 服务器管理工具，不妨试试我们的 [MCTool](https://github.com/Dnyo666/mctool-plugin) 插件。它提供了以下功能:

- 📊 服务器状态查询
- 👥 玩家列表查看
- 📱 基岩版服务器管理
- 🎮 RCON 远程控制
- 🎯 服务器 Motd 获取
- ⚙️ 内置MCSManager管理

MCTool 插件与本插件功能互补，可以让你的 Minecraft 服务器管理更加得心应手。

## 📄 开源许可

本项目采用 [GPL-3.0](./LICENSE) 许可证。

---

<div align="center">
  <p>如果觉得此插件对你有帮助，欢迎点个 ⭐ Star</p>
  <p>你的支持是我们持续更新的动力！</p>
  
  <img src="https://img.shields.io/badge/Made%20with-❤️-blue" alt="made with love">
</div>