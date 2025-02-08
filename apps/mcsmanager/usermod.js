import plugin from '../../../../lib/plugins/plugin.js'
import McsUserModApp from '../../models/mcsmanager/app/usermod.js'

// 创建用户：#mcs createuser <用户名> <密码> <权限>
// 删除用户：#mcs deleteuser <用户ID>
// 修改权限：#mcs setperm <用户ID> <权限值>
// 重置密码：#mcs resetpwd <用户ID> <新密码>

export class MCSManagerUserMod extends plugin {
    constructor() {
        super({
            name: 'MCSManager-用户管理',
            dsc: '管理MCSManager用户',
            event: 'message',
            priority: 5000,
            rule: [
                {
                    reg: '^#?(mcs|MCS)\\s*(创建用户|createuser)\\s*.*$',
                    fnc: 'createUser'
                },
                {
                    reg: '^#?(mcs|MCS)\\s*(删除用户|deleteuser)\\s*.*$',
                    fnc: 'deleteUser'
                },
                {
                    reg: '^#?(mcs|MCS)\\s*(修改权限|setperm)\\s*.*$',
                    fnc: 'changePermission'
                },
                {
                    reg: '^#?(mcs|MCS)\\s*(重置密码|resetpwd)\\s*.*$',
                    fnc: 'resetPassword'
                }
            ]
        })
        this.userMod = new McsUserModApp()
    }

    /**
     * 解析创建用户命令
     * @param {string} command 命令内容
     * @returns {Object|null} 解析结果
     */
    parseCreateCommand(command) {
        const params = command.replace(/^#?(mcs|MCS)\s*(创建用户|createuser)\s*/, '').trim().split(/\s+/)
        if (params.length !== 3) {
            return null
        }
        const [username, password, permission] = params
        return {
            username,
            password,
            permission: parseInt(permission)
        }
    }

    /**
     * 解析用户操作命令
     * @param {string} command 命令内容
     * @param {string} type 命令类型
     * @returns {Object|null} 解析结果
     */
    parseUserCommand(command, type) {
        const regex = new RegExp(`^#?(mcs|MCS)\\s*(${type})\\s*`, '')
        const params = command.replace(regex, '').trim().split(/\s+/)
        return params.length > 0 ? { uuid: params[0], value: params[1] } : null
    }

    async createUser(e) {
        if (!e.msg) {
            await e.reply([
                'MCS创建用户帮助：',
                '命令格式：#mcs createuser 用户名 密码 权限',
                '权限值：',
                '  1 = 普通用户',
                '  10 = 管理员',
                '  -1 = 封禁用户',
                '例如：#mcs createuser newuser password123 1'
            ].join('\n'))
            return true
        }

        try {
            const params = this.parseCreateCommand(e.msg)
            if (!params) {
                await e.reply([
                    '格式错误！',
                    '命令格式：#mcs createuser 用户名 密码 权限',
                    '例如：#mcs createuser newuser password123 1',
                    '',
                    '权限值说明：',
                    '  1 = 普通用户',
                    '  10 = 管理员',
                    '  -1 = 封禁用户'
                ].join('\n'))
                return false
            }

            const result = await this.userMod.createUser(e.user_id, params)
            const user = result.user
            const msg = [
                '创建用户成功！',
                `用户名：${user.userName}`,
                `用户ID：${user.uuid}`,
                `权限级别：${this.userMod.getPermissionName(user.permission)}`,
                '',
                '请妥善保管以上信息！',
                '如需修改权限，可使用 #mcs setperm 命令'
            ].join('\n')

            await e.reply(msg)
            return true
        } catch (error) {
            await e.reply(`创建用户失败：${error.message}`)
            return false
        }
    }

    async deleteUser(e) {
        if (!e.msg) {
            await e.reply([
                'MCS删除用户帮助：',
                '命令格式：#mcs deleteuser <用户名或ID>',
                '例如：',
                '  #mcs deleteuser testuser',
                '  #mcs deleteuser abc123def456'
            ].join('\n'))
            return true
        }

        try {
            const params = this.parseUserCommand(e.msg, '删除用户|deleteuser')
            if (!params) {
                await e.reply('格式错误！\n命令格式：#mcs deleteuser 用户名或ID\n例如：#mcs deleteuser testuser或#mcs deleteuser abc123def456')
                return false
            }

            await this.userMod.deleteUser(e.user_id, params.uuid)
            await e.reply('用户删除成功')
            return true
        } catch (error) {
            await e.reply(`删除用户失败：${error.message}`)
            return false
        }
    }

    async changePermission(e) {
        if (!e.msg) {
            await e.reply([
                'MCS修改权限帮助：',
                '命令格式：#mcs setperm <用户名或ID> <权限值>',
                '权限值：',
                '  1 = 普通用户',
                '  10 = 管理员',
                '  -1 = 封禁用户',
                '例如：',
                '  #mcs setperm admin 10',
                '  #mcs setperm abc123def456 1'
            ].join('\n'))
            return true
        }

        try {
            const params = this.parseUserCommand(e.msg, '修改权限|setperm')
            if (!params || !params.value) {
                await e.reply([
                    '格式错误！',
                    '命令格式：#mcs setperm <用户名或ID> <权限值>',
                    '例如：#mcs setperm admin 10或#mcs setperm abc123def456 1',
                    '',
                    '权限值说明：',
                    '  1 = 普通用户',
                    '  10 = 管理员',
                    '  -1 = 封禁用户'
                ].join('\n'))
                return false
            }

            const newPermission = parseInt(params.value)
            if (![1, 10, -1].includes(newPermission)) {
                await e.reply('无效的权限值！可选值：1(用户)、10(管理员)、-1(封禁)')
                return false
            }

            const result = await this.userMod.changePermission(e.user_id, params.uuid, newPermission)
            if (!result.user) {
                throw new Error('修改权限失败：无法获取用户信息')
            }

            const msg = [
                '修改权限成功！',
                `用户名：${result.user.userName}`,
                `用户ID：${result.user.uuid}`,
                `新权限级别：${this.userMod.getPermissionName(result.user.permission)}`
            ].join('\n')

            await e.reply(msg)
            return true
        } catch (error) {
            await e.reply(`修改权限失败：${error.message}`)
            return false
        }
    }

    async resetPassword(e) {
        if (!e.msg) {
            await e.reply([
                'MCS重置密码帮助：',
                '命令格式：#mcs resetpwd <用户名或ID> <新密码>',
                '例如：',
                '  #mcs resetpwd admin newpassword123',
                '  #mcs resetpwd abc123def456 newpassword123'
            ].join('\n'))
            return true
        }

        try {
            const params = this.parseUserCommand(e.msg, '重置密码|resetpwd')
            if (!params || !params.value) {
                await e.reply([
                    '格式错误！',
                    '命令格式：#mcs resetpwd <用户名或ID> <新密码>',
                    '例如：#mcs resetpwd admin newpassword123或#mcs resetpwd abc123def456 newpassword123',
                    '',
                    '密码长度不能小于6位'
                ].join('\n'))
                return false
            }

            const result = await this.userMod.resetPassword(e.user_id, params.uuid, params.value)
            const user = result.user
            const msg = [
                '重置密码成功！',
                `用户名：${user.userName}`,
                `用户ID：${user.uuid}`,
                '请妥善保管新密码'
            ].join('\n')

            await e.reply(msg)
            return true
        } catch (error) {
            await e.reply(`重置密码失败：${error.message}`)
            return false
        }
    }
}
