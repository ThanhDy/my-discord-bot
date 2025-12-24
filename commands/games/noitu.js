const { createGame, stopGame, getRandomWord } = require('../../database'); // <--- Nhớ import getRandomWord
const { MessageFlags, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: {
        name: 'noitu',
        description: 'Quản lý trò chơi Nối Từ',
        options: [
            {
                name: 'action',
                description: 'Chọn hành động',
                type: 3,
                required: true,
                choices: [
                    { name: 'Start', value: 'start' },
                    { name: 'Stop', value: 'stop' }
                ]
            }
        ]
    },
    async execute(interaction) {
        const action = interaction.options.getString('action');

        if (action === 'start') {
            // 1. Lấy từ ngẫu nhiên từ Database
            const randomWord = getRandomWord();

            // 2. Tách lấy tiếng cuối (VD: "mây trắng" -> lấy "trắng")
            const words = randomWord.split(/\s+/);
            const lastSyllable = words[words.length - 1];

            // 3. Tạo game mới
            await createGame(interaction.channelId, lastSyllable);

            await interaction.reply(
                `🎮 **GAME NỐI TỪ BẮT ĐẦU!**\n` +
                `Nối tiếp từ: **"${randomWord.toUpperCase()}"**`
            );
        }
        else if (action === 'stop') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
                return interaction.reply({ content: '🚫 Chỉ Quản trị viên mới được dừng game!', flags: MessageFlags.Ephemeral });
            }

            await stopGame(interaction.channelId);
            await interaction.reply('🛑 Đã kết thúc game Nối Từ tại kênh này.');
        }
    }
};