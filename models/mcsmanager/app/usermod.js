import McsAPI from '../../../components/mcsmanager/mcs-api.js'

export default class McsUserModApp {
  constructor() {
    this.mcsApi = new McsAPI()
  }

  /**
   * 创建新用户
   * @param {string} operatorId 操作者QQ号
   * @param {Object} userData 用户数据
   * @param {string} userData.username 用户名
   * @param {string} userData.password 密码
   * @param {number} userData.permission 用户权限(1=用户,10=管理员,-1=被封禁)
   * @returns {Promise<Object>} 创建结果
   */
  async createUser(operatorId, userData) {
    try {
      // 验证权限
      const operatorInfo = await this.mcsApi.getUserList(operatorId, {
        page: 1,
        page_size: 1
      })
      
      const operator = operatorInfo.data[0]
      if (!operator || operator.permission !== 10) {
        throw new Error('权限不足，需要管理员权限')
      }

      // 验证权限值
      if (![1, 10, -1].includes(userData.permission)) {
        throw new Error('无效的权限值，可选值：1(用户)、10(管理员)、-1(封禁)')
      }

      // 创建用户
      const result = await this.mcsApi.createUser(operatorId, {
        username: userData.username,
        password: userData.password,
        permission: userData.permission
      })

      return {
        success: true,
        user: result
      }
    } catch (error) {
      logger.error(`[MCS UserMod] 创建用户失败:`, error)
      throw error
    }
  }

  /**
   * 更新用户配置
   * @param {string} operatorId 操作者QQ号
   * @param {string} targetUuid 目标用户UUID
   * @param {Object} config 更新配置
   * @returns {Promise<Object>} 更新结果
   */
  async updateUser(operatorId, targetUuid, config) {
    try {
      // 验证权限
      const operatorInfo = await this.mcsApi.getUserList(operatorId, {
        page: 1,
        page_size: 1
      })
      
      const operator = operatorInfo.data[0]
      if (!operator || operator.permission !== 10) {
        throw new Error('权限不足，需要管理员权限')
      }

      // 获取目标用户信息
      const targetInfo = await this.mcsApi.getUserList(operatorId, {
        page: 1,
        page_size: 20
      })
      
      const targetUser = targetInfo.data.find(user => user.uuid === targetUuid)
      if (!targetUser) {
        throw new Error('目标用户不存在')
      }

      // 合并配置
      const updatedConfig = {
        ...targetUser,
        ...config,
        uuid: targetUuid // 确保UUID不被修改
      }

      // 更新用户
      const result = await this.mcsApi.updateUser(operatorId, targetUuid, updatedConfig)

      return {
        success: true,
        user: result
      }
    } catch (error) {
      logger.error(`[MCS UserMod] 更新用户失败:`, error)
      throw error
    }
  }

  /**
   * 解析用户标识（支持用户名或UUID）
   * @param {string} operatorId 操作者QQ号
   * @param {string} userIdentifier 用户标识（用户名或UUID）
   * @returns {Promise<string>} 用户UUID
   */
  async resolveUserIdentifier(operatorId, userIdentifier) {
    try {
      // 尝试通过用户名查找
      const user = await this.mcsApi.getUserByName(operatorId, userIdentifier);
      if (user) {
        return user.uuid;
      }

      // 如果不是用户名，则假定是UUID
      // 验证UUID是否存在
      const userList = await this.mcsApi.getUserList(operatorId, {
        page: 1,
        page_size: 100
      });

      const userById = userList.data.find(u => u.uuid === userIdentifier);
      if (userById) {
        return userIdentifier;
      }

      throw new Error('未找到指定用户');
    } catch (error) {
      logger.error(`[MCS UserMod] 解析用户标识失败:`, error);
      throw error;
    }
  }

  /**
   * 删除用户
   * @param {string} operatorId 操作者QQ号
   * @param {string} userIdentifier 用户标识（用户名或UUID）
   * @returns {Promise<Object>} 删除结果
   */
  async deleteUser(operatorId, userIdentifier) {
    try {
      // 解析用户标识
      const uuid = await this.resolveUserIdentifier(operatorId, userIdentifier);
      
      // 删除用户
      await this.mcsApi.deleteUser(operatorId, uuid);
      return {
        success: true,
        message: '用户删除成功'
      };
    } catch (error) {
      logger.error(`[MCS UserMod] 删除用户失败:`, error);
      throw error;
    }
  }

  /**
   * 修改用户权限
   * @param {string} operatorId 操作者QQ号
   * @param {string} userIdentifier 用户标识（用户名或UUID）
   * @param {number} newPermission 新权限等级
   * @returns {Promise<Object>} 操作结果
   */
  async changePermission(operatorId, userIdentifier, newPermission) {
    try {
      // 解析用户标识
      const uuid = await this.resolveUserIdentifier(operatorId, userIdentifier);
      
      // 验证权限值
      if (![1, 10, -1].includes(newPermission)) {
        throw new Error('无效的权限值，可选值：1(用户)、10(管理员)、-1(封禁)');
      }

      // 更新用户权限
      return await this.updateUser(operatorId, uuid, {
        permission: newPermission
      });
    } catch (error) {
      logger.error(`[MCS UserMod] 修改用户权限失败:`, error);
      throw error;
    }
  }

  /**
   * 重置用户密码
   * @param {string} operatorId 操作者QQ号
   * @param {string} userIdentifier 用户标识（用户名或UUID）
   * @param {string} newPassword 新密码
   * @returns {Promise<Object>} 操作结果
   */
  async resetPassword(operatorId, userIdentifier, newPassword) {
    try {
      // 解析用户标识
      const uuid = await this.resolveUserIdentifier(operatorId, userIdentifier);
      
      // 验证密码强度
      if (!newPassword || newPassword.length < 6) {
        throw new Error('密码长度不能小于6位');
      }

      // 更新用户密码
      return await this.updateUser(operatorId, uuid, {
        passWord: newPassword
      });
    } catch (error) {
      logger.error(`[MCS UserMod] 重置用户密码失败:`, error);
      throw error;
    }
  }

  /**
   * 获取用户权限名称
   * @param {number} permission 权限值
   * @returns {string} 权限名称
   */
  getPermissionName(permission) {
    switch (permission) {
      case 10:
        return '管理员'
      case 1:
        return '普通用户'
      case -1:
        return '已封禁'
      default:
        return '未知'
    }
  }
}
