import McsAPI from '../../../components/mcsmanager/mcs-api.js'

export default class McsInstanceApp {
  constructor() {
    this.mcsApi = new McsAPI()
  }

  /**
   * 获取实例状态名称
   * @param {number} state 状态码
   * @returns {string} 状态名称
   */
  getStateName(state) {
    const states = {
      '-1': '忙碌',
      0: '停止',
      1: '停止中',
      2: '启动中',
      3: '运行中'
    }
    return states[state] || '未知状态'
  }

  /**
   * 获取实例列表
   * @param {string} userId QQ号
   * @param {Object} params 查询参数
   * @returns {Promise<Object>} 实例列表
   */
  async getInstanceList(userId, params = {}) {
    try {
      // 检查用户是否已绑定
      if (!global.mcsUserData.isUserBound(userId)) {
        throw new Error('请先使用 #mcs bind 命令绑定面板')
      }

      // 从用户数据中获取实例列表顺序
      const userData = global.mcsUserData.getUserData(userId);

      // 获取所有不同的守护进程ID
      const daemonIds = [...new Set(userData.instances.list.map(inst => inst.daemonId))];

      // 存储所有实例
      const allInstances = [];

      // 获取每个守护进程的实例列表
      for (const daemonId of daemonIds) {
        try {
          const result = await this.mcsApi.getInstanceList(userId, {
            page: 1,
            page_size: 50,
            daemonId: daemonId
          });

          // 添加该守护进程下的所有实例
          allInstances.push(...result.data.map(inst => ({
            uuid: inst.instanceUuid,
            name: inst.config.nickname || '未拥有',
            type: inst.config.type || '未知',
            state: inst.status,
            stateName: this.getStateName(inst.status),
            started: inst.started,
            createTime: inst.config.createDatetime,
            lastTime: inst.config.lastDatetime,
            autoStart: inst.config.eventTask?.autoStart || false,
            autoRestart: inst.config.eventTask?.autoRestart || false,
            daemonId: daemonId
          })));

        } catch (error) {
          logger.warn(`[MCS Instance] 获取守护进程 ${daemonId} 的实例列表失败:`, error);
          // 继续处理其他守护进程
        }
      }

      // 更新配置文件中的实例列表
      userData.instances.list = allInstances.map(inst => ({
        instanceUuid: inst.uuid,
        daemonId: inst.daemonId,
        name: inst.name,
        type: inst.type
      }));

      // 保存更新后的用户数据
      global.mcsUserData.updateUserData(userId, userData);

      return {
        success: true,
        page: 1,
        pageSize: allInstances.length,
        total: allInstances.length,
        maxPage: 1,
        instances: allInstances
      };

    } catch (error) {
      logger.error(`[MCS Instance] 获取实例列表失败:`, error);
      throw error;
    }
  }

  /**
   * 获取实例详情
   * @param {string} userId QQ号
   * @param {string} instanceUuid 实例UUID
   * @returns {Promise<Object>} 实例详情
   */
  async getInstanceInfo(userId, instanceUuid) {
    try {
      // 检查用户是否已绑定
      if (!global.mcsUserData.isUserBound(userId)) {
        throw new Error('请先使用 #mcs bind 命令绑定面板');
      }

      // 从用户数据中获取实例信息
      const userData = global.mcsUserData.getUserData(userId);
      if (!userData?.instances?.list) {
        throw new Error('未找到实例信息，请先使用 #mcs bind 重新绑定面板');
      }

      // 查找对应实例的配置信息
      const configInst = userData.instances.list.find(inst => inst.instanceUuid === instanceUuid);
      if (!configInst) {
        throw new Error('未找到该实例');
      }

      // 使用配置中的守护进程ID获取实例详情
      const instance = await this.mcsApi.getInstanceInfo(userId, instanceUuid, configInst.daemonId);
      
      return {
        success: true,
        instance: {
          uuid: instance.instanceUuid,
          started: instance.started,  // 启动次数
          status: instance.status,    // 实例状态
          stateName: this.getStateName(instance.status),
          config: {
            name: instance.config?.nickname || configInst.name || '未拥有',
            type: instance.config?.type || configInst.type || '未知',
            startCommand: instance.config?.startCommand || '',
            stopCommand: instance.config?.stopCommand || '',
            updateCommand: instance.config?.updateCommand || '',
            cwd: instance.config?.cwd || '',
            createTime: instance.config?.createDatetime,
            lastTime: instance.config?.lastDatetime,
            endTime: instance.config?.endTime || 0,
            processType: instance.config?.processType || 'general',
            fileCode: instance.config?.fileCode || 'utf8',
            crlf: instance.config?.crlf || 1,
            category: instance.config?.category || 0,
            encoding: {
              ie: instance.config?.ie || 'utf8',
              oe: instance.config?.oe || 'utf8'
            },
            terminal: {
              haveColor: instance.config?.terminalOption?.haveColor || false,
              pty: instance.config?.terminalOption?.pty || true,
              windowCol: instance.config?.terminalOption?.ptyWindowCol || 164,
              windowRow: instance.config?.terminalOption?.ptyWindowRow || 40
            },
            eventTask: {
              autoStart: instance.config?.eventTask?.autoStart || false,
              autoRestart: instance.config?.eventTask?.autoRestart || false,
              ignore: instance.config?.eventTask?.ignore || false
            },
            docker: {
              containerName: instance.config?.docker?.containerName || '',
              image: instance.config?.docker?.image || '',
              memory: instance.config?.docker?.memory || 0,
              cpuUsage: instance.config?.docker?.cpuUsage || 0,
              maxSpace: instance.config?.docker?.maxSpace || 0,
              networkMode: instance.config?.docker?.networkMode || 'bridge',
              workingDir: instance.config?.docker?.workingDir || '/workspace/',
              ports: instance.config?.docker?.ports || [],
              env: instance.config?.docker?.env || []
            },
            rcon: {
              enable: instance.config?.enableRcon || false,
              password: instance.config?.rconPassword || '',
              port: instance.config?.rconPort || 0,
              ip: instance.config?.rconIp || ''
            }
          },
          process: {
            cpu: instance.processInfo?.cpu || 0,
            memory: instance.processInfo?.memory || 0,
            uptime: instance.processInfo?.elapsed || 0,
            ctime: instance.processInfo?.ctime || 0,
            timestamp: instance.processInfo?.timestamp || 0,
            pid: instance.processInfo?.pid || 0,
            ppid: instance.processInfo?.ppid || 0
          },
          info: {
            currentPlayers: instance.info?.currentPlayers || 0,
            maxPlayers: instance.info?.maxPlayers || 0,
            version: instance.info?.version || '',
            fileLock: instance.info?.fileLock || 0,
            mcPingOnline: instance.info?.mcPingOnline || false,
            openFrpStatus: instance.info?.openFrpStatus || false,
            latency: instance.info?.latency || 0
          },
          space: instance.space || 0
        }
      };
    } catch (error) {
      logger.error(`[MCS Instance] 获取实例详情失败:`, error);
      throw error;
    }
  }

  /**
   * 实例操作
   * @param {string} userId QQ号
   * @param {string} instanceUuid 实例UUID
   * @param {string} operation 操作类型
   * @returns {Promise<Object>} 操作结果
   */
  async instanceOperation(userId, instanceUuid, operation) {
    try {
      await this.mcsApi.instanceOperation(userId, instanceUuid, operation)
      return {
        success: true,
        message: `实例${operation}操作已执行`
      }
    } catch (error) {
      logger.error(`[MCS Instance] 实例${operation}操作失败:`, error)
      throw error
    }
  }

  /**
   * 发送实例命令
   * @param {string} userId QQ号
   * @param {string} instanceUuid 实例UUID
   * @param {string} command 命令内容
   * @returns {Promise<Object>} 发送结果
   */
  async sendCommand(userId, instanceUuid, command) {
    try {
      // 检查用户是否已绑定
      if (!global.mcsUserData.isUserBound(userId)) {
        throw new Error('请先使用 #mcs bind 命令绑定面板');
      }

      // 获取实例信息以验证实例存在
      const instanceInfo = await this.getInstanceInfo(userId, instanceUuid);
      if (!instanceInfo?.instance) {
        throw new Error('未找到该实例');
      }

      // 检查实例状态
      if (instanceInfo.instance.status !== 3) {
        throw new Error('实例未在运行状态，无法发送命令');
      }

      // 检查命令内容
      if (!command || typeof command !== 'string') {
        throw new Error('命令内容不能为空');
      }

      // 发送命令
      const result = await this.mcsApi.sendCommand(userId, instanceUuid, command);

      return {
        success: true,
        instance: instanceInfo.instance,
        command: command,
        result: result
      };

    } catch (error) {
      logger.error(`[MCS Instance] 发送命令失败:`, error);
      throw error;
    }
  }

  /**
   * 获取实例日志
   * @param {string} userId QQ号
   * @param {string} instanceUuid 实例UUID
   * @param {number} [size] 日志大小(KB)，可选
   * @returns {Promise<Object>} 日志数据
   */
  async getInstanceLog(userId, instanceUuid, size = 100) {
    try {
      // 检查用户是否已绑定
      if (!global.mcsUserData.isUserBound(userId)) {
        throw new Error('请先使用 #mcs bind 命令绑定面板');
      }

      // 获取实例信息以验证实例存在
      const instanceInfo = await this.getInstanceInfo(userId, instanceUuid);
      if (!instanceInfo?.instance) {
        throw new Error('未找到该实例');
      }

      // 限制日志大小在合理范围内
      const logSize = Math.min(Math.max(size, 1), 2048); // 1KB ~ 2048KB

      // 获取日志
      const log = await this.mcsApi.getInstanceLog(userId, instanceUuid, logSize);

      // 处理日志内容
      const logContent = log || '暂无日志';

      return {
        success: true,
        instance: instanceInfo.instance,
        log: logContent,
        size: logSize
      };

    } catch (error) {
      logger.error(`[MCS Instance] 获取实例日志失败:`, error);
      throw error;
    }
  }

  /**
   * 通过序号获取实例UUID
   * @param {string} userId QQ号
   * @param {number} index 实例序号(1开始)
   * @returns {Promise<string>} 实例UUID
   */
  async getInstanceUuidByIndex(userId, index) {
    try {
      // 检查用户是否已绑定
      if (!global.mcsUserData.isUserBound(userId)) {
        throw new Error('请先使用 #mcs bind 命令绑定面板');
      }

      // 从用户数据中获取实例列表
      const userData = global.mcsUserData.getUserData(userId);
      if (!userData?.instances?.list) {
        throw new Error('未找到实例信息，请先使用 #mcs bind 重新绑定面板');
      }

      // 检查序号是否有效
      if (index < 1 || index > userData.instances.list.length) {
        throw new Error(`序号 ${index} 无效，当前共有 ${userData.instances.list.length} 个实例`);
      }

      // 返回对应序号的实例UUID
      return userData.instances.list[index - 1].instanceUuid;

    } catch (error) {
      logger.error(`[MCS Instance] 获取实例UUID失败:`, error);
      throw error;
    }
  }
} 