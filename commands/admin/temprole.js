const { addTempRole } = require('../../database');
const { MessageFlags, PermissionFlagsBits } = require('discord.js');

const ADMIN_ID = '685083491552985101';
const FIXED_ROLE_ID = '1379114634568536144';

module.exports = {
    data: {
        name: 'ban',
        description: 'Gắn Role cố định cho user trong thời gian nhất định',
        options: [
            { name: 'user', description: 'Người cần gắn role', type: 6, required: true },
            // Đã xóa phần chọn Role, chỉ còn chọn thời gian
            { name: 'phut', description: 'Thời gian tồn tại (phút)', type: 4, required: true, min_value: 1 }
        ]
    },
    async execute(interaction) {
        // 1. Check quyền Admin
        if (interaction.user.id !== ADMIN_ID && !interaction.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
            return interaction.reply({ content: '🚫 Bạn không có quyền quản lý Role!', flags: MessageFlags.Ephemeral });
        }

        const targetUser = interaction.options.getMember('user');
        const minutes = interaction.options.getInteger('phut');

        if (!targetUser) return interaction.reply({ content: 'Không tìm thấy người dùng này.', flags: MessageFlags.Ephemeral });

        // 2. Lấy Role từ ID cố định
        const role = interaction.guild.roles.cache.get(FIXED_ROLE_ID);

        // Kiểm tra xem Role có tồn tại hoặc lỗi không
        if (!role) {
            return interaction.reply({ content: `❌ Lỗi: Không tìm thấy Role có ID \`${FIXED_ROLE_ID}\` trong server này. Vui lòng kiểm tra lại code!`, flags: MessageFlags.Ephemeral });
        }

        // Bot không thể gắn role cao hơn nó
        if (role.position >= interaction.guild.members.me.roles.highest.position) {
            return interaction.reply({ content: '🚫 Role cố định này đang nằm cao hơn quyền của Bot. Hãy kéo Role của Bot lên trên nó!', flags: MessageFlags.Ephemeral });
        }

        try {
            // 3. Gắn Role
            await targetUser.roles.add(role);

            // 4. Lưu vào Database
            const expiresAt = await addTempRole(interaction.guild.id, targetUser.id, role.id, minutes);
            const expireDate = Math.floor(expiresAt / 1000);

            await interaction.reply({
                content: `Gắn role thành công!`,
                flags: MessageFlags.Ephemeral
            });

            // Bước B: Bot chat công khai ra kênh (Mọi người đều thấy)
            await interaction.channel.send({
                content: `⚡ **THIÊN KẾP GIÁNG LÂM!**\nPhong ấn ${targetUser} trong **${minutes} phút**.`
            });

        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'Có lỗi xảy ra khi gắn Role!', flags: MessageFlags.Ephemeral });
        }
    }
};