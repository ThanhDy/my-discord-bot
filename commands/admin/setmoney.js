const { getUser } = require('../../database');
const { MessageFlags } = require('discord.js');
const ADMIN_ID = '685083491552985101'; // ID Admin của bạn

module.exports = {
    data: {
        name: 'setmoney',
        description: 'ADMIN ONLY: Chỉnh sửa số tiền của người chơi',
        options: [
            { name: 'nguoi_choi', description: 'Chọn người cần chỉnh tiền', type: 6, required: true },
            { name: 'so_tien', description: 'Nhập số tiền mong muốn (Nhập số âm để trừ)', type: 4, required: true }
        ]
    },
    async execute(interaction) {
        if (interaction.user.id !== ADMIN_ID) {
            return interaction.reply({ content: '🚫 Đạo hữu không phải Thiên Đạo!', flags: MessageFlags.Ephemeral });
        }

        const targetUser = interaction.options.getUser('nguoi_choi');
        const amountToAdd = interaction.options.getInteger('so_tien');
        let targetData = await getUser(targetUser.id);

        if (amountToAdd < 0 && targetData.balance <= 0) {
            await interaction.channel.send(`🛑 **THIÊN ĐẠO DỪNG TAY!**\n<@${targetUser.id}> hiện tại đã "khố rách áo ôm" (0 Kim Hồn Tệ).`);
            return interaction.reply({ content: 'Người chơi đã hết tiền.', flags: MessageFlags.Ephemeral });
        }

        targetData.balance += amountToAdd;
        if (targetData.balance < 0) targetData.balance = 0;
        await targetData.save();

        if (amountToAdd > 0) {
            await interaction.channel.send(`🌅 **THIÊN ĐẠO BAN PHÚC!**\n<@${targetUser.id}> vừa nhận được cơ duyên, túi tiền tăng thêm **${amountToAdd.toLocaleString()} Kim Hồn Tệ**.\n💰 Số dư hiện tại: **${targetData.balance.toLocaleString()}**`);
        } else if (amountToAdd < 0) {
            const positiveNum = Math.abs(amountToAdd);
            await interaction.channel.send(`⚡ **THIÊN ĐẠO TRỪNG PHẠT!**\n<@${targetUser.id}> làm điều nghịch thiên, bị tước đi **${positiveNum.toLocaleString()} Kim Hồn Tệ**.\n💸 Số dư hiện tại: **${targetData.balance.toLocaleString()}**`);
        } else {
            await interaction.channel.send(`Thiên Đạo đi ngang qua <@${targetUser.id}> nhưng không làm gì cả.`);
        }
        await interaction.reply({ content: '✅ Đã thực hiện lệnh thành công!', flags: MessageFlags.Ephemeral });
    }
};