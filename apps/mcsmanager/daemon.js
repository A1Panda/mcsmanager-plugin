import plugin from '../../../../lib/plugins/plugin.js'
import McsDaemonApp from '../../models/mcsmanager/app/daemon.js'
import puppeteer from 'puppeteer'
import template from 'art-template'
import path from 'path'
import fs from 'fs'

export class MCSManagerDaemon extends plugin {
  constructor() {
    super({
      name: 'MCSManager-守护进程',
      dsc: 'MCSManager 守护进程管理指令',
      event: 'message',
      priority: 5000,
      rule: [
        {
          reg: '^#?(mcs|MCS)\\s*(添加节点|add-node)(?:\\s+([\\s\\S]+))?$',
          fnc: 'addNode'
        },
        {
          reg: '^#?(mcs|MCS)\\s*(删除节点|del-node)\\s*([\\d]+)$',
          fnc: 'deleteNode'
        },
        {
          reg: '^#?(mcs|MCS)\\s*(连接节点|link-node)\\s*([\\d]+)$',
          fnc: 'linkNode'
        },
        {
          reg: '^#?(mcs|MCS)\\s*(节点列表|nodes)$',
          fnc: 'listNodes'
        }
      ]
    })
    this.daemon = new McsDaemonApp()
  }

  /**
   * 添加守护进程节点
   */
  async addNode(e) {
    if (!e.msg || /^#?(mcs|MCS)\s*(添加节点|add-node)$/.test(e.msg)) {
      await e.reply([
        'MCS添加节点帮助：',
        '命令格式：#mcs add-node <IP> <端口> <API密钥> [备注]',
        '参数说明：',
        '  IP: 必填，节点IP地址',
        '  端口: 必填，节点端口',
        '  API密钥: 必填，节点API密钥',
        '  备注: 可选，节点备注',
        '示例：',
        '  #mcs add-node 10.0.0.16 24446 abc123def456 树莓派'
      ].join('\n'));
      return true;
    }

    try {
      const match = /^#?(mcs|MCS)\s*(添加节点|add-node)\s*(\S+)\s*(\d+)\s*(\S+)(?:\s*(.+))?$/.exec(e.msg);
      if (!match) {
        await e.reply('格式错误！请使用 #mcs add-node 查看帮助信息');
        return false;
      }

      const [, , , ip, port, apiKey, remarks] = match;

      // 添加节点
      const result = await this.daemon.addDaemonNode(e.user_id, {
        ip: ip,
        port: parseInt(port),
        apiKey: apiKey,
        remarks: remarks || ''
      });

      await e.reply([
        '守护进程节点添加成功！',
        `节点ID: ${result.daemonId}`,
        `IP地址: ${ip}:${port}`,
        remarks ? `备注: ${remarks}` : ''
      ].filter(Boolean).join('\n'));

      return true;

    } catch (error) {
      let message = '添加节点失败';
      
      if (error.message.includes('未绑定')) {
        message = '请先使用 #mcs bind 命令绑定面板';
      } else if (error.message.includes('权限')) {
        message = '没有权限添加节点';
      } else {
        message = `添加节点失败：${error.message}`;
      }

      await e.reply(message);
      return false;
    }
  }

  /**
   * 查看节点列表
   */
  async listNodes(e) {
    try {
      const result = await this.daemon.getDaemonList(e.user_id);

      if (result.nodes.length === 0) {
        await e.reply('当前没有守护进程节点');
        return true;
      }

      // 获取数据
      const data = {
        ...result,
        getStatusText: (status) => {
          switch (status) {
            case 0: return '已停止';
            case 1: return '正在启动';
            case 2: return '正在停止';
            case 3: return '运行中';
            default: return '未知';
          }
        },
        getStatusClass: (status) => {
          switch (status) {
            case 0: return 'status-stopped';
            case 1: return 'status-starting';
            case 2: return 'status-stopping';
            case 3: return 'status-running';
            default: return '';
          }
        }
      };

      // 渲染HTML
      const html = template(path.join(process.cwd(), './plugins/mcsmanager-plugin/resources/mcsmanager/html/daemonlist.html'), data)
      
      // 启动浏览器
      const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      })
      
      // 创建新页面
      const page = await browser.newPage()
      
      // 设置视口
      await page.setViewport({
        width: 860,
        height: 1000
      })
      
      // 加载HTML内容
      await page.setContent(html)
      
      // 等待内容渲染完成
      await page.waitForSelector('.container')
      
      // 获取实际内容高度
      const bodyHandle = await page.$('body')
      const { height } = await bodyHandle.boundingBox()
      await bodyHandle.dispose()
      
      // 调整视口高度
      await page.setViewport({
        width: 860,
        height: Math.ceil(height)
      })
      
      // 确保目录存在
      const imgPath = path.join(process.cwd(), 'plugins/mcsmanager-plugin/resources/mcsmanager/temp')
      if (!fs.existsSync(imgPath)) {
        fs.mkdirSync(imgPath, { recursive: true })
      }
      
      // 生成文件名
      const fileName = `daemonlist_${Date.now()}.jpg`
      const filePath = path.join(imgPath, fileName)
      
      // 截图并保存
      await page.screenshot({
        path: filePath,
        fullPage: true,
        quality: 100,
        type: 'jpeg'
      })
      
      // 关闭浏览器
      await browser.close()
      
      // 发送图片
      await e.reply(segment.image(filePath))

      // 延迟删除临时文件
      setTimeout(() => {
        fs.unlink(filePath, (err) => {
          if (err) logger.error(`[MCS Daemon] 删除临时文件失败:`, err)
        })
      }, 5000)

      return true;

    } catch (error) {
      let message = '获取节点列表失败';
      
      if (error.message.includes('未绑定')) {
        message = '请先使用 #mcs bind 命令绑定面板';
      } else {
        message = `获取节点列表失败请联系管理员！`;
      }

      await e.reply(message);
      return false;
    }
  }

  /**
   * 删除守护进程节点
   */
  async deleteNode(e) {
    try {
      // 获取节点列表
      const list = await this.daemon.getDaemonList(e.user_id);
      const index = parseInt(/^#?(mcs|MCS)\s*(删除节点|del-node)\s*(\d+)$/.exec(e.msg)[3]);
      
      if (index < 1 || index > list.nodes.length) {
        await e.reply('节点序号不存在，请使用 #mcs nodes 查看节点列表');
        return false;
      }

      const node = list.nodes[index - 1];
      const result = await this.daemon.deleteDaemonNode(e.user_id, node.daemonId);

      await e.reply([
        '守护进程节点删除成功！',
        `节点名称: ${node.name}`,
        `节点ID: ${node.daemonId}`
      ].join('\n'));

      return true;

    } catch (error) {
      let message = '删除节点失败';
      
      if (error.message.includes('未绑定')) {
        message = '请先使用 #mcs bind 命令绑定面板';
      } else if (error.message.includes('权限')) {
        message = '没有权限删除节点';
      } else {
        message = `删除节点失败：${error.message}`;
      }

      await e.reply(message);
      return false;
    }
  }

  /**
   * 连接守护进程节点
   */
  async linkNode(e) {
    try {
      // 获取节点列表
      const list = await this.daemon.getDaemonList(e.user_id);
      const index = parseInt(/^#?(mcs|MCS)\s*(连接节点|link-node)\s*(\d+)$/.exec(e.msg)[3]);
      
      if (index < 1 || index > list.nodes.length) {
        await e.reply('节点序号不存在，请使用 #mcs nodes 查看节点列表');
        return false;
      }

      const node = list.nodes[index - 1];
      const result = await this.daemon.linkDaemonNode(e.user_id, node.daemonId);

      await e.reply([
        '守护进程节点连接成功！',
        `节点名称: ${node.name}`,
        `节点ID: ${node.daemonId}`
      ].join('\n'));

      return true;

    } catch (error) {
      let message = '连接节点失败';
      
      if (error.message.includes('未绑定')) {
        message = '请先使用 #mcs bind 命令绑定面板';
      } else if (error.message.includes('权限')) {
        message = '没有权限连接节点';
      } else {
        message = `连接节点失败：${error.message}`;
      }

      await e.reply(message);
      return false;
    }
  }
} 