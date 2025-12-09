// 1. KHAI BÁO THƯ VIỆN
const { REST, Routes, Client, GatewayIntentBits, MessageFlags } = require('discord.js');
const http = require('http');
const fs = require('fs');

// 2. CẤU HÌNH TOKEN
const TOKEN = process.env.TOKEN;
const CLIENT_ID = '1447762452937707681';
const ADMIN_ID = '685083491552985101';

// 3. TẠO SERVER GIẢ LẬP (QUAN TRỌNG: Để server lên đầu để Render nhận diện ngay)
const port = process.env.PORT || 3000;
const server = http.createServer((req, res) => {
    res.writeHead(200);
    res.end('Bot Discord dang hoat dong!');
});
server.listen(port, '0.0.0.0', () => {
    console.log(`Server is listening on port ${port}`);
});

// ================= HÀM XỬ LÝ TIỀN TỆ (DATABASE AN TOÀN) =================
const DATA_FILE = 'money.json';

// Hàm lấy dữ liệu (Đã thêm chống lỗi Crash)
function getData() {
    // Nếu file không tồn tại, tạo mới
    if (!fs.existsSync(DATA_FILE)) {
        fs.writeFileSync(DATA_FILE, JSON.stringify({}));
        return {};
    }

    try {
        const rawData = fs.readFileSync(DATA_FILE);
        // Nếu file rỗng, trả về object rỗng luôn để tránh lỗi JSON.parse
        if (rawData.length === 0) {
            return {};
        }
        return JSON.parse(rawData);
    } catch (error) {
        console.error("Lỗi đọc file JSON, đang reset database:", error);
        // Nếu file lỗi (corrupted), reset về rỗng để bot không bị chết
        fs.writeFileSync(DATA_FILE, JSON.stringify({}));
        return {};
    }
}

function saveData(data) {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error("Lỗi khi lưu file:", error);
    }
}

function getUser(userId) {
    const data = getData();
    // Kiểm tra kỹ cấu trúc dữ liệu để tránh lỗi
    if (!data[userId] || typeof data[userId] !== 'object') {
        data[userId] = { balance: 0, lastWork: 0 };
        saveData(data);
    }
    return data[userId];
}

function updateBalance(userId, amount) {
    const data = getData();
    if (!data[userId] || typeof data[userId] !== 'object') {
        data[userId] = { balance: 0, lastWork: 0 };
    }
    data[userId].balance += amount;
    saveData(data);
    return data[userId].balance;
}

function updateLastWork(userId) {
    const data = getData();
    if (!data[userId] || typeof data[userId] !== 'object') {
        data[userId] = { balance: 0, lastWork: 0 };
    }
    data[userId].lastWork = Date.now();
    saveData(data);
}

// ================= KHỞI TẠO BOT =================
const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

// 4. ĐỊNH NGHĨA DANH SÁCH LỆNH
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
                name: 'noidung',
                description: 'Nhập câu bạn muốn bot nói',
                type: 3,
                required: true
            }
        ]
    },
    {
        name: 'diemdanh',
        description: 'Điểm danh mỗi ngày nhận Kim Hồn Tệ',
    },
    {
        name: 'tien',
        description: 'Xem số dư tài khoản của bạn',
    },
    {
        name: 'taixiu',
        description: 'Chơi tài xỉu',
        options: [
            {
                name: 'chon',
                description: 'Chọn Tài hoặc Xỉu',
                type: 3,
                required: true,
                choices: [
                    { name: 'Tài', value: 'tai' },
                    { name: 'Xỉu', value: 'xiu' }
                ]
            },
            {
                name: 'tiencuoc',
                description: 'Số tiền muốn cược',
                type: 4,
                required: true,
                min_value: 1
            }
        ]
    },
    {
        name: 'setmoney',
        description: 'ADMIN ONLY: Chỉnh sửa số tiền của người chơi',
        options: [
            {
                name: 'nguoi_choi',
                description: 'Chọn người cần chỉnh tiền',
                type: 6, // Type 6 là USER (Người dùng)
                required: true
            },
            {
                name: 'so_tien',
                description: 'Nhập số tiền mong muốn (Nhập số âm để trừ)',
                type: 4, // Integer
                required: true
            }
        ]
    },
];

// 5. ĐĂNG KÝ LỆNH
const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
    try {
        console.log('Đang đăng ký lệnh Slash (/) ...');
        await rest.put(
            Routes.applicationCommands(CLIENT_ID),
            { body: commands },
        );
        console.log('Đã đăng ký lệnh thành công!');
    } catch (error) {
        console.error(error);
    }
})();

// 6. XỬ LÝ SỰ KIỆN
client.once('ready', () => {
    console.log(`Bot ${client.user.tag} đã online!`);
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName, user } = interaction;

    try { // Thêm Try-Catch tổng để bắt mọi lỗi ngầm
        switch (commandName) {

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
                });
                break;

            case 'diemdanh':
                const userInfo = getUser(user.id);
                const now = Date.now();
                const cooldownTime = 24 * 60 * 60 * 1000;
                const timeDiff = now - userInfo.lastWork;

                if (timeDiff < cooldownTime) {
                    const timeLeft = cooldownTime - timeDiff;
                    const hours = Math.floor(timeLeft / (1000 * 60 * 60));
                    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
                    await interaction.reply({
                        content: `Đạo hữu đã điểm danh rồi! Quay lại sau **${hours}h ${minutes}p** nữa nhé.`,
                        flags: MessageFlags.Ephemeral
                    });
                    break;
                }

                const luong = Math.floor(Math.random() * (20 - 5 + 1)) + 5;
                updateBalance(user.id, luong);
                updateLastWork(user.id);
                await interaction.reply(`Điểm danh thành công. Nhận **${luong} Kim Hồn Tệ**!`);
                break;

            case 'tien':
                const userData = getUser(user.id);
                await interaction.reply(`Đạo hữu đang có **${userData.balance.toLocaleString()} Kim Hồn Tệ**`);
                break;

            case 'taixiu':
                const luaChon = interaction.options.getString('chon');
                const tienCuoc = interaction.options.getInteger('tiencuoc');
                const profile = getUser(user.id);

                if (profile.balance < tienCuoc) {
                    await interaction.reply({
                        content: `Nghèo vailol đòi chơi game!`,
                    });
                    break;
                }

                const d1 = Math.floor(Math.random() * 6) + 1;
                const d2 = Math.floor(Math.random() * 6) + 1;
                const d3 = Math.floor(Math.random() * 6) + 1;
                const tong = d1 + d2 + d3;
                const ketQuaGame = (tong >= 11) ? 'tai' : 'xiu';
                const tenKetQua = (tong >= 11) ? 'TÀI' : 'XỈU';

                if (d1 === d2 && d2 === d3) {
                    updateBalance(user.id, -tienCuoc);
                    await interaction.reply(`🎲 **${d1}-${d2}-${d3}** (Tổng: ${tong})\n⚡ **BÃO!** Nhà cái ăn hết.`);
                    break;
                }

                if (luaChon === ketQuaGame) {
                    updateBalance(user.id, tienCuoc);
                    await interaction.reply(`🎲 **${d1}-${d2}-${d3}** (Tổng: ${tong} -> **${tenKetQua}**)\n✅ Chọn **${luaChon.toUpperCase()}** -> **THẮNG!** Bú ${tienCuoc} Kim Hồn Tệ`);
                } else {
                    updateBalance(user.id, -tienCuoc);
                    await interaction.reply(`🎲 **${d1}-${d2}-${d3}** (Tổng: ${tong} -> **${tenKetQua}**)\n❌ Chọn **${luaChon.toUpperCase()}** -> **THUA!** Bay ${tienCuoc} Kim Hồn Tệ`);
                }
                break;

            case 'setmoney':
                // 1. Kiểm tra quyền Admin (Chỉ ID của bạn mới được dùng)
                if (user.id !== ADMIN_ID) {
                    await interaction.reply({
                        content: '🚫 **CẢNH BÁO:** Đạo hữu không phải Thiên Đạo! Đừng cố nghịch thiên.',
                    });
                    break;
                }

                // 2. Lấy thông tin từ lệnh
                const targetUser = interaction.options.getUser('nguoi_choi');
                const newAmount = interaction.options.getInteger('so_tien');

                // 3. Can thiệp vào database
                const targetData = getUser(targetUser.id); // Lấy data người đó
                targetData.balance = newAmount; // Gán tiền mới
                saveData(getData()); // Lưu lại ngay lập tức (Lưu ý: hàm saveData phải gọi đúng data tổng)

                // *Mẹo sửa nhanh hàm saveData để dòng trên hoạt động:*
                // Thay vì gọi saveData(getData()), ta sửa logic update thủ công 1 chút cho an toàn:
                const allData = getData();
                if (!allData[targetUser.id]) allData[targetUser.id] = { balance: 0, lastWork: 0 };
                allData[targetUser.id].balance = newAmount;
                saveData(allData);

                await interaction.reply(
                    `<@${targetUser.id}> một bước Hoá Thần, nhận **${newAmount.toLocaleString()} Kim Hồn Tệ**.`
                );
                break;

            default:
                break;
        }
    } catch (err) {
        console.error(err);
        // Nếu có lỗi bất ngờ, báo cho user biết thay vì im lặng
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: 'Có lỗi xảy ra khi xử lý lệnh! (Lỗi Database đã được ghi lại)', flags: MessageFlags.Ephemeral });
        }
    }
});

client.login(TOKEN);