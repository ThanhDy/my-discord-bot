const { getUser, updateBalance, updateLastWork } = require('../../database');
const { MessageFlags } = require('discord.js');

module.exports = {
    data: { name: 'diemdanh', description: 'Điểm danh mỗi ngày (Reset lúc 5h sáng VN)' },
    async execute(interaction) {
        const userInfo = await getUser(interaction.user.id);
        const lastWorkTime = userInfo.lastWork || 0;

        // --- BẮT ĐẦU LOGIC TÍNH GIỜ ---
        const now = new Date();

        // 1. Giả lập giờ Việt Nam (UTC+7) để lấy đúng ngày/giờ "mặt số"
        // (Cộng 7 tiếng vào giờ UTC hiện tại)
        const OFFSET_VN = 7 * 60 * 60 * 1000;
        const nowVN = new Date(now.getTime() + OFFSET_VN);

        // 2. Tạo mốc 5h sáng của ngày hiện tại (theo giờ VN)
        // Lưu ý: Dùng các hàm getUTC/setUTC để thao tác trên timestamp đã cộng offset
        let resetTimeVN = new Date(nowVN);
        resetTimeVN.setUTCHours(5, 0, 0, 0);

        // 3. Logic "qua ngày":
        // Nếu giờ hiện tại (VN) nhỏ hơn 5h sáng -> Mốc reset tính là 5h sáng HÔM QUA
        if (nowVN.getUTCHours() < 5) {
            resetTimeVN.setUTCDate(resetTimeVN.getUTCDate() - 1);
        }

        // 4. Chuyển mốc reset về Timestamp thực tế (Trừ lại 7 tiếng offset đã cộng lúc đầu)
        // Đây là mốc thời gian thực tế của 5h sáng gần nhất
        const lastResetTimestamp = resetTimeVN.getTime() - OFFSET_VN;

        // --- KẾT THÚC LOGIC TÍNH GIỜ ---

        // Kiểm tra: Nếu lần làm việc cuối > mốc reset gần nhất -> Đã làm rồi
        if (lastWorkTime > lastResetTimestamp) {
            // Mốc reset tiếp theo là mốc cũ + 24h
            const nextResetTimestamp = lastResetTimestamp + (24 * 60 * 60 * 1000);

            // Chuyển sang Unix Timestamp (giây)
            const discordTimestamp = Math.floor(nextResetTimestamp / 1000);

            return interaction.reply({
                // <t:timestamp:t> -> Hiển thị giờ ngắn (VD: 05:00)
                // <t:timestamp:R> -> Hiển thị đếm ngược (VD: còn 10 giờ nữa)
                content: `🚫 Đạo hữu đã điểm danh hôm nay rồi! Hãy quay lại vào lúc **<t:${discordTimestamp}:t>** ngày mai (còn <t:${discordTimestamp}:T> nữa).`,
                flags: MessageFlags.Ephemeral
            });
        }

        // Thực hiện điểm danh
        const luong = Math.floor(Math.random() * (50000 - 10000 + 1)) + 10000;
        await updateBalance(interaction.user.id, luong);

        // Lưu thời gian thực (now) vào database
        await updateLastWork(interaction.user.id); // Code cũ của bạn có thể cần truyền tham số thời gian vào đây nếu hàm updateLastWork không tự lấy Date.now()

        await interaction.reply(`✅ **ĐIỂM DANH THÀNH CÔNG!**\nĐạo hữu vừa nhận được **${luong.toLocaleString('vi-VN')} Kim Hồn Tệ** cho ngày hôm nay.`);
    }
};