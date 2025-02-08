import McsAPI from '../../../components/mcsmanager/mcs-api.js'

export default class McsBindApp {
  constructor() {
    this.mcsApi = new McsAPI()
  }

  /**
   * 解析绑定命令
   * @param {string} command 命令内容
   * @returns {Object|null} 解析结果
   */
  parseBindCommand(command) {
    let input = command.replace(/^#?(mcs|MCS)\s*(绑定|bind)\s*/, '').trim()
    logger.info(`[MCS Bind] 解析绑定命令: ${input}`)
    
    let url, apiKey
    
    // 尝试匹配一体化格式: URL/apiKey
    const combinedMatch = input.match(/^(https?:\/\/[^\/]+)\/([a-zA-Z0-9]+)$/)
    if (combinedMatch) {
      [, url, apiKey] = combinedMatch
    } else {
      // 尝试匹配分开格式: URL apiKey
      const params = input.split(/\s+/)
      if (params.length === 2) {
        [url, apiKey] = params
      } else {
        return null
      }
    }
    
    try {
      new URL(url)
    } catch (error) {
      return null
    }

    return { url, apiKey }
  }

  /**
   * 绑定MCS Manager
   * @param {string} userId QQ号
   * @param {string} url 面板URL
   * @param {string} apiKey API密钥
   */
  async bindMcsManager(userId, url, apiKey) {
    try {
      // 先保存基本信息以便获取用户列表
      await global.mcsUserData.updateUserData(userId, {
        baseUrl: url,
        apiKey: apiKey
      });

      // 获取用户列表以获取守护进程ID
      const userListData = await this.mcsApi.getUserList(userId, {
        page: 1,
        page_size: 20
      });

      // 获取当前用户信息
      const currentUser = userListData.data.find(user => user.apiKey === apiKey);
      if (!currentUser) {
        throw new Error('未找到对应的用户信息');
      }

      // 获取用户的第一个实例的守护进程ID
      const daemonId = currentUser.instances?.[0]?.daemonId;
      if (!daemonId) {
        throw new Error('未找到可用的守护进程，请先在面板中分配实例');
      }

      // 更新用户数据，包含守护进程信息
      await global.mcsUserData.updateUserData(userId, {
        baseUrl: url,
        apiKey: apiKey,
        daemonId: daemonId,
        uuid: currentUser.uuid,
        userName: currentUser.userName,
        instances: {
          list: currentUser.instances.map(inst => ({
            instanceUuid: inst.instanceUuid,
            daemonId: inst.daemonId,
            name: inst.name || '',
            type: inst.type || ''
          })),
          default: currentUser.instances[0]?.instanceUuid || ''
        }
      });

      logger.mark(`[MCS Bind] 绑定成功: ${currentUser.userName} (${currentUser.uuid})`);
      return true;
    } catch (error) {
      logger.error(`[MCS Bind] 绑定失败:`, error);
      throw error;
    }
  }

  /**
   * 解绑MCS Manager
   * @param {string} userId 用户ID
   */
  async unbindMcsManager(userId) {
    try {
      await global.mcsUserData.deleteUserData(userId)
      return true
    } catch (error) {
      logger.error(`[MCS Bind] 解绑失败: ${error}`)
      throw error
    }
  }

  /**
   * 同步用户实例信息
   * @param {string} userId QQ号
   * @returns {Object} 同步结果
   */
  async syncInstances(userId) {
    try {
      // 检查用户是否已绑定
      if (!global.mcsUserData.isUserBound(userId)) {
        throw new Error('用户未绑定面板')
      }

      // 获取用户列表数据
      const userListData = await this.mcsApi.getUserList(userId, {
        page: 1,
        page_size: 20
      })

      // 获取当前用户的数据
      const currentUserData = global.mcsUserData.getUserData(userId)
      const userData = userListData.data.find(user => user.apiKey === currentUserData.apiKey)

      if (!userData) {
        throw new Error('未找到对应的用户信息')
      }

      // 保存用户UUID和实例信息
      await global.mcsUserData.updateUserData(userId, {
        uuid: userData.uuid, // 保存用户UUID
        userName: userData.userName, // 保存用户名
        instances: {
          list: userData.instances.map(inst => ({
            instanceUuid: inst.instanceUuid,
            daemonId: inst.daemonId,
            name: inst.name || '', // 如果API返回了实例名称
            type: inst.type || '' // 如果API返回了实例类型
          })),
          default: userData.instances[0]?.instanceUuid || ''
        }
      })

      return {
        success: true,
        instanceCount: userData.instances.length,
        instances: userData.instances,
        userName: userData.userName,
        uuid: userData.uuid
      }
    } catch (error) {
      logger.error(`[MCS Bind] 同步实例失败:`, error)
      throw error
    }
  }

  /**
   * 获取绑定信息
   * @param {string} userId QQ号
   * @returns {Object} 绑定信息
   */
  async getBindInfo(userId) {
    try {
      const data = await global.mcsUserData.getUserData(userId)
      return {
        baseUrl: data.baseUrl,
        apiKey: data.apiKey,
        uuid: data.uuid,
        userName: data.userName,
        instances: data.instances
      }
    } catch (error) {
      logger.error(`[MCS Bind] 获取绑定信息失败: ${error}`)
      throw error
    }
  }

  /**
   * 获取帮助信息
   * @returns {string} 帮助信息
   */
  getHelpMessage() {
    return 'MCS绑定帮助：\n命令格式：#mcs bind URL API密钥\n例如：#mcs bind http://localhost:23333 your-api-key';
  }

  /**
   * 获取错误提示
   * @returns {string} 错误提示
   */
  getErrorMessage() {
    return '格式错误！\n命令格式：#mcs bind URL API密钥\n例如：#mcs bind http://localhost:23333 your-api-key';
  }
}
