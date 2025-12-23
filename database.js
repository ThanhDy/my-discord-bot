const mongoose = require('mongoose');

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

// 3. Hàm lấy các Role đã hết hạn (để xóa)
async function getExpiredRoles() {
    const now = Date.now();
    return await TempRole.find({ expiresAt: { $lte: now } });
}

// 4. Hàm xóa record khỏi DB sau khi đã gỡ role
async function deleteTempRole(id) {
    await TempRole.findByIdAndDelete(id);
}
// Xuất ra để các file khác dùng
module.exports = { connectDB, getUser, updateBalance, updateLastWork, addTempRole, getExpiredRoles, deleteTempRole };