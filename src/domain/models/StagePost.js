import mongoose from "mongoose";

const { Schema, model } = mongoose;

// Define comment subdocument schema
const commentSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  text: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
}, { _id: true });

// Define main stage post schema
const stagePostSchema = new Schema({
  text: { type: String },
  mediaUrls: { type: [String], default: [] },
  timestamp: { type: Date, default: Date.now },
  creatorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  likes: [{ type: Schema.Types.ObjectId, ref: "User" }],
  comments: [commentSchema],

  // Add these two fields
  refType: { type: String, enum: ["Group", "Event","User"], required: true },
  refId: { type: Schema.Types.ObjectId, required: true, refPath: "refType" }
});


// === Instance Methods ===

// Toggle like/unlike
stagePostSchema.methods.toggleLike = async function (userId) {
  const index = this.likes.findIndex(id => id.toString() === userId.toString());
  if (index === -1) {
    this.likes.push(userId);
  } else {
    this.likes.splice(index, 1);
  }
  await this.save();
  return this.likes.length;
};

// Add comment
stagePostSchema.methods.addComment = async function (userId, text) {
  const comment = { userId, text };
  this.comments.push(comment);
  await this.save();
  return this.comments[this.comments.length - 1]; // return newly added comment
};

// Edit comment
stagePostSchema.methods.editComment = async function (commentId, userId, newText) {
  const comment = this.comments.id(commentId);
  if (!comment) throw new Error("Comment not found");
  if (comment.userId.toString() !== userId.toString()) throw new Error("Unauthorized to edit comment");

  comment.text = newText;
  await this.save();
  return comment;
};

// Delete comment
stagePostSchema.methods.deleteComment = async function (commentId, userId) {
  const comment = this.comments.id(commentId);
  if (!comment) throw new Error("Comment not found");
  if (comment.userId.toString() !== userId.toString()) throw new Error("Unauthorized to delete comment");

  comment.deleteOne();
  await this.save();
};

// Edit post (text and media)
stagePostSchema.methods.editPost = async function (userId, newText, newMediaUrls) {
  if (this.creatorId.toString() !== userId.toString()) throw new Error("Unauthorized to edit post");

  if (newText !== undefined) this.text = newText;
  if (newMediaUrls !== undefined) this.mediaUrls = newMediaUrls;

  await this.save();
  return this;
};

// Export the model
const StagePost = model("StagePost", stagePostSchema);
export { stagePostSchema };
export default StagePost;