import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String },
  collection: { type: [Object], default: [] },
  items: { type: [Object], default: [] },
  shards: { type: Number, default: 0 },
  regularPity: { type: Number, default: 0 },
  shopStock: { type: [Object], default: [] },
  restockAt: { type: Number, default: 0 },
  userStats: {
    wins: { type: Number, default: 0 },
    losses: { type: Number, default: 0 },
    totalPulls: { type: Number, default: 0 },
    regularPulls: { type: Number, default: 0 },
    deluxePulls: { type: Number, default: 0 },
    wKeyPulls: { type: Number, default: 0 },
    cardsDeleted: { type: Number, default: 0 },
    cardsUpgraded: { type: Number, default: 0 },
    joinedAt: { type: Date, default: Date.now },
  },
}, { timestamps: true, strict: false });

delete mongoose.models.User;
export default mongoose.model('User', UserSchema);