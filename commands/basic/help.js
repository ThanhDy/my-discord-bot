const {
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    MessageFlags
} = require('discord.js');

module.exports = {
    data: { name: 'help', description: 'Xem hướng dẫn sử dụng Thiên Mộng Ca' },
    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setDescription(
                `# 📜 Hướng dẫn sử dụng Thiên Mộng Ca\n` +
                `Chào mừng đạo hữu **${interaction.user.username}**! Dưới đây là danh sách các lệnh.\n\n` +
                `### 🔰 Các nhóm chức năng\n` +
                `Vui lòng chọn danh mục ở menu bên dưới để xem chi tiết:`
            )
            .setImage('https://media1.tenor.com/m/7w8r1sFpQYcAAAAC/thien-mong-ca.gif');

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('help_menu')
            .setPlaceholder('🔻 Chọn mục trợ giúp tại đây...')
            .addOptions(
                // Chỉ giữ lại 3 mục này, đã xóa mục Admin
                new StringSelectMenuOptionBuilder().setLabel('Kinh tế & Ngân hàng').setValue('kinhte').setEmoji('💰'),
                new StringSelectMenuOptionBuilder().setLabel('Trò chơi & Giải trí').setValue('trochoi').setEmoji('🎲'),
                new StringSelectMenuOptionBuilder().setLabel('Tiện ích khác').setValue('tienich').setEmoji('🛠️'),
            );

        const row = new ActionRowBuilder().addComponents(selectMenu);

        await interaction.reply({
            embeds: [embed],
            components: [row],
            flags: MessageFlags.Ephemeral // Chỉ người dùng mới thấy
        });
    }
};