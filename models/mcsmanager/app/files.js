import McsApi from '../../../components/mcsmanager/mcs-api.js'
import path from 'path'

export default class McsFiles {
  constructor() {
    this.api = new McsApi()
  }

  /**
   * 获取实例文件列表
   * @param {string} userId QQ号
   * @param {string} instanceIndex 实例序号(从1开始)
   * @param {string} path 路径
   * @param {number} page 页码
   * @param {number} pageSize 每页数量
   */
  async getFileList(userId, instanceIndex, path = '/', page = 0, pageSize = 100) {
    try {
      // 检查用户是否已绑定
      if (!global.mcsUserData.isUserBound(userId)) {
        throw new Error('请先使用 #mcs bind 命令绑定面板');
      }

      // 初始化API配置
      await this.api.initUserConfig(userId);

      // 获取用户数据
      const userData = global.mcsUserData.getUserData(userId);
      const instances = userData.instances.list;
      
      // 检查序号是否有效
      const index = parseInt(instanceIndex) - 1;
      if (index < 0 || index >= instances.length) {
        throw new Error('实例序号不存在，请使用 #mcs实例列表 查看可用实例');
      }

      // 获取对应序号的实例
      const instance = instances[index];

      // 获取文件列表
      const fileList = await this.api.getFileList(
        instance.daemonId,
        instance.instanceUuid,
        path,
        page,
        pageSize
      );

      return fileList;

    } catch (error) {
      logger.error(`[MCS Files] 获取文件列表失败:`, error);
      throw error;
    }
  }

  /**
   * 下载文件
   * @param {string} userId QQ号
   * @param {string} instanceIndex 实例序号
   * @param {string} filePath 文件路径
   * @param {string} savePath 保存路径
   * @returns {Promise<void>}
   */
  async downloadFile(userId, instanceIndex, filePath, savePath) {
    try {
      // 检查用户是否已绑定
      if (!global.mcsUserData.isUserBound(userId)) {
        throw new Error('请先使用 #mcs bind 命令绑定面板');
      }

      // 初始化API配置
      await this.api.initUserConfig(userId);

      // 获取用户数据
      const userData = global.mcsUserData.getUserData(userId);
      const instances = userData.instances.list;
      
      // 检查序号是否有效
      const index = parseInt(instanceIndex) - 1;
      if (index < 0 || index >= instances.length) {
        throw new Error('实例序号不存在，请使用 #mcs实例列表 查看可用实例');
      }

      // 获取对应序号的实例
      const instance = instances[index];

      // 获取下载配置
      const config = await this.api.getFileDownloadConfig(
        instance.daemonId,
        instance.instanceUuid,
        filePath
      );

      // 下载文件
      await this.api.downloadFile(
        config.addr,
        config.password,
        path.basename(filePath),
        savePath
      );

    } catch (error) {
      throw error;
    }
  }
}
