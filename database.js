const mongoose = require('mongoose');
const https = require('https'); // Dùng để tải từ điển

// Kết nối MongoDB
const connectDB = async (uri) => {
    try {
        await mongoose.connect(uri);
        console.log('✅ Đã kết nối với MongoDB!');
    } catch (err) {
        console.error('❌ Lỗi kết nối MongoDB:', err);
    }
};

// Định nghĩa Schema
const userSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    balance: { type: Number, default: 0 },
    lastWork: { type: Number, default: 0 }
});
const User = mongoose.model('User', userSchema);

const tempRoleSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    roleId: { type: String, required: true },
    guildId: { type: String, required: true },
    expiresAt: { type: Number, required: true } // Thời gian hết hạn (Timestamp)
});
const TempRole = mongoose.model('TempRole', tempRoleSchema);

// 1. Schema cho Game Nối Từ
const noituSchema = new mongoose.Schema({
    channelId: { type: String, required: true, unique: true },
    lastWord: { type: String, default: '' },
    lastUser: { type: String, default: '' },
    turnCount: { type: Number, default: 0 },
    usedWords: { type: [String], default: [] },
    resetVotes: { type: [String], default: [] },
});
const NoiTu = mongoose.model('NoiTu', noituSchema);

// Các hàm xử lý
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


// 2. Hàm thêm Role tạm
async function addTempRole(guildId, userId, roleId, durationMinutes) {
    const expiresAt = Date.now() + (durationMinutes * 60 * 1000);
    const tempRole = new TempRole({ guildId, userId, roleId, expiresAt });
    await tempRole.save();
    return expiresAt;
}

async function getExpiredRoles() {
    const now = Date.now();
    return await TempRole.find({ expiresAt: { $lte: now } });
}

async function deleteTempRole(id) {
    await TempRole.findByIdAndDelete(id);
}

// ================= 3. HÀM TỪ ĐIỂN (NÂNG CẤP) =================
let dictionarySet = new Set();   // Dùng để tra cứu nhanh (Check đúng/sai)
let dictionaryArray = [];        // Dùng để Random từ

// Hàm tải từ điển
async function loadDictionary() {
    console.log('⏳ Đang tải từ điển Tiếng Việt...');

    // LINK CHÍNH (Sửa lại đúng username: duyet)
    const url = 'https://raw.githubusercontent.com/duyet/vietnamese-wordlist/master/Viet74K.txt';

    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            if (res.statusCode !== 200) {
                console.error(`❌ Link chính bị lỗi (Mã: ${res.statusCode}). Đang thử link dự phòng...`);
                // LINK DỰ PHÒNG (Nếu link trên chết thì dùng link này)
                const backupUrl = 'https://raw.githubusercontent.com/undertheseanlp/dictionary/master/dictionary/words.txt';

                https.get(backupUrl, (resBackup) => {
                    if (resBackup.statusCode !== 200) {
                        console.error('❌ Cả 2 link đều hỏng. Sử dụng từ điển mặc định nhỏ.');
                        dictionaryArray = ['thiên nhiên', 'nhiên liệu', 'con gà', 'gà mái', 'mái nhà', 'nhà cửa', 'vui vẻ', 'học tập', 'thông minh'];
                        dictionaryArray.forEach(w => dictionarySet.add(w));
                        resolve();
                        return;
                    }
                    processData(resBackup, resolve);
                }).on('error', () => resolve());
                return;
            }
            processData(res, resolve);
        }).on('error', (err) => {
            console.error('❌ Lỗi kết nối mạng:', err);
            resolve();
        });
    });

    // Hàm xử lý dữ liệu tải về
    function processData(response, resolve) {
        let data = '';
        response.on('data', (chunk) => data += chunk);
        response.on('end', () => {
            const words = data.split('\n');
            dictionaryArray = [];
            words.forEach(word => {
                const cleanWord = word.trim().toLowerCase();
                if (cleanWord && cleanWord.includes(' ')) {
                    dictionarySet.add(cleanWord);
                    dictionaryArray.push(cleanWord);
                }
            });
            console.log(`✅ Đã tải xong: ${dictionaryArray.length} từ ghép!`);
            if (dictionaryArray.length > 0) console.log(`🔍 Test từ đầu tiên: "${dictionaryArray[0]}"`);
            resolve();
        });
    }
}

// Hàm kiểm tra từ tồn tại
function checkDictionary(word) {
    if (dictionarySet.size === 0) return true;
    return dictionarySet.has(word.toLowerCase());
}

// [MỚI] Hàm lấy từ ngẫu nhiên
function getRandomWord() {
    if (dictionaryArray.length === 0) return "thiên nhiên"; // Fallback nếu lỗi
    const randomIndex = Math.floor(Math.random() * dictionaryArray.length);
    return dictionaryArray[randomIndex];
}

// [MỚI] Hàm kiểm tra xem từ này có phải đường cùng không
function checkDeadEnd(syllable) {
    // Tìm xem trong từ điển có từ nào bắt đầu bằng "syllable " không
    // Ví dụ: syllable là "ách". Tìm xem có từ nào dạng "ách ..." không (như "ách tắc")
    const prefix = syllable.toLowerCase() + ' ';

    // Hàm some sẽ trả về true ngay khi tìm thấy 1 từ khớp (Rất nhanh)
    // Nếu KHÔNG tìm thấy từ nào -> return true (Là đường cùng)
    const hasNextWord = dictionaryArray.some(word => word.startsWith(prefix));

    return !hasNextWord;
}

// ================= [MISSING PART] HÀM XỬ LÝ GAME NỐI TỪ =================
// (Phần bạn bị thiếu đây)

async function getGame(channelId) {
    return await NoiTu.findOne({ channelId });
}

async function createGame(channelId, startWord) {
    await NoiTu.findOneAndDelete({ channelId });
    const word = startWord.toLowerCase();
    const newGame = new NoiTu({
        channelId,
        lastWord: word,
        lastUser: '',
        turnCount: 1,
        usedWords: [word] // Lưu luôn từ đầu tiên vào lịch sử
    });
    await newGame.save();
    return newGame;
}

async function stopGame(channelId) {
    await NoiTu.findOneAndDelete({ channelId });
}

async function updateGame(channelId, newWord, userId) {
    const game = await getGame(channelId);
    if (game) {
        game.lastWord = newWord.toLowerCase();
        game.lastUser = userId;
        game.turnCount += 1;

        // Thêm từ mới vào mảng
        game.usedWords.push(newWord.toLowerCase());

        // Nếu mảng dài quá 50 từ thì xóa bớt từ cũ nhất đi
        if (game.usedWords.length > 50) {
            game.usedWords.shift();
        }

        await game.save();
    }
}

// Xuất ra để các file khác dùng
module.exports = {
    connectDB, getUser, updateBalance, updateLastWork,
    addTempRole, getExpiredRoles, deleteTempRole,
    getGame, createGame, stopGame, updateGame,
    loadDictionary, checkDictionary, getRandomWord, checkDeadEnd
};