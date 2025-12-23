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

// Xuất ra để các file khác dùng
module.exports = { connectDB, getUser, updateBalance, updateLastWork };