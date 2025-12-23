const { MessageFlags } = require('discord.js');
module.exports = {
    data: {
        name: 'say',
        description: 'Yêu cầu bot nói lại câu của bạn',
        options: [{ name: 'noidung', description: 'Nội dung', type: 3, required: true }]
    },
    async execute(interaction) {
        const text = interaction.options.getString('noidung');
        const timeLog = new Date().toLocaleString('vi-VN');
        console.log(`[${timeLog}] 🗣️ ${interaction.user.tag} (ID: ${interaction.user.id}) đã dùng /say: "${text}"`);

        await interaction.channel.send(text);
        await interaction.reply({ content: '✅ Đã gửi tin nhắn!', flags: MessageFlags.Ephemeral });
    }
};