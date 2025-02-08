import plugin from '../../../../lib/plugins/plugin.js'
import puppeteer from 'puppeteer'
import path from 'path'
import fs from 'fs'

export class MCSManagerHelp extends plugin {
    constructor() {
        super({
            name: 'MCSManager-帮助',
            dsc: '显示MCSManager帮助信息',
            event: 'message',
            priority: 5000,
            rule: [
                {
                    reg: '^#?(mcs|MCS)(help|帮助|菜单)$',
                    fnc: 'help'
                }
            ]
        })
    }

    async help(e) {
        try {
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
            
            // 读取HTML模板
            const htmlPath = path.join(process.cwd(), 'plugins/mcsmanager-plugin/resources/mcsmanager/html/help.html')
            const template = fs.readFileSync(htmlPath, 'utf8')
            

            // 加载HTML内容
            await page.setContent(template)
            
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
            const fileName = `help_${Date.now()}.jpg`
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
                    if (err) logger.error(`[MCS Help] 删除临时文件失败:`, err)
                })
            }, 5000)

            return true;
        } catch (error) {
            logger.error(`[MCS Help] 生成帮助信息失败:`, error)
            await e.reply('生成帮助信息失败，请稍后重试')
            return false
        }
    }
}
