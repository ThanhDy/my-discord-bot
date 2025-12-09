const { REST, Routes, Client, GatewayIntentBits } = require('discord.js');

// --- CẤU HÌNH ---
const TOKEN = process.env.TOKEN;      // Token của Bot
const CLIENT_ID = '1447762452937707681'; // Application ID 

const client = new Client({
    intents: [GatewayIntentBits.Guilds] // Slash command chỉ cần quyền Guilds
});

// 2. Hàm đăng ký lệnh lên Server của Discord
const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
    try {
        console.log('Đang đăng ký lệnh Slash (/) ...');

        await rest.put(
            Routes.applicationCommands(CLIENT_ID),
            { body: commands },
        );

        console.log('Đã đăng ký lệnh thành công! Hãy vào Discord thử gõ /');
    } catch (error) {
        console.error(error);
    }
})();

client.once('ready', () => {
    console.log(`Bot ${client.user.tag} đã online!`);
});

const commands = [
    {
        name: 'hello',
        description: 'Gửi lời chào đến các Hồn Sư',
    },
    {
        name: 'say',
        description: 'Yêu cầu bot nói lại câu của bạn',
        options: [
            {
                name: 'noidung',             // Tên biến (viết liền, không dấu)
                description: 'Nhập câu bạn muốn bot nói',
                type: 3,                     // Số 3 nghĩa là kiểu STRING (Văn bản)
                required: true               // Bắt buộc phải nhập mới gửi được lệnh
            }
        ]
    },
    {
        name: 'diemdanh',
        description: 'Điểm danh mỗi ngày',
    },
];

client.on('interactionCreate', async interaction => {
    // Nếu không phải là lệnh Slash thì bỏ qua
    if (!interaction.isChatInputCommand()) return;

    // Bắt đầu kiểm tra tên lệnh
    switch (interaction.commandName) {

        case 'hello':
            await interaction.reply('Ta là Thiên Mộng Ca');
            break;

        case 'say':
            const text = interaction.options.getString('noidung');
            await interaction.channel.send(text);
            await interaction.reply({
                content: '✅ Đã gửi tin nhắn ẩn danh thành công!',
                ephemeral: true
            });
            break;

        case 'diemdanh':
            await interaction.reply('Điểm danh thành công!');
            break;

        default:
            break;
    }
});

client.login(TOKEN);
