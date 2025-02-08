import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import McsConfig from '../config/config.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default class UserData {
    async init() {
        // 确保配置已初始化
        await this.initConfig()
        // 获取配置
        this.config = McsConfig.getMcsConfig()
        // 用户数据目录
        this.dataDir = path.join(process.cwd(), './data/mctool')
        // 用户数据文件路径
        this.dataFile = path.join(this.dataDir, 'mcsuserdata.json')
        // 用户数据缓存
        this.userData = {}
        // 初始化数据
        await this.initData()
    }

    /**
     * 确保配置已初始化
     */
    async initConfig() {
        try {
            await McsConfig.initialize()
        } catch (error) {
            logger.error('[UserData] 初始化配置失败:', error)
            throw error
        }
    }

    /**
     * 初始化用户数据
     */
    async initData() {
        try {
            // 确保目录存在
            if (!fs.existsSync(this.dataDir)) {
                fs.mkdirSync(this.dataDir, { recursive: true })
            }
            // 确保文件存在
            if (!fs.existsSync(this.dataFile)) {
                fs.writeFileSync(this.dataFile, '{}', 'utf8')
            }
            // 加载数据
            this.loadUserData()
        } catch (error) {
            logger.error('[UserData] 初始化失败:', error)
            throw error
        }
    }

    /**
     * 加载用户数据
     */
    loadUserData() {
        try {
            const data = fs.readFileSync(this.dataFile, 'utf8')
            this.userData = JSON.parse(data)
        } catch (error) {
            logger.error('[UserData] 加载用户数据失败:', error)
            throw error
        }
    }

    /**
     * 保存用户数据
     */
    saveUserData() {
        try {
            fs.writeFileSync(this.dataFile, JSON.stringify(this.userData, null, 2), 'utf8')
        } catch (error) {
            logger.error('[UserData] 保存用户数据失败:', error)
            throw error
        }
    }

    /**
     * 获取用户数据
     * @param {string} userId QQ号
     * @returns {Object} 用户数据
     */
    getUserData(userId) {
        try {
            // 确保用户数据存在
            if (!this.userData[userId]) {
                throw new Error(`用户 ${userId} 数据不存在`);
            }
            return this.userData[userId];
        } catch (error) {
            logger.error(`[UserData] 获取用户 ${userId} 数据失败:`, error);
            throw error;
        }
    }

    /**
     * 检查用户是否已绑定
     * @param {string} userId QQ号
     * @returns {boolean} 是否已绑定
     */
    isUserBound(userId) {
        try {
            return this.userData[userId] && 
                   this.userData[userId].baseUrl && 
                   this.userData[userId].apiKey;
        } catch (error) {
            logger.error(`[UserData] 检查用户 ${userId} 绑定状态失败:`, error);
            return false;
        }
    }

    /**
     * 处理URL格式
     * @param {string} url URL地址
     * @returns {string} 处理后的URL
     */
    formatUrl(url) {
        if (!url) return url;
        // 移除末尾的斜杠
        return url.replace(/\/+$/, '');
    }

    /**
     * 创建用户数据
     * @param {string} userId QQ号
     */
    async createUserData(userId) {
        try {
            // 使用配置中的默认值，如果不存在则使用内置默认值
            const defaults = this.config?.defaults || {
                baseUrl: "http://localhost:23333",
                apiKey: "",
                uuid: "",  // 添加uuid字段
                userName: "", // 添加userName字段
                instances: {
                    default: "",
                    list: []
                }
            };

            this.userData[userId] = {
                baseUrl: this.formatUrl(defaults.baseUrl),
                apiKey: defaults.apiKey,
                uuid: defaults.uuid,  // 初始化uuid
                userName: defaults.userName, // 初始化userName
                instances: {
                    default: defaults.instances.default,
                    list: [...(defaults.instances.list || [])]
                }
            };
            
            this.saveUserData();
            logger.info(`[UserData] 已创建用户 ${userId} 的默认数据`);
        } catch (error) {
            logger.error(`[UserData] 创建用户 ${userId} 数据失败:`, error);
            throw error;
        }
    }

    /**
     * 更新用户数据
     * @param {string} userId QQ号
     * @param {Object} data 新数据
     */
    async updateUserData(userId, data) {
        try {
            // 如果用户数据不存在，先创建
            if (!this.userData[userId]) {
                await this.createUserData(userId);
            }
            
            // 更新数据，保留未更新的字段
            this.userData[userId] = {
                baseUrl: this.formatUrl(data.baseUrl) || this.userData[userId].baseUrl,
                apiKey: data.apiKey || this.userData[userId].apiKey,
                uuid: data.uuid || this.userData[userId].uuid || '', // 更新uuid
                userName: data.userName || this.userData[userId].userName || '', // 更新userName
                instances: {
                    default: data.instances?.default || this.userData[userId].instances.default,
                    list: data.instances?.list || [...this.userData[userId].instances.list]
                }
            };
            
            this.saveUserData();
            logger.info(`[UserData] 已更新用户 ${userId} 的数据`);
        } catch (error) {
            logger.error(`[UserData] 更新用户 ${userId} 数据失败:`, error);
            throw error;
        }
    }

    /**
     * 删除用户数据
     * @param {string} userId QQ号
     */
    async deleteUserData(userId) {
        try {
            if (this.userData[userId]) {
                delete this.userData[userId]
                this.saveUserData()
                logger.info(`[UserData] 已删除用户 ${userId} 的数据`)
            }
        } catch (error) {
            logger.error(`[UserData] 删除用户 ${userId} 数据失败:`, error)
            throw error
        }
    }
}
