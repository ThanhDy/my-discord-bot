module.exports = {
    data: { name: 'hello', description: 'Gửi lời chào đến các Hồn Sư' },
    async execute(interaction) {
        await interaction.reply('Ta là Thiên Mộng Ca');
    }
};