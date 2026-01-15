// 1. KHAI BÁO THƯ VIỆN
const { REST, Routes, Client, GatewayIntentBits, Collection, EmbedBuilder } = require('discord.js');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { connectDB, updateBalance, getExpiredRoles, deleteTempRole } = require('./database');

// 2. CẤU HÌNH TOKEN
const TOKEN = process.env.TOKEN;
const MONGO_URI = process.env.MONGO_URI;
const CLIENT_ID = '1447762452937707681';
const GUILD_ID = '1237804613986418698';

// 3. SERVER GIẢ LẬP
const port = process.env.PORT || 3000;
const server = http.createServer((req, res) => {
    res.writeHead(200);
    res.end('Bot Discord dang hoat dong!');
});
server.listen(port, '0.0.0.0', () => {
    console.log(`Server is listening on port ${port}`);
});

// 4. KẾT NỐI DB & KHỞI TẠO BOT
connectDB(MONGO_URI);

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions
    ]
}); client.commands = new Collection(); // Nơi chứa lệnh

// 5. TỰ ĐỘNG ĐỌC FILE LỆNH (COMMAND HANDLER)
const commandsPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(commandsPath);
const commandsData = []; // Mảng chứa thông tin để đăng ký với Discord

console.log('📦 Đang tải các lệnh...');
for (const folder of commandFolders) {
    const folderPath = path.join(commandsPath, folder);
    const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const filePath = path.join(folderPath, file);
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
            commandsData.push(command.data);
            // console.log(`   -> Đã nạp: ${command.data.name}`);
        }
    }
}

// 6. ĐĂNG KÝ LỆNH TỰ ĐỘNG
const rest = new REST({ version: '10' }).setToken(TOKEN);
(async () => {
    try {
        console.log('♻️ Đang làm mới danh sách lệnh...');
        // Xóa lệnh Global cũ
        await rest.put(Routes.applicationCommands(CLIENT_ID), { body: [] });
        // Đăng ký lệnh Guild mới từ danh sách file đã đọc
        await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commandsData });
        console.log('✅ Đã đăng ký lệnh thành công!');
    } catch (error) {
        console.error(error);
    }
})();

// 7. XỬ LÝ SỰ KIỆN
client.once('ready', () => {
    console.log(`Bot ${client.user.tag} đã online!`);

    // --- TÍNH NĂNG QUÉT ROLE HẾT HẠN (CHẠY MỖI 60 GIÂY) ---
    setInterval(async () => {
        try {
            // 1. Lấy danh sách các role đã hết hạn từ DB
            const expiredRoles = await getExpiredRoles();

            for (const record of expiredRoles) {
                const guild = client.guilds.cache.get(record.guildId);
                if (!guild) {
                    // Nếu bot bị kick khỏi server thì xóa record luôn
                    await deleteTempRole(record._id);
                    continue;
                }

                try {
                    // 2. Tìm thành viên và gỡ role
                    const member = await guild.members.fetch(record.userId).catch(() => null);
                    if (member) {
                        await member.roles.remove(record.roleId).catch(err => console.log("Không gỡ được role (thiếu quyền?):", err));
                        console.log(`[AUTO] Đã gỡ role ${record.roleId} của ${member.user.tag}`);
                    }
                } catch (err) {
                    console.error('Lỗi khi xử lý gỡ role:', err);
                }

                // 3. Xóa record khỏi Database sau khi xử lý xong
                await deleteTempRole(record._id);
            }
        } catch (err) {
            console.error('Lỗi trong vòng lặp quét role:', err);
        }
    }, 60 * 1000); // 60000ms = 1 phút quét 1 lần
});

client.on('interactionCreate', async interaction => {
    // --- XỬ LÝ MENU HELP (Giữ nguyên logic ở đây vì nó là Component Interaction) ---
    if (interaction.isStringSelectMenu() && interaction.customId === 'help_menu') {
        const selected = interaction.values[0];
        let newContent = '';

        if (selected === 'kinhte') {
            newContent = `### 💰 Lệnh Kinh Tế\n- \`/diemdanh\`: Nhận Kim Hồn Tệ mỗi 24h.\n- \`/tien\`: Kiểm tra số dư.\n- \`/give\`: Chuyển tiền.`;
        } else if (selected === 'trochoi') {
            newContent = `### 🎲 Trò Chơi\n- \`/taixiu\`: Chơi Tài Xỉu (3-10 Xỉu, 11-18 Tài).`;
        } else if (selected === 'tienich') {
            newContent = `### 🛠️ Tiện Ích\n- \`/hello\`, \`/donate\`, \`/say\``;
        } else if (selected === 'admin') {
            newContent = `### 👮 Admin\n- \`/setmoney\`: Chỉnh sửa tiền.`;
        }

        const newEmbed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setDescription(`# 📜 Hướng dẫn chi tiết\n\n${newContent}`);
        await interaction.update({ embeds: [newEmbed] });
        return;
    }

    // --- XỬ LÝ LỆNH CHAT (SLASH COMMAND) ---
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: 'Có lỗi khi chạy lệnh!', ephemeral: true });
        } else {
            await interaction.reply({ content: 'Có lỗi khi chạy lệnh!', ephemeral: true });
        }
    }
});

// --- DANH SÁCH TỪ CẤM & AUTO MOD (GIỮ LẠI) ---
const BANNED_WORDS = ['ái kỷ', 'ái kỉ', 'thằng ngu', 'chó đẻ', 'cặc'];

const replyAndDelete = async (message, content) => {
    try {
        const warning = await message.reply(content);
        setTimeout(async () => {
            await message.delete().catch(() => { });
            await warning.delete().catch(() => { });
        }, 3000);
    } catch (err) {
        console.log("Lỗi xóa tin nhắn:", err);
    }
};

client.on('messageCreate', async message => {
    if (message.author.bot || !message.content) return;

    // Chỉ còn logic lọc từ cấm, không còn game nối từ
    const content = message.content.trim().toLowerCase();
    const hasBadWord = BANNED_WORDS.some(word => content.includes(word));

    if (hasBadWord) {
        await replyAndDelete(message, `🚫 **Cảnh báo!** Văn minh lên bạn êi. Có thể nói giảm nói tránh`);
    }
});


// 8. ĐĂNG NHẬP
console.log('🤖 Đang đăng nhập...');
client.login(TOKEN);