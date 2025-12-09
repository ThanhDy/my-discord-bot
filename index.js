// 1. KHAI BÁO THƯ VIỆN
const { REST, Routes, Client, GatewayIntentBits, MessageFlags } = require('discord.js');
const http = require('http'); // Thêm thư viện http để tạo server giả

// 2. CẤU HÌNH TOKEN (Lấy từ biến môi trường Render)
const TOKEN = process.env.TOKEN;
const CLIENT_ID = '1447762452937707681'; // ID Bot của bạn

// 3. TẠO SERVER GIẢ LẬP (Để Render không tắt Bot - Fix lỗi Port scan timeout)
const port = process.env.PORT || 3000;
const server = http.createServer((req, res) => {
    res.writeHead(200);
    res.end('Bot Discord dang hoat dong!');
});
server.listen(port, '0.0.0.0', () => {
    console.log(`Server is listening on port ${port}`);
});




const client = new Client({
    intents: [GatewayIntentBits.Guilds] // Slash command chỉ cần quyền Guilds
});
// 1. Định nghĩa lệnh Slash (/) cho bot
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
    {
        name: 'donate',
        description: 'Ủng hộ bot để phát triển hơn',
    },
];

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
                content: '✅ Đã gửi tin nhắn!',
                flags: MessageFlags.Ephemeral
            });
            break;

        case 'diemdanh':
            await interaction.reply('Điểm danh thành công!');
            break;

        case 'donate':
            await interaction.reply('STK: 456799799 - VIB');
            break;

        default:
            break;
    }
});

client.login(TOKEN);