const { getUser, updateBalance } = require('../../database');

module.exports = {
    data: {
        name: 'taixiu',
        description: 'Chơi tài xỉu',
        options: [
            { name: 'chon', description: 'Chọn Tài hoặc Xỉu', type: 3, required: true, choices: [{ name: 'Tài', value: 'tai' }, { name: 'Xỉu', value: 'xiu' }] },
            { name: 'tiencuoc', description: 'Số tiền muốn cược', type: 4, required: true, min_value: 1 }
        ]
    },
    async execute(interaction) {
        const luaChon = interaction.options.getString('chon');
        const tienCuoc = interaction.options.getInteger('tiencuoc');
        const profile = await getUser(interaction.user.id);

        if (profile.balance < tienCuoc) {
            return interaction.reply({ content: `Nghèo vailol đòi chơi game!` });
        }

        const d1 = Math.floor(Math.random() * 6) + 1;
        const d2 = Math.floor(Math.random() * 6) + 1;
        const d3 = Math.floor(Math.random() * 6) + 1;
        const tong = d1 + d2 + d3;
        const ketQuaGame = (tong >= 11) ? 'tai' : 'xiu';
        const tenKetQua = (tong >= 11) ? 'TÀI' : 'XỈU';

        if (d1 === d2 && d2 === d3) {
            await updateBalance(interaction.user.id, -tienCuoc);
            return interaction.reply(`🎲 **${d1}-${d2}-${d3}** (Tổng: ${tong})\n⚡ **BÃO!** Nhà cái ăn hết.`);
        }

        if (luaChon === ketQuaGame) {
            await updateBalance(interaction.user.id, tienCuoc);
            await interaction.reply(`🎲 **${d1}-${d2}-${d3}** (Tổng: ${tong} -> **${tenKetQua}**)\n✅ Chọn **${luaChon.toUpperCase()}** -> **THẮNG!** Bú ${tienCuoc} Kim Hồn Tệ`);
        } else {
            await updateBalance(interaction.user.id, -tienCuoc);
            await interaction.reply(`🎲 **${d1}-${d2}-${d3}** (Tổng: ${tong} -> **${tenKetQua}**)\n❌ Chọn **${luaChon.toUpperCase()}** -> **THUA!** Bay ${tienCuoc} Kim Hồn Tệ`);
        }
    }
};