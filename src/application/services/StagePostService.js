import Event from "../../domain/models/Event.js";
import Group from "../../domain/models/Group.js";
import User from "../../domain/models/User.js";
import StagePost from "../../domain/models/StagePost.js";
class StagePostService {
  // Helper: Get parent (Event or Group) and check permissions
 async getParentAndCheckAuth(refType, refId, userId) {
  let parentDoc;

  if (refType === "Event") {
    parentDoc = await Event.findById(refId);
    if (!parentDoc) throw new Error("Event not found");

    const isOrganizer = parentDoc.organizerId?.equals(userId);
    const isTeamMember = parentDoc.team?.has(userId.toString());
    if (!isOrganizer && !isTeamMember) throw new Error("Unauthorized");

  } else if (refType === "Group") {
    parentDoc = await Group.findById(refId);
    if (!parentDoc) throw new Error("Group not found");
    const isOrganizer = parentDoc.creator?.equals(userId);

    const isAdmin = parentDoc.admins?.some(admin => admin.equals(userId));
    const isMod = parentDoc.moderators?.some(mod => mod.equals(userId));
    if (!isAdmin && !isMod && !isOrganizer) throw new Error("Unauthorized");

  } else if (refType === "User") {
    parentDoc = await User.findById(refId);
    if (!parentDoc) throw new Error("User not found");

    // Only the owner can create stage posts on their profile
    if (!(parentDoc._id.equals(userId))) throw new Error("Unauthorized");

  } else {
    throw new Error("Invalid refType");
  }

  return parentDoc;
}

async create(refType, refId, postData, userId) {
  const parentDoc = await this.getParentAndCheckAuth(refType, refId, userId);

  const post = await StagePost.create({
    ...postData,
    creatorId: userId,
    refType,
    refId
  });

  if (!Array.isArray(parentDoc.stagePosts)) {
    parentDoc.stagePosts = [];
  }

  parentDoc.stagePosts.push(post._id);
  await parentDoc.save();

  return post;
}



  // Update post text/media
  async update(postId, userId, updatedFields) {
    const post = await StagePost.findById(postId);
    if (!post) throw new Error("Stage post not found");

    return await post.editPost(userId, updatedFields.text, updatedFields.mediaUrls);
  }

  // Get posts for a specific refType + refId with pagination

  async getStagePosts(refType, refId, page = 1, limit = 10, userId) {
  // Reuse the auth check for validation and permission
  await this.getParentAndCheckAuth(refType, refId, userId);

  const skip = (page - 1) * limit;

  const posts = await StagePost.find({ refType, refId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('creatorId', 'name _id userName') // only select needed fields
    .lean();

  const total = await StagePost.countDocuments({ refType, refId });

  return {
    posts,
    total,
    page,
    totalPages: Math.ceil(total / limit)
  };
}


 // Delete post
async delete(postId, userId) {
  const post = await StagePost.findById(postId);
  if (!post) throw new Error("Stage post not found");

  const parent = await this.getParentAndCheckAuth(post.refType, post.refId, userId);

  if (post.creatorId.toString() !== userId.toString()) {
    throw new Error("Unauthorized to delete post");
  }

  // Remove post ID from parent stagePosts array
  parent.stagePosts = parent.stagePosts.filter(
    (id) => id.toString() !== post._id.toString()
  );
  await parent.save();

  // Delete the post
  await StagePost.findByIdAndDelete(postId);

  return true;
}


  // Toggle like
  async toggleLike(postId, userId) {
    const post = await StagePost.findById(postId);
    if (!post) throw new Error("Stage post not found");

    return await post.toggleLike(userId);
  }

  // Add comment
  async addComment(postId, userId, text) {
    const post = await StagePost.findById(postId);
    if (!post) throw new Error("Stage post not found");

    return await post.addComment(userId, text);
  }

  // Edit comment
  async editComment(postId, commentId, userId, newText) {
    const post = await StagePost.findById(postId);
    if (!post) throw new Error("Stage post not found");

    return await post.editComment(commentId, userId, newText);
  }

  // Delete comment
  async deleteComment(postId, commentId, userId) {
    const post = await StagePost.findById(postId);
    if (!post) throw new Error("Stage post not found");

    await post.deleteComment(commentId, userId);
    return true;
  }

  // Reorder posts for a specific refType + refId
  async reorderPosts(refType, refId, newOrderIds, userId) {
    const parent = await this.getParentAndCheckAuth(refType, refId, userId);

    const posts = await StagePost.find({ refType, refId });

    if (posts.length !== newOrderIds.length)
      throw new Error("Mismatch in number of posts and order list");

    const postMap = new Map(posts.map(p => [p._id.toString(), p]));

    const ordered = newOrderIds.map(id => postMap.get(id.toString()));
    if (ordered.includes(undefined)) throw new Error("Invalid post ID in order list");

    // Optional: Save order index in each post if needed
    for (let i = 0; i < ordered.length; i++) {
      ordered[i].order = i;
      await ordered[i].save();
    }

    return ordered;
  }
}

export default new StagePostService();
