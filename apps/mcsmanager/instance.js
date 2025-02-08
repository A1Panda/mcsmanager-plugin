import plugin from '../../../../lib/plugins/plugin.js'
import McsInstanceApp from '../../models/mcsmanager/app/instance.js'
import template from 'art-template'
import path from 'path'
import puppeteer from 'puppeteer'
import fs from 'fs'

// #mcs list [页码] - 查看实例列表
// #mcs info <实例ID> - 查看实例详情
// #mcs start <实例ID> - 启动实例
// #mcs stop <实例ID> - 停止实例
// #mcs restart <实例ID> - 重启实例
// #mcs kill <实例ID> - 强制结束实例
// #mcs cmd <实例ID> <命令> - 发送命令
// #mcs log <实例ID> - 查看日志

export class MCSManagerInstance extends plugin {
  // 静态属性存储确认信息
  static confirmations = new Map()

  constructor() {
    super({
      name: 'MCSManager-实例管理',
      dsc: 'MCSManager 实例管理指令',
      event: 'message',
      priority: 5000,
      rule: [
        {
          reg: '^#?(mcs|MCS)\\s*(实例列表|list)\\s*([0-9]*)?$',
          fnc: 'listInstances'
        },
        {
          reg: '^#?(mcs|MCS)\\s*(实例信息|info)\\s*([a-zA-Z0-9]+)$',
          fnc: 'instanceInfo'
        },
        {
          reg: '^#?(mcs|MCS)\\s*(启动|start)\\s*([a-zA-Z0-9]+)$',
          fnc: 'startInstance'
        },
        {
          reg: '^#?(mcs|MCS)\\s*(停止|stop)\\s*([a-zA-Z0-9]+)$',
          fnc: 'stopInstance'
        },
        {
          reg: '^#?(mcs|MCS)\\s*(重启|restart)\\s*([a-zA-Z0-9]+)$',
          fnc: 'restartInstance'
        },
        {
          reg: '^#?(mcs|MCS)\\s*(强制结束|kill)\\s*([a-zA-Z0-9]+)$',
          fnc: 'killInstance'
        },
        {
          reg: '^#?(mcs|MCS)\\s*(日志|log)\\s*([a-zA-Z0-9]+)\\s*(\\d+)?$',
          fnc: 'viewLog'
        },
        {
          reg: '^#?(mcs|MCS)\\s*(命令|cmd)\\s*([a-zA-Z0-9]+)\\s*(.+)$',
          fnc: 'sendCommand'
        }
      ]
    })
    this.instanceApp = new McsInstanceApp()
  }

  /**
   * 生成确认ID
   * @private
   * @param {string} userId 用户ID
   * @param {string} groupId 群ID
   * @returns {string} 确认ID
   */
  getConfirmKey(userId, groupId) {
    return `${userId}:${groupId}`
  }

  /**
   * 解析实例ID
   * @param {string} idOrIndex 实例ID或序号
   * @returns {Object} 解析结果
   */
  async parseInstanceId(e, idOrIndex) {
    // 如果是纯数字，认为是序号
    if (/^\d+$/.test(idOrIndex)) {
      const index = parseInt(idOrIndex);
      return await this.instanceApp.getInstanceUuidByIndex(e.user_id, index);
    }
    // 否则认为是UUID
    return idOrIndex;
  }

  /**
   * 解析实例命令
   * @param {string} msg 消息内容
   * @param {string} cmd 命令类型
   * @returns {Object|null} 解析结果
   */
  async parseInstanceCommand(e, msg, cmd) {
    const match = new RegExp(`^#?(mcs|MCS)\\s*(${cmd})\\s*([a-zA-Z0-9]+)$`).exec(msg)
    if (!match) return null
    
    // 解析实例ID或序号
    const uuid = await this.parseInstanceId(e, match[3])
    return { uuid }
  }

  async listInstances(e) {
    if (!e.msg) {
      await e.reply('MCS实例列表帮助：\n命令格式：#mcs list [页码]\n例如：#mcs list 1')
      return true
    }

    try {
      const pageNum = parseInt(e.msg.match(/\d+/)?.[0] || '1')
      const result = await this.instanceApp.getInstanceList(e.user_id, {
        page: pageNum,
        page_size: 10
      })

      // 渲染HTML
      const html = template(path.join(process.cwd(), './plugins/mcsmanager-plugin/resources/mcsmanager/html/instancelist.html'), result)
      
      // 启动浏览器
      const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      })
      
      // 创建新页面
      const browserPage = await browser.newPage()
      
      // 设置视口
      await browserPage.setViewport({
        width: 860,
        height: 1000
      })
      
      // 加载HTML内容
      await browserPage.setContent(html)
      
      // 等待内容渲染完成
      await browserPage.waitForSelector('.container')
      
      // 获取实际内容高度
      const bodyHandle = await browserPage.$('body')
      const { height } = await bodyHandle.boundingBox()
      await bodyHandle.dispose()
      
      // 调整视口高度
      await browserPage.setViewport({
        width: 860,
        height: Math.ceil(height)
      })
      
      // 确保目录存在
      const imgPath = path.join(process.cwd(), 'plugins/mcsmanager-plugin/resources/mcsmanager/temp')
      if (!fs.existsSync(imgPath)) {
        fs.mkdirSync(imgPath, { recursive: true })
      }
      
      // 生成文件名
      const fileName = `instance_list_${Date.now()}.jpg`
      const filePath = path.join(imgPath, fileName)
      
      // 截图并保存
      await browserPage.screenshot({
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
          if (err) logger.error(`[MCS Instance] 删除临时文件失败:`, err)
        })
      }, 5000)

      return true
    } catch (error) {
      let message = '获取实例列表失败'
      
      // 处理常见错误
      if (error.message.includes('未绑定')) {
        message = '请先使用 #mcs bind 命令绑定面板'
      } else if (error.message.includes('权限')) {
        message = '没有权限查看实例列表'
      } else {
        message = `获取实例列表失败：${error.message}`
      }

      await e.reply(message)
      return false
    }
  }

  async instanceInfo(e) {
    if (!e.msg) {
      await e.reply('MCS实例信息帮助：\n命令格式：#mcs info <实例ID>\n例如：#mcs info abc123def456')
      return true
    }

    try {
      const params = await this.parseInstanceCommand(e, e.msg, '实例信息|info')
      if (!params) {
        await e.reply('格式错误！\n命令格式：#mcs info <实例ID>\n例如：#mcs info abc123def456')
        return false
      }

      const result = await this.instanceApp.getInstanceInfo(e.user_id, params.uuid)
      
      // 格式化实例信息
      const formattedInstance = {
        ...result.instance,
        config: {
          ...result.instance.config,
          createTime: result.instance.config.createTime ? 
            new Date(result.instance.config.createTime).toLocaleString() : '未知'
        }
      }
      
      // 渲染HTML
      const html = template(path.join(process.cwd(), './plugins/mcsmanager-plugin/resources/mcsmanager/html/instanceinfo.html'), {
        instance: formattedInstance
      })
      
      // 启动浏览器
      const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      })
      
      // 创建新页面
      const browserPage = await browser.newPage()
      
      // 设置视口
      await browserPage.setViewport({
        width: 860,
        height: 1000
      })
      
      // 加载HTML内容
      await browserPage.setContent(html)
      
      // 等待内容渲染完成
      await browserPage.waitForSelector('.container')
      
      // 获取实际内容高度
      const bodyHandle = await browserPage.$('body')
      const { height } = await bodyHandle.boundingBox()
      await bodyHandle.dispose()
      
      // 调整视口高度
      await browserPage.setViewport({
        width: 860,
        height: Math.ceil(height)
      })
      
      // 确保目录存在
      const imgPath = path.join(process.cwd(), 'plugins/mcsmanager-plugin/resources/mcsmanager/temp')
      if (!fs.existsSync(imgPath)) {
        fs.mkdirSync(imgPath, { recursive: true })
      }
      
      // 生成文件名
      const fileName = `instance_info_${Date.now()}.jpg`
      const filePath = path.join(imgPath, fileName)
      
      // 截图并保存
      await browserPage.screenshot({
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
          if (err) logger.error(`[MCS Instance] 删除临时文件失败:`, err)
        })
      }, 5000)

      return true
    } catch (error) {
      await e.reply(`获取实例信息失败：${error.message}`)
      return false
    }
  }

  /**
   * 等待并获取实例日志
   * @private
   * @param {*} e 消息对象
   * @param {Object} instance 实例信息
   * @param {string} uuid 实例UUID
   * @param {number} waitTime 等待时间(ms)
   */
  async waitAndGetLog(e, instance, uuid, waitTime = 3000) {
    // 等待指定时间
    await new Promise(resolve => setTimeout(resolve, waitTime))

    // 获取最新日志
    const logResult = await this.instanceApp.getInstanceLog(e.user_id, uuid, 1000)

    // 渲染HTML
    const html = template(path.join(process.cwd(), './plugins/mcsmanager-plugin/resources/mcsmanager/html/loginfo.html'), {
      instance: instance,
      size: 1000,
      log: logResult.log
    })
    
    // 启动浏览器
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })
    
    // 创建新页面
    const browserPage = await browser.newPage()
    
    // 设置视口
    await browserPage.setViewport({
      width: 860,
      height: 1000
    })
    
    // 加载HTML内容
    await browserPage.setContent(html)
    
    // 等待内容渲染完成
    await browserPage.waitForSelector('.container')
    
    // 获取实际内容高度
    const bodyHandle = await browserPage.$('body')
    const { height } = await bodyHandle.boundingBox()
    await bodyHandle.dispose()
    
    // 调整视口高度
    await browserPage.setViewport({
      width: 860,
      height: Math.ceil(height)
    })
    
    // 确保目录存在
    const imgPath = path.join(process.cwd(), 'plugins/mcsmanager-plugin/resources/mcsmanager/temp')
    if (!fs.existsSync(imgPath)) {
      fs.mkdirSync(imgPath, { recursive: true })
    }
    
    // 生成文件名
    const fileName = `instance_log_${Date.now()}.jpg`
    const filePath = path.join(imgPath, fileName)
    
    // 截图并保存
    await browserPage.screenshot({
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
        if (err) logger.error(`[MCS Instance] 删除临时文件失败:`, err)
      })
    }, 5000)
  }

  /**
   * 启动实例
   */
  async startInstance(e) {
    if (!e.msg) {
      await e.reply('MCS启动实例帮助：\n命令格式：#mcs start <实例ID>\n例如：#mcs start abc123def456')
      return true
    }

    try {
      const params = await this.parseInstanceCommand(e, e.msg, '启动|start')
      if (!params) {
        await e.reply('格式错误！\n命令格式：#mcs start <实例ID>\n例如：#mcs start abc123def456')
        return false
      }

      // 先获取实例状态
      const info = await this.instanceApp.getInstanceInfo(e.user_id, params.uuid)
      const inst = info.instance

      // 检查实例状态
      if (inst.status === 3) {  // 运行中
        await e.reply(`实例 ${inst.config.name} 已经在运行中`)
        return false
      }

      if (inst.status === 2) {  // 启动中
        await e.reply(`实例 ${inst.config.name} 正在启动中`)
        return false
      }

      const result = await this.instanceApp.instanceOperation(e.user_id, params.uuid, 'open')
      await e.reply(`实例 ${inst.config.name} 启动指令已发送，正在等待启动...`)
      
      // 等待并获取日志（启动需要更长时间）
      await this.waitAndGetLog(e, inst, params.uuid, 5000)
      return true
    } catch (error) {
      // 处理特定错误消息
      if (error.message.includes('未处于关闭状态')) {
        await e.reply('实例当前状态无法启动，请先确认实例状态')
      } else {
        await e.reply(`启动实例失败：${error.message}`)
      }
      return false
    }
  }

  /**
   * 停止实例
   */
  async stopInstance(e) {
    if (!e.msg) {
      await e.reply('MCS停止实例帮助：\n命令格式：#mcs stop <实例ID>\n例如：#mcs stop abc123def456')
      return true
    }

    try {
      const params = await this.parseInstanceCommand(e, e.msg, '停止|stop')
      if (!params) {
        await e.reply('格式错误！\n命令格式：#mcs stop <实例ID>\n例如：#mcs stop abc123def456')
        return false
      }

      // 先获取实例状态
      const info = await this.instanceApp.getInstanceInfo(e.user_id, params.uuid)
      const inst = info.instance

      // 检查实例状态
      if (inst.status === 0) {  // 已停止
        await e.reply(`实例 ${inst.config.name} 已经停止运行`)
        return false
      }

      if (inst.status === 1) {  // 停止中
        await e.reply(`实例 ${inst.config.name} 正在停止中`)
        return false
      }

      const result = await this.instanceApp.instanceOperation(e.user_id, params.uuid, 'stop')
      await e.reply(`实例 ${inst.config.name} 停止指令已发送，正在等待停止...`)
      
      // 等待并获取日志
      await this.waitAndGetLog(e, inst, params.uuid)
      return true
    } catch (error) {
      await e.reply(`停止实例失败：${error.message}`)
      return false
    }
  }

  /**
   * 重启实例
   */
  async restartInstance(e) {
    if (!e.msg) {
      await e.reply('MCS重启实例帮助：\n命令格式：#mcs restart <实例ID>\n例如：#mcs restart abc123def456')
      return true
    }

    try {
      const params = await this.parseInstanceCommand(e, e.msg, '重启|restart')
      if (!params) {
        await e.reply('格式错误！\n命令格式：#mcs restart <实例ID>\n例如：#mcs restart abc123def456')
        return false
      }

      // 先获取实例状态
      const info = await this.instanceApp.getInstanceInfo(e.user_id, params.uuid)
      const inst = info.instance

      // 检查实例状态
      if (inst.status === 1 || inst.status === 2) {  // 停止中或启动中
        await e.reply(`实例 ${inst.config.name} 正在执行其他操作，请稍后再试`)
        return false
      }

      if (inst.status === -1) {  // 忙碌
        await e.reply(`实例 ${inst.config.name} 当前处于忙碌状态，请稍后再试`)
        return false
      }

      const result = await this.instanceApp.instanceOperation(e.user_id, params.uuid, 'restart')
      await e.reply(`实例 ${inst.config.name} 重启指令已发送，正在等待重启...`)
      
      // 等待并获取日志（重启需要更长时间）
      await this.waitAndGetLog(e, inst, params.uuid, 8000)
      return true
    } catch (error) {
      // 处理特定错误消息
      if (error.message.includes('实例未处于运行状态')) {
        await e.reply('实例当前未运行，无法重启')
      } else {
        await e.reply(`重启实例失败：${error.message}`)
      }
      return false
    }
  }

  /**
   * 强制结束实例
   */
  async killInstance(e) {
    if (!e.msg) {
      await e.reply('MCS强制结束实例帮助：\n命令格式：#mcs kill <实例ID>\n例如：#mcs kill abc123def456')
      return true
    }

    try {
      const params = await this.parseInstanceCommand(e, e.msg, '强制结束|kill')
      if (!params) {
        await e.reply('格式错误！\n命令格式：#mcs kill <实例ID>\n例如：#mcs kill abc123def456')
        return false
      }

      // 先获取实例状态
      const info = await this.instanceApp.getInstanceInfo(e.user_id, params.uuid)
      const inst = info.instance

      // 检查实例状态
      if (inst.status === 0) {  // 已停止
        await e.reply(`实例 ${inst.config.name} 已经停止运行`)
        return false
      }

      if (inst.status === -1) {  // 忙碌
        await e.reply(`实例 ${inst.config.name} 当前处于忙碌状态，请稍后再试`)
        return false
      }

      // 发送确认提示
      await e.reply(`警告：强制结束可能导致数据丢失！\n确定要强制结束实例 ${inst.config.name} 吗？\n请回复"确定"继续操作，或回复其他内容取消`)

      // 保存确认信息
      const key = this.getConfirmKey(e.user_id, e.group_id)
      MCSManagerInstance.confirmations.set(key, {
        uuid: params.uuid,
        name: inst.config.name,
        time: Date.now()
      })

      // 设置30秒后清理
      setTimeout(async () => {
        const confirm = MCSManagerInstance.confirmations.get(key)
        if (confirm) {
          MCSManagerInstance.confirmations.delete(key)
          // 发送超时提示
          await this.reply(`实例 ${confirm.name} 的强制结束操作已超时取消`)
        }
      }, 30000)

      // 发送命令
      const result = await this.instanceApp.instanceOperation(e.user_id, confirm.uuid, 'kill')
      await e.reply(`实例 ${confirm.name} 强制结束指令已发送，正在等待结果...`)
      
      // 等待并获取日志
      await this.waitAndGetLog(e, inst, confirm.uuid)
      return true
    } catch (error) {
      await e.reply(`强制结束实例失败：${error.message}`)
      return false
    }
  }

  /**
   * 处理所有消息
   */
  async accept(e) {
    // 检查是否存在待确认的操作
    const key = this.getConfirmKey(e.user_id, e.group_id)
    const confirm = MCSManagerInstance.confirmations.get(key)
    
    if (confirm) {
      // 清理确认信息
      MCSManagerInstance.confirmations.delete(key)

      // 检查是否是确认消息
      if (e.msg === '确定') {
        try {
          const result = await this.instanceApp.instanceOperation(e.user_id, confirm.uuid, 'kill')
          await e.reply(`实例 ${confirm.name} 强制结束指令已发送`)
        } catch (error) {
          await e.reply(`强制结束实例失败：${error.message}`)
        }
        return true
      } else {
        // 其他回复都视为取消
        await e.reply('操作已取消')
        return true
      }
    }

    // 其他消息交给原有规则处理
    return
  }

  /**
   * 查看实例日志
   */
  async viewLog(e) {
    if (!e.msg) {
      await e.reply([
        'MCS查看日志帮助：',
        '命令格式：#mcs log <实例ID/序号> [日志大小]',
        '参数说明：',
        '  实例ID/序号: 必填，实例的唯一标识或列表中的序号(1-N)',
        '  日志大小: 可选，获取的日志大小(KB)，范围1~2048，默认1000KB',
        '示例：',
        '  #mcs log 1 500      - 使用序号',
        '  #mcs log abc123 200 - 使用实例ID'
      ].join('\n'))
      return true
    }

    try {
      const match = /^#?(mcs|MCS)\s*(日志|log)\s*([a-zA-Z0-9]+)\s*(\d+)?$/.exec(e.msg)
      if (!match) {
        await e.reply('格式错误！请使用 #mcs log 查看帮助信息')
        return false
      }

      // 解析实例ID或序号
      const uuid = await this.parseInstanceId(e, match[3])
      const size = parseInt(match[4]) || 1000

      // 调用实例应用层获取日志
      const result = await this.instanceApp.getInstanceLog(e.user_id, uuid, size)
      
      // 渲染HTML
      const html = template(path.join(process.cwd(), './plugins/mcsmanager-plugin/resources/mcsmanager/html/loginfo.html'), result)
      
      // 启动浏览器
      const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      })
      
      // 创建新页面
      const browserPage = await browser.newPage()
      
      // 设置视口
      await browserPage.setViewport({
        width: 860,
        height: 1000
      })
      
      // 加载HTML内容
      await browserPage.setContent(html)
      
      // 等待内容渲染完成
      await browserPage.waitForSelector('.container')
      
      // 获取实际内容高度
      const bodyHandle = await browserPage.$('body')
      const { height } = await bodyHandle.boundingBox()
      await bodyHandle.dispose()
      
      // 调整视口高度
      await browserPage.setViewport({
        width: 860,
        height: Math.ceil(height)
      })
      
      // 确保目录存在
      const imgPath = path.join(process.cwd(), 'plugins/mcsmanager-plugin/resources/mcsmanager/temp')
      if (!fs.existsSync(imgPath)) {
        fs.mkdirSync(imgPath, { recursive: true })
      }
      
      // 生成文件名
      const fileName = `instance_log_${Date.now()}.jpg`
      const filePath = path.join(imgPath, fileName)
      
      // 截图并保存
      await browserPage.screenshot({
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
          if (err) logger.error(`[MCS Instance] 删除临时文件失败:`, err)
        })
      }, 5000)

      return true
    } catch (error) {
      let message = '获取日志失败'
      
      // 处理常见错误
      if (error.message.includes('未绑定')) {
        message = '请先使用 #mcs bind 命令绑定面板'
      } else if (error.message.includes('未找到')) {
        message = '未找到该实例，请检查实例ID或序号是否正确'
      } else if (error.message.includes('权限')) {
        message = '没有权限查看该实例的日志'
      } else {
        message = `获取日志失败：${error.message}`
      }

      await e.reply(message)
      return false
    }
  }

  /**
   * 发送实例命令
   */
  async sendCommand(e) {
    if (!e.msg) {
      await e.reply([
        'MCS发送命令帮助：',
        '命令格式：#mcs cmd <实例ID/序号> <命令内容>',
        '参数说明：',
        '  实例ID/序号: 必填，实例的唯一标识或列表中的序号(1-N)',
        '  命令内容: 必填，要执行的命令',
        '示例：',
        '  #mcs cmd 1 say Hello     - 使用序号',
        '  #mcs cmd abc123 list     - 使用实例ID'
      ].join('\n'))
      return true
    }

    try {
      const match = /^#?(mcs|MCS)\s*(命令|cmd)\s*([a-zA-Z0-9]+)\s*(.+)$/.exec(e.msg)
      if (!match) {
        await e.reply('格式错误！请使用 #mcs cmd 查看帮助信息')
        return false
      }

      // 解析实例ID或序号
      const uuid = await this.parseInstanceId(e, match[3])
      const command = match[4].trim()

      // 先获取实例信息
      const info = await this.instanceApp.getInstanceInfo(e.user_id, uuid)
      const inst = info.instance

      // 检查实例状态
      if (inst.status !== 3) {  // 不是运行中
        await e.reply(`实例 ${inst.config.name} 未在运行，无法发送命令`)
        return false
      }

      // 发送命令
      const result = await this.instanceApp.sendCommand(e.user_id, uuid, command)
      
      await e.reply([
        `命令已发送至实例 ${inst.config.name}：`,
        command,
        '正在等待执行结果...'
      ].join('\n'))

      // 等待并获取日志
      await this.waitAndGetLog(e, inst, uuid)

      return true

    } catch (error) {
      let message = '发送命令失败'
      
      // 处理常见错误
      if (error.message.includes('未绑定')) {
        message = '请先使用 #mcs bind 命令绑定面板'
      } else if (error.message.includes('未找到')) {
        message = '未找到该实例，请检查实例ID是否正确'
      } else if (error.message.includes('权限')) {
        message = '没有权限操作该实例'
      } else if (error.message.includes('未运行')) {
        message = '实例未在运行，无法发送命令'
      } else {
        message = `发送命令失败：${error.message}`
      }

      await e.reply(message)
      return false
    }
  }

  // ... 其他命令处理方法类似，这里省略 ...
} 