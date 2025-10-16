import Group from "../../domain/models/Group.js";

class GroupRepository {
    async create(data) {
        const group = new Group(data);
        return group.save();
    }

  async findPublicGroups({
  searchString,
  category,
  page = 1,
  limit = 10,
  userId,
} = {}) {
  const baseFilter = {
    type: 'public',
    isDeleted: false,
  };

  

  // Search by name (case-insensitive)
  if (typeof searchString === 'string' && searchString.trim() !== '') {
    baseFilter.name = { $regex: searchString.trim(), $options: 'i' };
  }

  // Filter by category
  if (typeof category === 'string' && category.trim() !== '') {
    baseFilter.categories = { $in: [category.trim()] };
  }

  const skipCount = (page > 0 ? page - 1 : 0) * limit;

  const query = Group.find(baseFilter)
  .sort({ createdAt: -1 }) // Newest first
  .select('name description bannerImages categories tags members inviteRequests creator') // include members & invites
  .skip(skipCount)
  .limit(limit)
  .populate('creator', 'name username _id profilePicture').populate('inviteRequests.user', 'name username _id profilePicture')
; // Populate creator details

const groups = await query.exec();
const total = await Group.countDocuments(baseFilter);

// Compute status flags for the current user
const groupsWithStatus = groups.map(group => {
  const { isMember, isAdmin, isInvited } =  group.getUserGroupStatus(userId);
  return {
    ...group.toObject(),
    isMember,
    isAdmin,
    isInvited
  };
});

return {
  groups: groupsWithStatus,
  pagination: {
    total,
    page,
    limit
  }
};

}

  async findById(groupId) {
    return await Group.findById(groupId);
  }
  

    async updateGroup(groupId, updates) {
        return Group.findByIdAndUpdate(groupId, updates, { new: true });
    }

    async searchPublicGroups(query, category) {
        const filter = { type: 'public', isDeleted: false };
        if (query) filter.name = { $regex: query, $options: 'i' };
        if (category) filter.category = category;
        return Group.find(filter);
    }

    async  save(group) {
  if (typeof group?.save === 'function') {
    return await group.save(); // ✅ document with .save()
  }

  throw new Error('Tried to save a non-document. Pass the full group object, not an ID.');
}
}

export default new GroupRepository();
