import McsAPI from '../../../components/mcsmanager/mcs-api.js';
import McsInstanceApp from './instance.js';

export default class McsInfo {
  constructor() {
    this.api = new McsAPI();
    this.instanceApp = new McsInstanceApp();
  }

  /**
   * 获取实例详细信息
   * @param {string} qq QQ号
   * @param {string} instanceUuid 实例UUID
   * @returns {Object} 实例详细信息
   */
  getInstanceDetail(qq, instanceUuid) {
    try {
      const userData = global.mcsUserData.getUserData(qq);
      return userData.instances.list.find(inst => inst.instanceUuid === instanceUuid);
    } catch (error) {
      //logger.warn(`[MCS Info] 获取实例 ${instanceUuid} 详细信息失败:`, error);
      return null;
    }
  }

  /**
   * 格式化概览数据
   * @param {Object} overview 原始概览数据
   * @returns {Object} 格式化后的数据
   */
  formatOverview(overview) {
    // 处理所有守护进程信息
    const daemons = overview.remote?.map(remote => ({
      version: remote.version || '未知',
      address: remote.port ? `****:${remote.port}` : '****:****',
      remarks: remote.remarks || '未知',
      available: remote.available || false,
      instance: remote.instance || { running: 0, total: 0 },
      system: {
        type: remote.system?.type || '未知',
        platform: remote.system?.platform || '未知',
        hostname: remote.system?.hostname || '未知',
        release: remote.system?.release || '未知',
        uptime: this.formatUptime(remote.system?.uptime || 0),
        cpuUsage: remote.system?.cpuUsage || 0,
        memUsage: remote.system?.memUsage || 0,
        loadavg: remote.system?.loadavg || [0, 0, 0]
      }
    })) || [];
    
    // 处理系统内存信息
    const systemMemory = {
      total: overview.system?.totalmem || 0,
      used: overview.system?.totalmem - (overview.system?.freemem || 0) || 0,
      free: overview.system?.freemem || 0
    };

    // 处理进程内存信息
    const processMemory = {
      total: overview.process?.memory || 0,
      used: overview.process?.memory || 0,
      free: 0
    };

    // 处理图表数据
    const chartData = overview.chart ? {
      system: overview.chart.system || [],
      request: overview.chart.request || []
    } : null;

    return {
      version: overview.version || '未知',
      daemonVersion: overview.specifiedDaemonVersion || '未知',
      system: {
        platform: overview.system?.platform || '未知',
        type: overview.system?.type || '未知',
        version: overview.system?.version || '未知',
        release: overview.system?.release || '未知',
        hostname: overview.system?.hostname || '未知',
        node: overview.system?.node || '未知',
        uptime: this.formatUptime(overview.system?.uptime || 0),
        memory: this.formatMemory(systemMemory),
        cpu: `${(overview.system?.cpu * 100 || 0).toFixed(1)}%`,
        loadavg: this.formatLoadavg(overview.system?.loadavg || [0, 0, 0]),
        user: overview.system?.user ? {
          username: overview.system.user.username || '未知',
          uid: overview.system.user.uid || 0,
          gid: overview.system.user.gid || 0,
          homedir: overview.system.user.homedir || '未知',
          shell: overview.system.user.shell || '未知'
        } : null,
        time: overview.system?.time || Date.now()
      },
      process: {
        uptime: this.formatUptime(overview.process?.uptime || 0),
        memory: this.formatMemory(processMemory),
        cpu: `${(overview.process?.cpu || 0).toFixed(1)}%`,
        cwd: overview.process?.cwd || '未知'
      },
      status: {
        instance: overview.remote?.reduce((sum, remote) => sum + (remote.instance?.total || 0), 0) || 0,
        running: overview.remote?.reduce((sum, remote) => sum + (remote.instance?.running || 0), 0) || 0,
        remote: overview.remoteCount?.total || 0,
        available: overview.remoteCount?.available || 0
      },
      record: overview.record ? {
        logined: overview.record.logined || 0,
        loginFailed: overview.record.loginFailed || 0,
        illegalAccess: overview.record.illegalAccess || 0,
        bannedIPs: overview.record.banips || 0
      } : null,
      chart: chartData,
      daemon: daemons.length > 0 ? daemons : null,
      time: overview.time || Date.now()
    };
  }

  /**
   * 格式化用户列表数据
   * @param {Object} data 原始用户列表数据
   * @param {string} qq QQ号
   * @returns {Object} 格式化后的数据
   */
  formatUserList(data, qq) {
    return {
      total: data.total || 0,
      page: data.page || 1,
      pageSize: data.pageSize || 20,
      totalPage: data.maxPage || 1,
      users: (data.data || []).map(user => {
        return {
          id: user.uuid || '',
          username: user.userName || '未知用户',
          role: this.formatRole(user.permission),
          instances: user.instances || [],
          apiKey: user.apiKey || '',
          is2FAEnabled: user.open2FA || false,
          createTime: user.registerTime ? new Date(user.registerTime).toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
          }) : '未知',
          lastLoginTime: user.loginTime ? new Date(user.loginTime).toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
          }) : '从未登录'
        };
      })
    };
  }

  /**
   * 获取面板概览信息
   * @param {string} qq QQ号
   * @returns {Promise<Object>} 格式化后的概览信息
   */
  async getOverview(qq) {
    try {
      const data = await this.api.getOverview(qq);
      return this.formatOverview(data);
    } catch (error) {
      logger.error(`[MCS Info] 获取概览信息失败:`, error);
      throw error;
    }
  }

  /**
   * 获取用户列表
   * @param {string} qq QQ号
   * @param {Object} options 查询选项
   * @param {string} [options.userName] 用户名
   * @param {number} [options.page=1] 页码
   * @param {number} [options.pageSize=10] 每页数量
   * @param {string} [options.role] 用户权限(1=用户,10=管理员,-1=被封禁用户)
   * @returns {Promise<Object>} 格式化后的用户列表
   */
  async getUserList(qq, options = {}) {
    try {
      // 先更新实例列表
      await this.instanceApp.getInstanceList(qq);
      
      const data = await this.api.getUserList(qq, {
        page: options.page || 1,
        page_size: options.pageSize || 20,
        userName: options.userName || '',
        role: options.role || ''
      });

      // 获取每个用户的实例详细信息
      for (const user of data.data || []) {
        if (user.instances && user.instances.length > 0) {
          // 如果是当前用户，使用本地存储的实例信息
          if (user.uuid === global.mcsUserData.getUserData(qq).uuid) {
            const userData = global.mcsUserData.getUserData(qq);
            user.instances = userData.instances.list;
          } else {
            // 对于其他用户，获取每个实例的详细信息
            const instanceDetails = [];
            for (const inst of user.instances) {
              try {
                // 使用API直接获取实例信息
                const detail = await this.api.getInstanceInfo(qq, inst.instanceUuid, inst.daemonId);
                instanceDetails.push({
                  instanceUuid: inst.instanceUuid,
                  daemonId: inst.daemonId,
                  name: detail.config?.nickname || inst.name || '未拥有',
                  type: detail.config?.type || inst.type || '未知'
                });
              } catch (error) {
                logger.warn(`[MCS Info] 获取实例 ${inst.instanceUuid} 详细信息失败:`, error);
                // 如果获取失败，使用基本信息
                instanceDetails.push({
                  instanceUuid: inst.instanceUuid,
                  daemonId: inst.daemonId,
                  name: inst.name || '未拥有',
                  type: inst.type || '未知'
                });
              }
            }
            user.instances = instanceDetails;
          }
        }
      }

      return this.formatUserList(data, qq);
    } catch (error) {
      logger.error(`[MCS Info] 获取用户列表失败:`, error);
      throw error;
    }
  }

  /**
   * 格式化运行时间
   * @param {number} seconds 秒数
   * @returns {string} 格式化后的时间
   */
  formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    const parts = [];
    if (days > 0) parts.push(`${days}天`);
    if (hours > 0) parts.push(`${hours}小时`);
    if (minutes > 0) parts.push(`${minutes}分钟`);
    
    return parts.join('') || '刚刚启动';
  }

  /**
   * 格式化内存大小
   * @param {Object} memory 内存信息
   * @returns {Object} 格式化后的内存信息
   */
  formatMemory(memory = {}) {
    const formatSize = (bytes = 0) => {
      if (bytes === 0) return '0B';
      
      const units = ['B', 'KB', 'MB', 'GB', 'TB'];
      const k = 1024;
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      
      return `${(bytes / Math.pow(k, i)).toFixed(2)}${units[i]}`;
    };

    const total = memory.total || 0;
    const used = memory.used || 0;
    const free = memory.free || 0;
    const usage = total > 0 ? (used / total * 100).toFixed(1) : 0;

    return {
      total: formatSize(total),
      used: formatSize(used),
      free: formatSize(free),
      usage: `${usage}%`
    };
  }

  /**
   * 格式化用户权限
   * @param {number} role 权限数值
   * @returns {string} 权限描述
   */
  formatRole(role) {
    switch (role) {
      case 10:
        return '管理员';
      case 1:
        return '普通用户';
      case -1:
        return '已封禁';
      default:
        return '未知';
    }
  }

  /**
   * 格式化系统负载
   * @param {number[]} loadavg 负载数组 [1分钟, 5分钟, 15分钟]
   * @returns {string} 格式化后的负载信息
   */
  formatLoadavg(loadavg) {
    return loadavg.map(load => load.toFixed(2)).join(', ');
  }
}
