const { createGame, stopGame, getRandomWord, getGame } = require('../../database'); // <--- Nhớ import getRandomWord
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
            // Kiểm tra xem đã có game đang chạy chưa để tránh reset nhầm
            const existingGame = await getGame(interaction.channelId);
            if (existingGame) {
                return interaction.reply({
                    content: 'Game đang chạy rồi! Nếu muốn chơi lại, hãy dùng lệnh `/noitu action:Stop`.'
                });
            }

            await startNewGame(interaction, "🎮 **GAME NỐI TỪ BẮT ĐẦU!**");


        } else if (action === 'stop') {
            const game = await getGame(interaction.channelId);
            if (!game) {
                return interaction.reply({ content: '❓ Kênh này chưa có game nào để reset.', flags: MessageFlags.Ephemeral });
            }

            // Gửi tin nhắn Vote (Lưu ý: fetchReply: true để lấy tin nhắn về xử lý)
            const msg = await interaction.reply({
                content: `🗳️ **VOTE RESET GAME**\n` +
                    `<@${interaction.user.id}> muốn làm mới ván chơi.\n` +
                    `Ít nhất 2 người đồng ý để reset.\n` +
                    `⏳ Thời gian chờ: 30 giây.`,
                fetchReply: true
            });

            // Bot tự thả reaction mẫu
            try {
                await msg.react('🔄');
            } catch (error) {
                console.error('Không thể thả reaction (Thiếu quyền?):', error);
            }

            // Tạo bộ lọc: Chỉ chấp nhận icon 🔄 và người thả không phải là Bot
            const filter = (reaction, user) => {
                return reaction.emoji.name === '🔄' && !user.bot;
            };

            msg.awaitReactions({ filter, max: 1, time: 30000, errors: ['time'] })
                .then(async collected => {
                    // --- KHI CÓ NGƯỜI THẢ ICON ---
                    const reaction = collected.first();
                    // const user = reaction.users.cache.find(u => !u.bot); // Lấy tên người vừa bấm nếu cần

                    // Thực hiện Reset Game
                    await startNewGame(interaction, `🆕 **VÁN MỚI BẮT ĐẦU NGAY!**`);
                })
                .catch(async () => {
                    // --- KHI HẾT GIỜ MÀ KHÔNG AI BẤM ---
                    // Sửa lại tin nhắn báo thất bại
                    await interaction.editReply({
                        content: `❌ **VOTE THẤT BẠI!**\nGame vẫn tiếp tục.`
                    });
                    // Xóa reaction của bot cho đỡ rác
                    msg.reactions.removeAll().catch(() => { });
                });
        }

    }
};

async function startNewGame(interaction, titleMessage) {
    const randomWord = getRandomWord();
    const words = randomWord.split(/\s+/);
    const lastSyllable = words[words.length - 1];

    // Tạo game mới
    await createGame(interaction.channelId, lastSyllable);

    // Gửi thông báo (Nếu là reaction thì phải dùng followUp vì reply đã dùng rồi)
    const content = `${titleMessage}\n` +
        `Nối tiếp từ: **"${randomWord.toUpperCase()}"**`;

    if (interaction.replied) {
        await interaction.followUp(content);
    } else {
        await interaction.reply(content); // Fallback cho trường hợp start thường
    }
}