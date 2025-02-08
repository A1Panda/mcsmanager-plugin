import McsAPI from '../../../components/mcsmanager/mcs-api.js'

export default class McsDaemonApp {
  constructor() {
    this.mcsApi = new McsAPI()
  }

  /**
   * 添加守护进程节点
   * @param {string} userId QQ号
   * @param {Object} params 节点参数
   * @returns {Promise<Object>} 添加结果
   */
  async addDaemonNode(userId, params) {
    try {
      // 检查用户是否已绑定
      if (!global.mcsUserData.isUserBound(userId)) {
        throw new Error('请先使用 #mcs bind 命令绑定面板');
      }

      // 添加节点
      const daemonId = await this.mcsApi.addDaemonNode(userId, params);

      // 获取用户数据
      const userData = global.mcsUserData.getUserData(userId);

      // 将新节点添加到用户配置中
      if (!userData.daemonNodes) {
        userData.daemonNodes = [];
      }
      userData.daemonNodes.push({
        daemonId: daemonId,
        ip: params.ip,
        port: params.port,
        remarks: params.remarks || '',
        prefix: params.prefix || ''
      });

      // 保存更新后的用户数据
      global.mcsUserData.updateUserData(userId, userData);

      return {
        success: true,
        daemonId: daemonId,
        message: '守护进程节点添加成功'
      };

    } catch (error) {
      logger.error(`[MCS Daemon] 添加守护进程节点失败:`, error);
      throw error;
    }
  }

  /**
   * 获取守护进程节点列表
   * @param {string} userId QQ号
   * @returns {Promise<Object>} 节点列表
   */
  async getDaemonList(userId) {
    try {
      // 检查用户是否已绑定
      if (!global.mcsUserData.isUserBound(userId)) {
        throw new Error('请先使用 #mcs bind 命令绑定面板');
      }

      // 获取节点列表
      const data = await this.mcsApi.getDaemonList(userId);

      // 格式化返回数据
      const nodes = data.map(node => ({
        daemonId: node.uuid,
        name: node.remarks || node.ip,
        ip: node.ip,
        port: node.port,
        status: node.available,
        instances: (node.instances || []).map(inst => ({
          name: inst.config.nickname,
          type: inst.config.type,
          uuid: inst.instanceUuid,
          status: inst.status,
          started: inst.started
        })),
        instanceCount: (node.instances || []).length
      }));

      return {
        success: true,
        total: nodes.length,
        nodes: nodes
      };

    } catch (error) {
      logger.error(`[MCS Daemon] 获取守护进程节点列表失败:`, error);
      throw error;
    }
  }

  /**
   * 删除守护进程节点
   * @param {string} userId QQ号
   * @param {string} daemonId 节点ID
   * @returns {Promise<Object>} 删除结果
   */
  async deleteDaemonNode(userId, daemonId) {
    try {
      // 检查用户是否已绑定
      if (!global.mcsUserData.isUserBound(userId)) {
        throw new Error('请先使用 #mcs bind 命令绑定面板');
      }

      // 删除节点
      await this.mcsApi.deleteDaemonNode(userId, daemonId);

      return {
        success: true,
        message: '守护进程节点删除成功'
      };

    } catch (error) {
      logger.error(`[MCS Daemon] 删除守护进程节点失败:`, error);
      throw error;
    }
  }

  /**
   * 连接守护进程节点
   * @param {string} userId QQ号
   * @param {string} daemonId 节点ID
   * @returns {Promise<Object>} 连接结果
   */
  async linkDaemonNode(userId, daemonId) {
    try {
      // 检查用户是否已绑定
      if (!global.mcsUserData.isUserBound(userId)) {
        throw new Error('请先使用 #mcs bind 命令绑定面板');
      }

      // 连接节点
      await this.mcsApi.linkDaemonNode(userId, daemonId);

      return {
        success: true,
        message: '守护进程节点连接成功'
      };

    } catch (error) {
      logger.error(`[MCS Daemon] 连接守护进程节点失败:`, error);
      throw error;
    }
  }
} 