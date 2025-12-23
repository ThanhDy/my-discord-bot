const { getUser, updateBalance, updateLastWork } = require('../../database');
const { MessageFlags } = require('discord.js');

module.exports = {
    data: { name: 'diemdanh', description: 'Điểm danh mỗi ngày (Reset lúc 5h sáng VN)' },
    async execute(interaction) {
        const userInfo = await getUser(interaction.user.id);
        const lastWorkTime = userInfo.lastWork || 0;

        // --- BẮT ĐẦU LOGIC TÍNH GIỜ ---
        const now = new Date();

        // 1. Giả lập giờ Việt Nam (UTC+7)
        const OFFSET_VN = 7 * 60 * 60 * 1000;
        const nowVN = new Date(now.getTime() + OFFSET_VN);

        // 2. Tạo mốc 5h sáng của ngày hiện tại (theo giờ VN)
        let resetTimeVN = new Date(nowVN);
        resetTimeVN.setUTCHours(5, 0, 0, 0);

        // 3. Logic "qua ngày": Nếu giờ hiện tại < 5h sáng -> Mốc reset là 5h sáng HÔM QUA
        if (nowVN.getUTCHours() < 5) {
            resetTimeVN.setUTCDate(resetTimeVN.getUTCDate() - 1);
        }

        // 4. Chuyển mốc reset về Timestamp thực tế
        const lastResetTimestamp = resetTimeVN.getTime() - OFFSET_VN;
        // --- KẾT THÚC LOGIC TÍNH GIỜ ---

        // KIỂM TRA: Nếu đã điểm danh rồi
        if (lastWorkTime > lastResetTimestamp) {
            // Mốc reset tiếp theo là mốc cũ + 24h
            const nextResetTimestamp = lastResetTimestamp + (24 * 60 * 60 * 1000);

            // Tính thời gian còn lại (mili giây)
            const timeLeft = nextResetTimestamp - now.getTime();

            // Đổi ra Giờ, Phút, Giây
            const hours = Math.floor(timeLeft / (1000 * 60 * 60));
            const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

            return interaction.reply({
                content: `🚫 Đạo hữu đã điểm danh hôm nay rồi! Hãy quay lại vào lúc **5h sáng mai** (còn **${hours} giờ ${minutes} phút ${seconds} giây** nữa).`,
                flags: MessageFlags.Ephemeral
            });
        }

        // Thực hiện điểm danh
        const luong = Math.floor(Math.random() * (50000 - 10000 + 1)) + 10000;
        await updateBalance(interaction.user.id, luong);

        // Lưu thời gian thực (now) vào database
        await updateLastWork(interaction.user.id);

        await interaction.reply(`✅ **ĐIỂM DANH THÀNH CÔNG!**\nĐạo hữu vừa nhận được **${luong.toLocaleString('vi-VN')} Kim Hồn Tệ** cho ngày hôm nay.`);
    }
};