import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    user_id: { type: Number, unique: true, required: true },
    password: { type: String, required: true },
    email_id: { type: String, unique: true, required: true },
    user_name: { type: String, unique: true },
    gender: { type: String,enum: ['male', 'female', 'other'], required: true },
    mobile: { type: String },
    following: [{ type: Number, ref: 'User'}],
    followers: [{ type: Number, ref: 'User'}],
});

const User = mongoose.model('User', userSchema);

export default User;
