const apps = {}
//最后在加载mcsmanager相关插件
try {
    const mcsPlugins = await import('./apps/mcsmanager/index.js')
    // 将 MCS 插件添加到 apps 对象中
    for (const [name, pluginClass] of Object.entries(mcsPlugins.default)) {
        apps[`mcs-${name}`] = pluginClass
    }
    logger.info('[MCTool] MCSManager加载完成')
} catch (err) {
    logger.error('[MCTool] MCSManager加载失败:', err)
    failureCount++
}

export { apps } 