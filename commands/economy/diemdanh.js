const { getUser, updateBalance, updateLastWork } = require('../../database');
const { MessageFlags } = require('discord.js');

module.exports = {
    data: { name: 'diemdanh', description: 'Điểm danh mỗi ngày (Reset lúc 5h sáng)' },
    async execute(interaction) {
        const userInfo = await getUser(interaction.user.id);
        const lastWorkTime = userInfo.lastWork; // Thời gian điểm danh lần cuối

        // 1. Tính toán mốc 5h sáng của chu kỳ hiện tại
        const now = new Date();
        // Chuyển giờ hiện tại về múi giờ Việt Nam (UTC+7) để tính toán cho chuẩn nếu server đặt ở nước ngoài
        // (Tuy nhiên Date.now() trả về timestamp quốc tế nên ta so sánh timestamp là an toàn nhất)

        // Tạo mốc reset: 5h sáng hôm nay
        let resetTime = new Date();
        resetTime.setHours(5, 0, 0, 0);

        // Nếu bây giờ là 2h sáng (nhỏ hơn 5h) -> Mốc reset phải là 5h sáng HÔM QUA
        if (now < resetTime) {
            resetTime.setDate(resetTime.getDate() - 1);
        }

        // 2. Kiểm tra điều kiện
        // Nếu lần điểm danh cuối cùng diễn ra SAU mốc reset -> Nghĩa là hôm nay đã điểm danh rồi
        if (lastWorkTime > resetTime.getTime()) {
            // Tính thời gian đến đợt reset tiếp theo (5h sáng ngày mai)
            const nextReset = new Date(resetTime);
            nextReset.setDate(nextReset.getDate() + 1);

            const timeLeft = nextReset - now;
            const hours = Math.floor(timeLeft / (1000 * 60 * 60));
            const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

            return interaction.reply({
                content: `🌅 Đạo hữu đã điểm danh ngày hôm nay rồi! Hãy quay lại sau **5h sáng mai** (còn khoảng **${hours}h ${minutes}p** nữa).`,
                flags: MessageFlags.Ephemeral
            });
        }

        // 3. Thực hiện điểm danh
        const luong = Math.floor(Math.random() * (50000 - 10000 + 1)) + 10000;
        await updateBalance(interaction.user.id, luong);
        await updateLastWork(interaction.user.id);

        await interaction.reply(`✅ **ĐIỂM DANH THÀNH CÔNG!**\nĐạo hữu vừa nhận được **${luong.toLocaleString()} Kim Hồn Tệ** cho ngày hôm nay.`);
    }
};