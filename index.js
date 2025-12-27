// 1. KHAI BÁO THƯ VIỆN
const { REST, Routes, Client, GatewayIntentBits, Collection, EmbedBuilder } = require('discord.js');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { connectDB, loadDictionary, checkDictionary, getGame, updateGame, updateBalance, checkDeadEnd, createGame, getRandomWord, stopGame, getExpiredRoles, deleteTempRole } = require('./database');

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
loadDictionary(); // <--- THÊM DÒNG NÀY ĐỂ TẢI TỪ ĐIỂN

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


// --- XỬ LÝ GAME NỐI TỪ ---
client.on('messageCreate', async message => {
    if (message.author.bot || !message.content) return;

    const game = await getGame(message.channel.id);
    if (!game) return;

    const content = message.content.trim().toLowerCase();
    const words = content.split(/\s+/);

    if (words.length < 2) return;

    const firstSyllable = words[0];
    const endSyllable = words[words.length - 1];

    // 1. Chặn người chơi tự nối tiếp (Anti-spam)
    if (game.lastUser === message.author.id) {
        const warningMsg = await message.reply('Vui lòng đợi người chơi khác.');
        await message.react('⏳');
        setTimeout(() => {
            warningMsg.delete().catch(() => { }); // catch lỗi nếu tin nhắn đã bị xóa trước đó
        }, 5000);
        return;
    }

    // 2. Chữ đầu phải khớp chữ cuối của từ trước
    if (firstSyllable !== game.lastWord) return;

    // --- KIỂM TRA HỢP LỆ (Quan trọng: Check cái này trước khi lưu) ---

    // 3. KIỂM TRA TỪ ĐIỂN (Lọc từ sai ngay tại đây)
    // Nếu từ sai -> Return ngay -> KHÔNG BAO GIỜ được lưu vào DB
    if (!checkDictionary(content)) {
        const warningMsg = await message.reply(`Từ **"${content}"** không có trong từ điển!`);
        await message.react('❌');
        setTimeout(() => warningMsg.delete().catch(() => { }), 5000);
        return;
    }

    // 4. KIỂM TRA TRÙNG LẶP (Trong 50 lượt)
    if (game.usedWords && game.usedWords.includes(content)) {
        const index = game.usedWords.indexOf(content);
        const turnsLeft = (50 - game.usedWords.length) + index + 1;

        const warningMsg = await message.reply(`Từ **"${content}"** đã được sử dụng trong 50 lượt gần đây! Hãy tìm từ khác.`);
        await message.react('♻️');
        setTimeout(() => warningMsg.delete().catch(() => { }), 5000);
        return;
    }

    // --- NẾU TẤT CẢ ĐỀU ĐÚNG ---
    // Đến đây mới là từ CHUẨN, cho phép lưu vào Database và thưởng tiền

    await updateBalance(message.author.id, 1000);
    await message.react('✅');

    // Kiểm tra Jackpot (Đường cùng)
    const isDeadEnd = checkDeadEnd(endSyllable);

    if (isDeadEnd) {
        await updateBalance(message.author.id, 100000);

        // Reset game
        const randomWord = getRandomWord();
        const newWords = randomWord.split(/\s+/);
        const newLastSyllable = newWords[newWords.length - 1];

        await createGame(message.channel.id, newLastSyllable);

        await message.channel.send(
            `Không còn từ để nối tiếp. <@${message.author.id}> thắng và nhận 100,000 \n` +
            `Lượt mới bắt đầu với từ: **"${randomWord.toUpperCase()}"**`
        );
    } else {
        await updateGame(message.channel.id, content, message.author.id);
    }
});
// 8. ĐĂNG NHẬP
console.log('🤖 Đang đăng nhập...');
client.login(TOKEN);