import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true, select: false },
  name: { type: String, required: true },
  picture: { type: String },
  role: { type: String, enum: ['faculty', 'admin', 'hod'], default: 'faculty' },
  department: { type: String, default: 'Computer Science and Engineering' },
  university: { type: String, default : "Vignan's University" },
  sessions: [{ type: String }], // session_ids from Python API
  createdAt: { type: Date, default: Date.now },
  lastLogin: { type: Date, default: Date.now },
});

export default mongoose.model('User', userSchema);
