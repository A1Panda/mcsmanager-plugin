import plugin from '../../../../lib/plugins/plugin.js'
import McsBindApp from '../../models/mcsmanager/app/bind.js'

// #mcs bind <URL> <API密钥> 绑定MCSManager实例
// #mcs unbind 解绑MCSManager实例
// #mcs syncinstances 同步实例 注意需要在面板先分配实例权限
// #mcs bindinfo 获取绑定信息

export class MCSManagerBind extends plugin {
    constructor() {
        super({
            name: 'MCSManager-绑定',
            dsc: '绑定MCSManager实例',
            event: 'message',
            priority: 5000,
            rule: [
                {
                    reg: '^#?(mcs|MCS)\\s*(绑定信息|bindinfo)$',
                    fnc: 'info'
                },
                {
                    reg: '^#?(mcs|MCS)\\s*(解绑|unbind)$',
                    fnc: 'unbind'
                },
                {
                    reg: '^#?(mcs|MCS)\\s*(同步实例|syncinstances)$',
                    fnc: 'syncInstances'
                },
                {
                    reg: '^#?(mcs|MCS)\\s*(绑定|bind)\\s*.*$',
                    fnc: 'bind'
                }
            ]
        })
        this.bindApp = new McsBindApp()
    }

    async bind(e) {
        if (!e.msg) {
            await e.reply('MCS绑定帮助：\n命令格式：#mcs bind URL API密钥\n例如：#mcs bind http://localhost:23333 your-api-key')
            return true
        }

        const bindInfo = this.bindApp.parseBindCommand(e.msg)
        if (!bindInfo) {
            await e.reply('格式错误！\n命令格式：#mcs bind URL API密钥\n例如：#mcs bind http://localhost:23333 your-api-key')
            return false
        }

        try {
            await this.bindApp.bindMcsManager(e.user_id, bindInfo.url, bindInfo.apiKey)
            await e.reply('绑定成功！您现在可以使用其他MCS Manager命令了。')
            return true
        } catch (error) {
            await e.reply('绑定失败，请检查输入是否正确，或联系管理员。')
            return false
        }
    }

    async unbind(e) {
        try {
            await this.bindApp.unbindMcsManager(e.user_id)
            await e.reply('解绑成功！您的MCS Manager配置已被删除。')
            return true
        } catch (error) {
            await e.reply('解绑失败，请联系管理员。')
            return false
        }
    }

    async syncInstances(e) {
        try {
            const result = await this.bindApp.syncInstances(e.user_id)
            const msg = [
                '实例同步成功！',
                `面板用户名：${result.userName}`,
                `用户ID：${result.uuid}`,
                `共同步了 ${result.instanceCount} 个实例`,
                '实例列表：',
                ...result.instances.map((inst, index) => 
                    `${index + 1}. ${inst.instanceUuid} (${inst.name || '未命名'})`
                )
            ].join('\n')
            await e.reply(msg)
            return true
        } catch (error) {
            await e.reply(error.message === '用户未绑定面板' 
                ? '请先使用 #mcs bind 命令绑定面板'
                : '同步实例失败，请检查面板连接是否正常，或联系管理员。')
            return false
        }
    }

    async info(e) {
        try {
            const info = await this.bindApp.getBindInfo(e.user_id)
            const msg = [
                '您的MCS Manager绑定信息：',
                `服务器地址：${info.baseUrl}`,
                `API密钥：${info.apiKey.slice(0, 8)}****`,
                info.userName ? `面板用户名：${info.userName}` : '未同步用户信息',
                info.uuid ? `用户ID：${info.uuid}` : '',
                `已绑定实例数：${info.instances.list.length}`,
                info.instances.default ? `默认实例：${info.instances.default}` : '未设置默认实例'
            ].filter(Boolean).join('\n')
            await e.reply(msg)
            return true
        } catch (error) {
            await e.reply('获取绑定信息失败，请联系管理员。')
            return false
        }
    }
}
