import fs from 'fs';
import YAML from 'yaml';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class ConfigError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = 'ConfigError';
    this.cause = cause;
  }
}

class McsConfig {
  constructor() {
    const configRoot = path.join(process.cwd(), 'plugins/mcsmanager-plugin/config');
    this.configPath = path.join(configRoot, 'mcsconfig.yaml');
    this.defaultConfigPath = path.join(configRoot, 'default_mcsconfig.yaml');
    this.config = null;
  }

  /**
   * 递归合并配置对象
   * @param {Object} userConfig - 用户配置
   * @param {Object} defaultConfig - 默认配置
   * @returns {Object} 合并后的配置
   */
  #mergeConfigs(userConfig, defaultConfig) {
    const merged = { ...userConfig };
    
    Object.entries(defaultConfig).forEach(([key, value]) => {
      if (!(key in userConfig)) {
        merged[key] = value;
      } else if (value && typeof value === 'object' && !Array.isArray(value)) {
        merged[key] = this.#mergeConfigs(userConfig[key], value);
      }
    });
    
    return merged;
  }

  /**
   * 验证配置格式
   * @param {Object} config - 待验证的配置
   * @throws {ConfigError} 配置无效时抛出错误
   */
  #validateConfig(config) {
    if (!config || typeof config !== 'object') {
      throw new ConfigError('配置必须是一个有效的对象');
    }

    // 如果配置为空，不进行验证
    if (Object.keys(config).length === 0) {
      return;
    }

    // 确保基本结构存在
    if (!config.mcsmanager) {
      config.mcsmanager = {};
    }
    if (!config.mcsmanager.userdata) {
      config.mcsmanager.userdata = {};
    }
    if (!config.mcsmanager.defaults) {
      config.mcsmanager.defaults = {};
    }
  }

  /**
   * 确保配置目录存在
   */
  #ensureConfigDir() {
    const configDir = path.dirname(this.configPath);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
  }

  /**
   * 读取YAML文件
   * @param {string} filePath - 文件路径
   * @returns {Object} 解析后的配置对象
   */
  #readYamlFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const config = YAML.parse(content);
      if (!config) {
        throw new ConfigError(`无法解析YAML文件: ${filePath}`);
      }
      return config;
    } catch (error) {
      throw new ConfigError(`读取配置文件失败: ${filePath}`, error);
    }
  }

  /**
   * 写入YAML文件
   * @param {string} filePath - 文件路径
   * @param {Object} data - 要写入的数据
   */
  #writeYamlFile(filePath, data) {
    try {
      fs.writeFileSync(filePath, YAML.stringify(data), 'utf8');
    } catch (error) {
      throw new ConfigError(`写入配置文件失败: ${filePath}`, error);
    }
  }

  /**
   * 初始化配置系统
   */
  async initialize() {
    try {
      this.#ensureConfigDir();

      // 检查默认配置文件是否存在
      if (!fs.existsSync(this.defaultConfigPath)) {
        throw new ConfigError('默认配置文件不存在');
      }

      // 如果用户配置文件不存在，直接复制默认配置文件
      if (!fs.existsSync(this.configPath)) {
        fs.copyFileSync(this.defaultConfigPath, this.configPath);
        logger.info('[MCS Config] 已创建配置文件（从默认配置复制）');
      }

      await this.reloadConfig();
      await this.syncWithDefaultConfig();
    } catch (error) {
      logger.error('[MCS Config] 初始化失败:', error);
      throw new ConfigError('配置初始化失败', error);
    }
  }

  /**
   * 重新加载配置
   */
  async reloadConfig() {
    this.config = this.#readYamlFile(this.configPath);
    this.#validateConfig(this.config);
  }

  /**
   * 与默认配置同步
   */
  async syncWithDefaultConfig() {
    const defaultConfig = this.#readYamlFile(this.defaultConfigPath);
    const updatedConfig = this.#mergeConfigs(this.config, defaultConfig);

    if (JSON.stringify(this.config) !== JSON.stringify(updatedConfig)) {
      this.config = updatedConfig;
      this.#writeYamlFile(this.configPath, this.config);
      logger.info('[MCS Config] 配置已更新，新功能已添加');
    }
  }

  /**
   * 获取完整配置
   * @returns {Object} 配置对象
   */
  getConfig() {
    if (!this.config) {
      throw new ConfigError('配置未初始化');
    }
    return this.config;
  }

  /**
   * 获取MCS相关配置
   * @returns {Object} MCS配置对象
   */
  getMcsConfig() {
    const config = this.getConfig();
    return {
      userdata: config.mcsmanager.userdata,
      defaults: config.mcsmanager.defaults
    };
  }

  /**
   * 更新配置
   * @param {Object} newConfig - 新的配置对象
   */
  async updateConfig(newConfig) {
    try {
      const mergedConfig = { ...this.config, ...newConfig };
      this.#validateConfig(mergedConfig);
      this.config = mergedConfig;
      this.#writeYamlFile(this.configPath, this.config);
      logger.info('[MCS Config] 配置已更新');
    } catch (error) {
      throw new ConfigError('更新配置失败', error);
    }
  }

  /**
   * 重置为默认配置
   */
  async resetConfig() {
    try {
      if (!fs.existsSync(this.defaultConfigPath)) {
        throw new ConfigError('默认配置文件不存在');
      }
      fs.copyFileSync(this.defaultConfigPath, this.configPath);
      await this.reloadConfig();
      logger.info('[MCS Config] 配置已重置为默认值');
    } catch (error) {
      throw new ConfigError('重置配置失败', error);
    }
  }
}

export default new McsConfig();