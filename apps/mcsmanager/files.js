import plugin from '../../../../lib/plugins/plugin.js'
import McsFiles from '../../models/mcsmanager/app/files.js'
import puppeteer from 'puppeteer'
import template from 'art-template'
import path from 'path'
import fs from 'fs'

// 创建全局下载锁
if (!global.mcsDownloadLocks) {
  global.mcsDownloadLocks = new Set()
}

export class MCSManagerFiles extends plugin {
  constructor() {
    super({
      name: 'MCSManager-文件',
      dsc: 'MCSManager 文件管理',
      event: 'message',
      priority: 5000,
      rule: [
        {
          reg: '^#?(mcs|MCS)\\s*(文件列表|files)\\s*(\\d+)(?:\\s+(\\d+))?(?:\\s+([^\\s]+))?$',
          fnc: 'listFiles'
        },
        {
          reg: '^#?(mcs|MCS)\\s*(下载文件|download)\\s*(\\d+)\\s+(.+)$',
          fnc: 'downloadFile'
        }
      ]
    })
    this.files = new McsFiles()
  }

  /**
   * 查看文件列表
   */
  async listFiles(e) {
    try {
      // 获取实例序号、页码和路径参数
      const match = e.msg.match(/^#?(mcs|MCS)\s*(文件列表|files)\s*(\d+)(?:\s+(\d+))?(?:\s+([^\\s]+))?$/)
      if (!match) {
        throw new Error('命令格式错误')
      }

      const instanceIndex = match[3]
      const pageNum = match[4] ? parseInt(match[4]) : 1
      const targetPath = match[5] || '/'

      // 获取文件列表
      const result = await this.files.getFileList(e.user_id, instanceIndex, targetPath, pageNum - 1)

      // 渲染数据
      const data = {
        ...result,
        formatSize: (size) => {
          const units = ['B', 'KB', 'MB', 'GB', 'TB']
          let index = 0
          while (size >= 1024 && index < units.length - 1) {
            size /= 1024
            index++
          }
          return `${size.toFixed(2)} ${units[index]}`
        },
        formatTime: (time) => {
          return new Date(time).toLocaleString()
        }
      }

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
      
      // 读取HTML模板
      const htmlPath = path.join(process.cwd(), 'plugins/mcsmanager-plugin/resources/mcsmanager/html/filelist.html')
      const html = fs.readFileSync(htmlPath, 'utf8')
      
      // 渲染模板
      const renderedHtml = template.render(html, data)
      
      // 加载HTML内容
      await browserPage.setContent(renderedHtml)
      
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
      const fileName = `filelist_${Date.now()}.jpg`
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
          if (err) logger.error(`[MCS Files] 删除临时文件失败:`, err)
        })
      }, 5000)

      return true

    } catch (error) {
      let message = '获取文件列表失败'
      
      if (error.message.includes('未绑定')) {
        message = '请先使用 #mcs bind 命令绑定面板'
      } else if (error.message.includes('序号不存在')) {
        message = error.message
      } else if (error.message.includes('命令格式错误')) {
        message = '命令格式：#mcs文件列表 <实例序号> [页码] [路径]'
      } else {
        message = `获取文件列表失败：${error.message}`
      }

      await e.reply(message)
      return false
    }
  }

  /**
   * 下载文件
   */
  async downloadFile(e) {
    let savePath = '';
    try {
      // 获取实例序号和文件路径
      const match = e.msg.match(/^#?(mcs|MCS)\s*(下载文件|download)\s*(\d+)\s+(.+)$/)
      if (!match) {
        throw new Error('命令格式错误')
      }

      const instanceIndex = match[3]
      const filePath = match[4].trim()

      // 生成下载锁的key
      const lockKey = `${instanceIndex}:${filePath}`

      // 检查是否正在下载
      if (global.mcsDownloadLocks.has(lockKey)) {
        throw new Error('文件正在下载中，请等待当前下载完成')
      }

      // 添加下载锁
      global.mcsDownloadLocks.add(lockKey)

      try {
        // 先获取文件信息
        const fileList = await this.files.getFileList(e.user_id, instanceIndex, path.dirname(filePath))
        const fileName = path.basename(filePath)
        const fileInfo = fileList.files.find(f => f.name === fileName)

        // 检查文件是否存在
        if (!fileInfo) {
          throw new Error('文件不存在')
        }

        // 检查是否是文件夹
        if (fileInfo.isDirectory) {
          throw new Error('不能下载文件夹')
        }

        // 检查文件大小
        const MAX_SIZE = 4 * 1024 * 1024 * 1024 // 4GB
        if (fileInfo.size > MAX_SIZE) {
          const sizeGB = (fileInfo.size / 1024 / 1024 / 1024).toFixed(2)
          throw new Error(`文件大小(${sizeGB}GB)超过4GB限制，无法下载`)
        }

        // 确保目录存在
        const downloadPath = path.join(process.cwd(), 'plugins/mcsmanager-plugin/resources/mcsmanager/downloads')
        if (!fs.existsSync(downloadPath)) {
          fs.mkdirSync(downloadPath, { recursive: true })
        }

        // 获取完整的文件名（包括路径中的文件名）
        const fullFileName = filePath.split('/').pop()
        savePath = path.join(downloadPath, fullFileName)

        // 发送下载提示
        await e.reply(`开始下载文件: ${fullFileName}\n文件大小: ${this.formatSize(fileInfo.size)}`)

        // 获取文件
        await this.files.downloadFile(e.user_id, instanceIndex, filePath, savePath)

        // 发送文件
        await e.reply(segment.file(savePath, fullFileName))

        // 延迟删除临时文件
        setTimeout(() => {
          fs.unlink(savePath, (err) => {
            if (err) logger.error(`[MCS Files] 删除临时文件失败:`, err)
          })
        }, 5000)

        return true

      } finally {
        // 无论成功还是失败，都要移除下载锁
        global.mcsDownloadLocks.delete(lockKey)
      }

    } catch (error) {
      // 如果下载失败，清理临时文件
      if (savePath && fs.existsSync(savePath)) {
        try {
          fs.unlinkSync(savePath)
        } catch (err) {
          logger.error(`[MCS Files] 清理临时文件失败:`, err)
        }
      }

      let message = '下载文件失败'
      
      if (error.message.includes('未绑定')) {
        message = '请先使用 #mcs bind 命令绑定面板'
      } else if (error.message.includes('序号不存在')) {
        message = error.message
      } else if (error.message.includes('命令格式错误')) {
        message = '命令格式：#mcs下载文件 <实例序号> <文件路径>'
      } else if (error.message.includes('文件不存在')) {
        message = '指定的文件不存在'
      } else if (error.message.includes('不能下载文件夹')) {
        message = '不能下载文件夹，请指定具体文件'
      } else if (error.message.includes('超过4GB限制')) {
        message = error.message
      } else if (error.message.includes('正在下载中')) {
        message = error.message
      } else {
        message = `下载文件失败：${error.message}`
      }

      await e.reply(message)
      return false
    }
  }

  /**
   * 格式化文件大小
   * @param {number} size 字节数
   * @returns {string} 格式化后的大小
   */
  formatSize(size) {
    const units = ['B', 'KB', 'MB', 'GB', 'TB']
    let index = 0
    while (size >= 1024 && index < units.length - 1) {
      size /= 1024
      index++
    }
    return `${size.toFixed(2)} ${units[index]}`
  }
}