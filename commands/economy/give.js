const { getUser } = require('../../database');

module.exports = {
    data: {
        name: 'give',
        description: 'Chuyển Kim Hồn Tệ cho người khác',
        options: [
            { name: 'nguoi_nhan', description: 'Chọn người nhận tiền', type: 6, required: true },
            { name: 'so_tien', description: 'Số tiền muốn chuyển', type: 4, required: true, min_value: 1 }
        ]
    },
    async execute(interaction) {
        const receiverUser = interaction.options.getUser('nguoi_nhan');
        const amountToGive = interaction.options.getInteger('so_tien');
        const user = interaction.user;

        if (user.id === receiverUser.id) {
            return interaction.reply({ content: '🚫 Không thể tự chuyển tiền cho chính mình!' });
        }
        if (receiverUser.bot) {
            return interaction.reply({ content: '🤖 Bot tu luyện bằng điện, không cần Kim Hồn Tệ!' });
        }

        const senderProfile = await getUser(user.id);
        const receiverProfile = await getUser(receiverUser.id);

        if (senderProfile.balance < amountToGive) {
            return interaction.reply({
                content: `⚠️ **Không đủ tiền!**\nĐạo hữu chỉ có **${senderProfile.balance.toLocaleString()}**, không đủ để chuyển **${amountToGive.toLocaleString()}**.`,
            });
        }

        senderProfile.balance -= amountToGive;
        receiverProfile.balance += amountToGive;
        await senderProfile.save();
        await receiverProfile.save();

        await interaction.reply(`💸 **GIAO DỊCH THÀNH CÔNG!**\n<@${user.id}> đã chuyển **${amountToGive.toLocaleString()} Kim Hồn Tệ** cho <@${receiverUser.id}>.`);
    }
};