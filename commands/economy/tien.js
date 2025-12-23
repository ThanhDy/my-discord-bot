const { getUser } = require('../../database');

module.exports = {
    data: { name: 'tien', description: 'Xem số dư tài khoản của bạn' },
    async execute(interaction) {
        const userData = await getUser(interaction.user.id);
        await interaction.reply(`Đạo hữu đang có **${userData.balance.toLocaleString()} Kim Hồn Tệ**`);
    }
};