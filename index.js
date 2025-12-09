// 1. KHAI BÁO THƯ VIỆN
const { REST, Routes, Client, GatewayIntentBits, MessageFlags } = require('discord.js');
const http = require('http'); // Thêm thư viện http để tạo server giả
const fs = require('fs'); // Thư viện đọc ghi file

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


// ================= HÀM XỬ LÝ TIỀN TỆ (DATABASE) =================
const DATA_FILE = 'money.json';

// Hàm lấy dữ liệu tiền từ file
function getData() {
    if (!fs.existsSync(DATA_FILE)) {
        fs.writeFileSync(DATA_FILE, JSON.stringify({}));
    }
    return JSON.parse(fs.readFileSync(DATA_FILE));
}

// Lưu dữ liệu
function saveData(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// Lấy thông tin user (tự tạo mới nếu chưa có)
function getUser(userId) {
    const data = getData();
    if (!data[userId]) {
        data[userId] = { balance: 0, lastWork: 0 }; // Cấu trúc mới: Vừa có tiền, vừa có thời gian
        saveData(data);
    }
    return data[userId];
}

// Cộng/Trừ tiền
function updateBalance(userId, amount) {
    const data = getData();
    if (!data[userId]) data[userId] = { balance: 0, lastWork: 0 };

    data[userId].balance += amount;
    saveData(data);
    return data[userId].balance;
}

// Cập nhật thời gian làm việc
function updateLastWork(userId) {
    const data = getData();
    if (!data[userId]) data[userId] = { balance: 0, lastWork: 0 };

    data[userId].lastWork = Date.now(); // Lưu thời gian hiện tại (tính bằng mili giây)
    saveData(data);
}

// ================= HÀM XỬ LÝ TIỀN TỆ (DATABASE) =================

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
        name: 'donate',
        description: 'Ủng hộ bot để phát triển hơn',
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
        description: 'Điểm danh mỗi ngày nhận Kim Hồn Tệ',
    },
    {
        name: 'tien', // Lệnh xem tiền
        description: 'Xem số dư tài khoản của bạn',
    },
    {
        name: 'taixiu', // Lệnh chơi game
        description: 'Chơi tài xỉu: 3-10 là Xỉu, 11-18 là Tài',
        options: [
            {
                name: 'chon',
                description: 'Chọn Tài hoặc Xỉu',
                type: 3, // String
                required: true,
                choices: [
                    { name: 'Tài (11-18)', value: 'tai' },
                    { name: 'Xỉu (3-10)', value: 'xiu' }
                ]
            },
            {
                name: 'tiencuoc',
                description: 'Số tiền muốn cược',
                type: 4, // Integer (Số nguyên)
                required: true,
                min_value: 1 // Cược ít nhất 1 đồng
            }
        ]
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
    if (!interaction.isChatInputCommand()) return;

    switch (interaction.commandName) {

        case 'hello':
            await interaction.reply('Ta là Thiên Mộng Ca');
            break;

        case 'donate':
            await interaction.reply('STK: 456799799 - VIB');
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
            const userInfo = getUser(user.id);
            const now = Date.now();
            const cooldownTime = 24 * 60 * 60 * 1000; // 24 giờ tính bằng mili giây
            const timeDiff = now - userInfo.lastWork;

            // Kiểm tra nếu chưa đủ 24h
            if (timeDiff < cooldownTime) {
                const timeLeft = cooldownTime - timeDiff;
                const hours = Math.floor(timeLeft / (1000 * 60 * 60));
                const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

                await interaction.reply({
                    content: `Bạn đã điểm danh hôm nay rồi! Hãy quay lại sau **${hours} giờ ${minutes} phút** nữa nhé.`,
                    flags: MessageFlags.Ephemeral
                });
                break;
            }

            // Nếu được làm việc:
            // Random từ 5 đến 20
            const luong = Math.floor(Math.random() * (20 - 5 + 1)) + 5;

            updateBalance(user.id, luong); // Cộng tiền
            updateLastWork(user.id);       // Lưu thời gian làm việc

            await interaction.reply(`Điểm danh thành công. Nhận **${luong} Kim Hồn Tệ**!`);
            break;

        case 'tien':
            const tien = getBalance(user.id);
            await interaction.reply(`Bạn đang có **${tien.toLocaleString()} Kim Hồn Tệ**`);
            break;

        case 'taixiu':
            const luaChon = interaction.options.getString('chon');
            const tienCuoc = interaction.options.getInteger('tiencuoc');
            const tienHienCo = getBalance(user.id);

            // Kiểm tra đủ tiền không
            if (tienHienCo < tienCuoc) {
                await interaction.reply({
                    content: `Nghèo vailol đòi chơi game`,
                    flags: MessageFlags.Ephemeral
                });
                break;
            }

            // Game Logic
            const d1 = Math.floor(Math.random() * 6) + 1;
            const d2 = Math.floor(Math.random() * 6) + 1;
            const d3 = Math.floor(Math.random() * 6) + 1;
            const tong = d1 + d2 + d3;
            const ketQuaGame = (tong >= 11) ? 'tai' : 'xiu';
            const tenKetQua = (tong >= 11) ? 'TÀI' : 'XỈU';

            // Xử lý Bão (3 số giống nhau) -> Thua
            if (d1 === d2 && d2 === d3) {
                updateBalance(user.id, -tienCuoc);
                await interaction.reply(
                    `🎲 **${d1}-${d2}-${d3}** (Tổng: ${tong})\n⚡ **BÃO!** Nhà cái ăn hết.\n💸 Bạn trắng tay**.`
                );
                break;
            }

            // Xử lý Thắng/Thua
            if (luaChon === ketQuaGame) {
                updateBalance(user.id, tienCuoc);
                await interaction.reply(
                    `🎲 **${d1}-${d2}-${d3}** (Tổng: ${tong} -> **${tenKetQua}**)\n✅ Bạn chọn **${luaChon.toUpperCase()}** -> **THẮNG!**\n💰 +${tienCuoc} Kim Hồn Tệ.`
                );
            } else {
                updateBalance(user.id, -tienCuoc);
                await interaction.reply(
                    `🎲 **${d1}-${d2}-${d3}** (Tổng: ${tong} -> **${tenKetQua}**)\n❌ Bạn chọn **${luaChon.toUpperCase()}** -> **THUA!**\n💸 -${tienCuoc} Kim Hồn Tệ.`
                );
            }
            break;

        default:
            break;
    }
});

client.login(TOKEN);