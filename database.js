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
    channelId: { type: String, required: true, unique: true }, // Mỗi kênh chỉ 1 game
    lastWord: { type: String, default: '' }, // Từ cuối cùng (VD: "gà")
    lastUser: { type: String, default: '' }, // Người vừa nối (để chặn spam 1 mình)
    turnCount: { type: Number, default: 0 }  // Số lượt đã chơi
});
const NoiTu = mongoose.model('NoiTu', noituSchema);

// ================= 3. HÀM TỪ ĐIỂN (QUAN TRỌNG) =================
let dictionarySet = new Set(); // Bộ nhớ lưu từ điển (RAM)

// Hàm tải từ điển từ GitHub khi bot chạy
async function loadDictionary() {
    console.log('⏳ Đang tải từ điển Tiếng Việt (74k từ)...');
    const url = 'https://raw.githubusercontent.com/duync/vietnamese-wordlist/master/Viet74K.txt';

    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                const words = data.split('\n');
                words.forEach(word => {
                    // Chuẩn hóa: chữ thường, xóa khoảng trắng thừa
                    const cleanWord = word.trim().toLowerCase();
                    if (cleanWord) dictionarySet.add(cleanWord);
                });
                console.log(`✅ Đã tải xong từ điển: ${dictionarySet.size} từ!`);
                resolve();
            });
        }).on('error', (err) => {
            console.error('❌ Lỗi tải từ điển:', err);
            reject(err);
        });
    });
}

// Hàm kiểm tra từ có tồn tại không
function checkDictionary(word) {
    // Nếu từ điển chưa tải xong hoặc rỗng thì cho qua (để tránh lỗi game)
    if (dictionarySet.size === 0) return true;
    return dictionarySet.has(word.toLowerCase());
}

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
    const url = 'https://raw.githubusercontent.com/duync/vietnamese-wordlist/master/Viet74K.txt';

    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                const words = data.split('\n');
                dictionaryArray = []; // Reset mảng

                words.forEach(word => {
                    const cleanWord = word.trim().toLowerCase();
                    // Chỉ lấy những từ có ít nhất 2 tiếng (từ ghép) để làm đề bài
                    if (cleanWord) {
                        dictionarySet.add(cleanWord);
                        if (cleanWord.includes(' ')) {
                            dictionaryArray.push(cleanWord);
                        }
                    }
                });
                console.log(`✅ Đã tải xong: ${dictionarySet.size} từ (trong đó ${dictionaryArray.length} từ ghép)!`);
                resolve();
            });
        }).on('error', (err) => {
            console.error('❌ Lỗi tải từ điển:', err);
            reject(err);
        });
    });
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

// Xuất ra để các file khác dùng
module.exports = {
    connectDB, getUser, updateBalance, updateLastWork,
    addTempRole, getExpiredRoles, deleteTempRole,
    getGame, createGame, stopGame, updateGame,
    loadDictionary, checkDictionary, getRandomWord, checkDeadEnd,
};