import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import chalk from 'chalk'
import McsConfig from '../../models/mcsmanager/config/config.js'
import UserData from '../../models/mcsmanager/user/userdata.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

logger.info(`
███╗   ███╗ ██████╗███████╗███╗   ███╗ █████╗ ███╗   ██╗ █████╗  ██████╗ ███████╗██████╗ 
████╗ ████║██╔════╝██╔════╝████╗ ████║██╔══██╗████╗  ██║██╔══██╗██╔════╝ ██╔════╝██╔══██╗
██╔████╔██║██║     ███████╗██╔████╔██║███████║██╔██╗ ██║███████║██║  ███╗█████╗  ██████╔╝
██║╚██╔╝██║██║     ╚════██║██║╚██╔╝██║██╔══██║██║╚██╗██║██╔══██║██║   ██║██╔══╝  ██╔══██╗
██║ ╚═╝ ██║╚██████╗███████║██║ ╚═╝ ██║██║  ██║██║ ╚████║██║  ██║╚██████╔╝███████╗██║  ██║
╚═╝     ╚═╝ ╚═════╝╚══════╝╚═╝     ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝  ╚═╝
`)

// 存储所有插件类
const plugins = {}

// 初始化MCS Manager相关服务
const initializeServices = async () => {
    try {
        logger.info('----------------------')
        logger.info('正在初始化MCS Manager服务...')
        
        // 初始化配置
        await McsConfig.initialize()
        
        // 初始化用户数据
        const userData = new UserData()
        await userData.init()
        
        // 导出用户数据实例供其他模块使用
        global.mcsUserData = userData
        
        logger.info('MCS Manager服务初始化完成')
        logger.info('----------------------')
    } catch (error) {
        logger.error('[MCS Manager] 服务初始化失败:', error)
        throw error
    }
}

// 加载目录下所有js文件
const loadPlugins = async () => {
    const startTime = Date.now()
    let successCount = 0
    let failureCount = 0
    
    // 先初始化服务
    try {
        await initializeServices()
    } catch (error) {
        logger.error('[MCS Manager] 初始化失败，插件加载终止')
        return
    }
    
    const files = fs.readdirSync(__dirname)
    const jsFiles = files.filter(file => file.endsWith('.js') && file !== 'index.js')
    
    for (const file of jsFiles) {
        try {
            const fileUrl = `file://${path.join(__dirname, file)}`.replace(/\\/g, '/')
            const mod = await import(fileUrl)
            
            const exportedClass = Object.values(mod)[0]
            if (exportedClass && typeof exportedClass === 'function') {
                const pluginName = path.basename(file, '.js')
                plugins[pluginName] = exportedClass
                logger.info(`[MCS Manager] 插件加载成功: ${file}`)
                successCount++
            } else {
                logger.warn(`[MCS Manager] 插件格式错误: ${file}`)
                failureCount++
            }
        } catch (err) {
            logger.error(`[MCS Manager] 插件加载失败: ${file}`)
            logger.error(err)
            failureCount++
        }
    }

    const elapsedTime = Date.now() - startTime

    logger.info('----------------------')
    logger.info(chalk.green('MCS Manager插件载入完成'))
    logger.info(`成功加载：${chalk.green(successCount)} 个`)
    logger.info(`加载失败：${chalk.red(failureCount)} 个`) 
    logger.info(`总耗时：${chalk.yellow(elapsedTime)} 毫秒`)
    logger.info('----------------------')
}

await loadPlugins()

// 导出所有插件类
export default plugins

