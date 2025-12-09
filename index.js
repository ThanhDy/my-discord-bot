// 1. KHAI BÁO THƯ VIỆN
const { REST, Routes, Client, GatewayIntentBits, MessageFlags } = require('discord.js');
const http = require('http');
const mongoose = require('mongoose'); // Thay fs bằng mongoose

// 2. CẤU HÌNH TOKEN
const TOKEN = process.env.TOKEN;
const MONGO_URI = process.env.MONGO_URI; // Lấy link Mongo từ biến môi trường
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

// ================= KẾT NỐI MONGODB =================
mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ Đã kết nối với MongoDB!'))
    .catch((err) => console.error('❌ Lỗi kết nối MongoDB:', err));

// Định nghĩa cấu trúc User (Schema)
const userSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    balance: { type: Number, default: 0 },
    lastWork: { type: Number, default: 0 }
});

const User = mongoose.model('User', userSchema);

// ================= HÀM XỬ LÝ DATABASE (MONGODB) =================
// Lưu ý: Các hàm này giờ là ASYNC (Bất đồng bộ) nên khi gọi phải có AWAIT

async function getUser(id) {
    let user = await User.findOne({ userId: id });
    if (!user) {
        user = new User({ userId: id, balance: 0, lastWork: 0 });
        await user.save();
    }
    return user;
}

async function updateBalance(id, amount) {
    const user = await getUser(id);
    user.balance += amount;
    await user.save();
    return user.balance;
}

async function updateLastWork(id) {
    const user = await getUser(id);
    user.lastWork = Date.now();
    await user.save();
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
    {
        name: 'give',
        description: 'Chuyển Kim Hồn Tệ cho người khác',
        options: [
            {
                name: 'nguoi_nhan',
                description: 'Chọn người nhận tiền',
                type: 6, // USER
                required: true
            },
            {
                name: 'so_tien',
                description: 'Số tiền muốn chuyển',
                type: 4, // INTEGER
                required: true,
                min_value: 1 // Chỉ được chuyển số dương
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

    try {
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
                    flags: MessageFlags.Ephemeral
                });
                break;

            case 'diemdanh':
                // Sử dụng await vì gọi Database
                const userInfo = await getUser(user.id);
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
                await updateBalance(user.id, luong); // await
                await updateLastWork(user.id);       // await
                await interaction.reply(`Điểm danh thành công. Nhận **${luong} Kim Hồn Tệ**!`);
                break;

            case 'tien':
                // Sử dụng await vì gọi Database
                const userData = await getUser(user.id);
                await interaction.reply(`Đạo hữu đang có **${userData.balance.toLocaleString()} Kim Hồn Tệ**`);
                break;

            case 'taixiu':
                const luaChon = interaction.options.getString('chon');
                const tienCuoc = interaction.options.getInteger('tiencuoc');
                // Sử dụng await vì gọi Database
                const profile = await getUser(user.id);

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
                    await updateBalance(user.id, -tienCuoc); // await
                    await interaction.reply(`🎲 **${d1}-${d2}-${d3}** (Tổng: ${tong})\n⚡ **BÃO!** Nhà cái ăn hết.`);
                    break;
                }

                if (luaChon === ketQuaGame) {
                    await updateBalance(user.id, tienCuoc); // await
                    await interaction.reply(`🎲 **${d1}-${d2}-${d3}** (Tổng: ${tong} -> **${tenKetQua}**)\n✅ Chọn **${luaChon.toUpperCase()}** -> **THẮNG!** Bú ${tienCuoc} Kim Hồn Tệ`);
                } else {
                    await updateBalance(user.id, -tienCuoc); // await
                    await interaction.reply(`🎲 **${d1}-${d2}-${d3}** (Tổng: ${tong} -> **${tenKetQua}**)\n❌ Chọn **${luaChon.toUpperCase()}** -> **THUA!** Bay ${tienCuoc} Kim Hồn Tệ`);
                }
                break;

            case 'setmoney':
                if (user.id !== ADMIN_ID) {
                    await interaction.reply({ content: '🚫 Đạo hữu không phải Thiên Đạo!', flags: MessageFlags.Ephemeral });
                    break;
                }

                const targetUser = interaction.options.getUser('nguoi_choi');
                const amountToAdd = interaction.options.getInteger('so_tien');

                // Lấy thông tin User
                let targetData = await getUser(targetUser.id);

                // --- [LOGIC MỚI] KIỂM TRA TRƯỚC KHI TRỪ ---
                if (amountToAdd < 0) {
                    // 1. Nếu đang 0 đồng mà còn đòi trừ -> Báo lỗi ngay
                    if (targetData.balance <= 0) {
                        await interaction.channel.send(
                            `🛑 **THIÊN ĐẠO DỪNG TAY!**\n<@${targetUser.id}> hiện tại đã "khố rách áo ôm" (0 Kim Hồn Tệ), trên người không còn gì để phạt nữa.`
                        );
                        // Kết thúc lệnh (phải reply ẩn để không lỗi)
                        await interaction.reply({ content: 'Người chơi đã hết tiền, không thể trừ.', flags: MessageFlags.Ephemeral });
                        break;
                    }
                }

                // Cộng/Trừ tiền
                targetData.balance += amountToAdd;

                // 2. Nếu trừ quá tay (Ví dụ: Có 10k mà trừ 20k) -> Gán về 0 luôn (Không cho âm)
                if (targetData.balance < 0) {
                    targetData.balance = 0;
                }

                // Lưu vào Database
                await targetData.save();

                // Gửi thông báo ra kênh chat
                if (amountToAdd > 0) {
                    // CỘNG TIỀN
                    await interaction.channel.send(
                        `🌅 **THIÊN ĐẠO BAN PHÚC!**\n<@${targetUser.id}> vừa nhận được cơ duyên, túi tiền tăng thêm **${amountToAdd.toLocaleString()} Kim Hồn Tệ**.\n💰 Số dư hiện tại: **${targetData.balance.toLocaleString()}**`
                    );
                } else if (amountToAdd < 0) {
                    // TRỪ TIỀN
                    const positiveNum = Math.abs(amountToAdd);
                    await interaction.channel.send(
                        `⚡ **THIÊN ĐẠO TRỪNG PHẠT!**\n<@${targetUser.id}> làm điều nghịch thiên, bị tước đi **${positiveNum.toLocaleString()} Kim Hồn Tệ**.\n💸 Số dư hiện tại: **${targetData.balance.toLocaleString()}**`
                    );
                } else {
                    await interaction.channel.send(`Thiên Đạo đi ngang qua <@${targetUser.id}> nhưng không làm gì cả.`);
                }

                // Xác nhận hoàn thành lệnh
                await interaction.reply({
                    content: '✅ Đã thực hiện lệnh thành công!',
                    flags: MessageFlags.Ephemeral
                });
                break;

            case 'give':
                const receiverUser = interaction.options.getUser('nguoi_nhan');
                const amountToGive = interaction.options.getInteger('so_tien');

                // 1. Chặn tự chuyển cho mình
                if (user.id === receiverUser.id) {
                    await interaction.reply({
                        content: '🚫 Đạo hữu định luyện "Tả Hữu Hỗ Bác" à? Không thể tự chuyển tiền cho chính mình!',

                    });
                    break;
                }

                // 2. Chặn chuyển cho Bot
                if (receiverUser.bot) {
                    await interaction.reply({
                        content: '🤖 Bot tu luyện bằng điện, không cần Kim Hồn Tệ!',

                    });
                    break;
                }

                // 3. Lấy dữ liệu của cả 2 người
                const senderProfile = await getUser(user.id);       // Người gửi (Bạn)
                const receiverProfile = await getUser(receiverUser.id); // Người nhận

                // 4. Kiểm tra số dư người gửi
                if (senderProfile.balance < amountToGive) {
                    await interaction.reply({
                        content: `⚠️ **Không đủ tiền!**\nĐạo hữu chỉ có **${senderProfile.balance.toLocaleString()}**, không đủ để chuyển **${amountToGive.toLocaleString()}**.`,
                    });
                    break;
                }

                // 5. Thực hiện giao dịch (Trừ người gửi, Cộng người nhận)
                senderProfile.balance -= amountToGive;
                receiverProfile.balance += amountToGive;

                // 6. Lưu dữ liệu lên MongoDB (QUAN TRỌNG: Lưu cả 2)
                await senderProfile.save();
                await receiverProfile.save();

                // 7. Thông báo thành công
                await interaction.reply(
                    `💸 **GIAO DỊCH THÀNH CÔNG!**\n<@${user.id}> đã chuyển **${amountToGive.toLocaleString()} Kim Hồn Tệ** cho <@${receiverUser.id}>.\n🤝 Tình nghĩa huynh đệ thắm thiết!`
                );
                break;

            default:
                break;
        }
    } catch (err) {
        console.error(err);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: 'Có lỗi xảy ra khi xử lý lệnh! (Server Database có thể đang bận)', flags: MessageFlags.Ephemeral });
        }
    }
});

client.login(TOKEN);