import plugin from '../../../../lib/plugins/plugin.js'
import McsInfo from '../../models/mcsmanager/app/info.js'
import puppeteer from 'puppeteer'
import template from 'art-template'
import path from 'path'
import fs from 'fs'

// #mcs overview 获取面板概览信息
// #mcs users 获取用户列表·

export class MCSManagerInfo extends plugin {
  constructor() {
    super({
      name: 'MCSManager-信息',
      dsc: '获取MCSManager面板信息',
      event: 'message',
      priority: 5000,
      rule: [
        {
          reg: '^#?(mcs|MCS)\\s*(概览|overview)$',
          fnc: 'overview'
        },
        {
          reg: '^#?(mcs|MCS)\\s*(用户列表|users)\\s*(\\d+)?$',
          fnc: 'users'
        }
      ]
    })

    this.info = new McsInfo()
  }

  /**
   * 获取面板概览信息
   * @param {*} e 消息对象
   * @returns {Promise<boolean>} 是否处理成功
   */
  async overview(e) {
    try {
      // 获取数据
      const data = await this.info.getOverview(e.user_id)
      
      // 渲染HTML
      const html = template(path.join(process.cwd(), './plugins/mcsmanager-plugin/resources/mcsmanager/html/info.html'), data)
      

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
      const fileName = `overview_${Date.now()}.jpg`
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
          if (err) logger.error(`[MCS Info] 删除临时文件失败:`, err)
        })
      }, 5000)

      return true
      
    } catch (error) {
      logger.error(`[MCS Info] 生成概览信息失败:`, error)
      await e.reply(`生成概览信息失败：${error.message}`)
      return false
    }
  }

  /**
   * 获取用户列表
   * @param {*} e 消息对象
   * @returns {Promise<boolean>} 是否处理成功
   */
  async users(e) {
    try {
      // 检查用户是否已绑定
      if (!global.mcsUserData.isUserBound(e.user_id)) {
        await e.reply('请先使用 #mcs bind 命令绑定面板');
        return false;
      }

      // 获取页码参数
      const pageNum = parseInt(e.msg.match(/\d+/)?.[0] || '1');
      
      const data = await this.info.getUserList(e.user_id, {
        page: pageNum,
        pageSize: 10
      });

      if (data.users.length === 0) {
        await e.reply('暂无用户数据');
        return true;
      }

      // 渲染HTML
      const html = template(path.join(process.cwd(), './plugins/mcsmanager-plugin/resources/mcsmanager/html/userinfo.html'), data)
      

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
      const fileName = `userlist_${Date.now()}.jpg`
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
          if (err) logger.error(`[MCS Info] 删除临时文件失败:`, err)
        })
      }, 5000)

      return true;
    } catch (error) {
      logger.error(`[MCS Info] 获取用户列表失败:`, error);
      
      let message = '获取用户列表失败，请检查面板连接状态。';
      
      if (error.message.includes('未绑定')) {
        message = '请先使用 #mcs bind 命令绑定面板';
      } else if (error.message.includes('API密钥')) {
        message = '面板连接失败：API密钥无效或已过期，请重新绑定面板';
      } else if (error.message.includes('权限')) {
        message = '面板连接失败：没有访问权限，请检查API密钥权限';
      }
      
      await e.reply(message);
      return false;
    }
  }
}
