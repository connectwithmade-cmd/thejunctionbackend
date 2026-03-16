import mongoose from "mongoose";

const reportSchema = new mongoose.Schema({

  reporterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  targetType: {
    type: String,
    enum: ["event","post","comment","user","message"],
    required: true
  },

  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },

  reason: String,

  aiScore: Number,

  status: {
    type: String,
    enum: ["pending","auto_resolved","sent_to_moderator","resolved"],
    default: "pending"
  }

},{
  timestamps:true
});

export default mongoose.model("Report",reportSchema);