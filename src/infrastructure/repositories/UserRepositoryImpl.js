import User from '../../domain/models/User.js';
import UserRepository from '../../domain/repositories/UserRepository.js';
import {v4 as uuidv4} from 'uuid';
import FileUploadService from "../../application/services/FileUploadService.js";

class UserRepositoryImpl extends UserRepository {
  async findById(id) {
    return User.findOne({ _id: id });
  }

  async findByEmail(email) {
    return User.findOne({ email });
  }

  async findByUserName(userName) {
    return User.findOne({ userName });
  }

  async findByGoogleId(googleId) {
    return User.findOne({ googleId });
  }

  async findAll() {
    return User.find();
  }

async searchUsers(query, currentUserId, page = 1, limit = 20) {
  if (!query || query.trim() === '') {
    throw new Error('Search query is required');
  }

  const regex = new RegExp('^' + query, 'i'); // starts with query
  const skip = (page - 1) * limit;
  const projection = '_id name email userName profilePicture accountSettings.privacy.profileVisibility friends';

  // Get current user (for checking friendships)
  const currentUser = await User.findById(currentUserId).select('_id friends');

  // Build query
  const baseQuery = {
    $or: [
      { name: { $regex: regex } },
      { userName: { $regex: regex } },
      { email: { $regex: regex } }
    ],
    isDeleted: false
  };

  // Apply privacy filters
  const users = await User.find(baseQuery)
    .select(projection)
    .skip(skip)
    .limit(limit)
    .lean();

  // Filter visibility based on rules
  const visibleUsers = users.filter(u => {
    const visibility = u.accountSettings?.privacy?.profileVisibility || 'public';

    if (visibility === 'public') return true;
    if (visibility === 'friends') {
      return (
        u.friends?.some(fid => fid.toString() === currentUserId.toString()) ||
        currentUser?.friends?.some(fid => fid.toString() === u._id.toString())
      );
    }
    if (visibility === 'private') {
      return u._id.toString() === currentUserId.toString(); // only self
    }
    return false;
  });

  return { users: visibleUsers, total: visibleUsers.length };
}



  async save(user) {
    const newUser = new User(user);
    return newUser.save();
  }

  async update(user) {
    try {
      const updatedUser = await User.findByIdAndUpdate(user._id, user, { new: true, runValidators: true });
      return updatedUser;
    } catch (error) {
      throw new Error(`Failed to update user: ${error.message}`);
    }
  }

  // Edit an existing user (like your event edit style)
async findByIdAndUpdate(userIdToUpdate, updatedData, requesterId) {
  // Find user
  const user = await User.findById(userIdToUpdate);
  if (!user) {
    throw new Error('User not found');
  }

  // Only allow the user themselves to update their settings
  if (user._id.toString() !== requesterId.toString()) {
    throw new Error('Unauthorized to edit this user');
  }

  // Whitelist allowed fields to update
  const allowedUpdates = [
    'name',
    'userName',
    'profilePicture',
    'accountSettings',
    'notificationSettings',
    'city',
    'state',
    'country',
    // add any other allowed top-level fields
  ];

  Object.keys(updatedData).forEach((key) => {
    if (allowedUpdates.includes(key)) {
      user[key] = updatedData[key];
    }
  });

  // Save and return updated user
  return user.save();
}


  async pushToField(userId, field, value) {
    return User.findByIdAndUpdate(userId, { $push: { [field]: value } }, { new: true });
  }

  async pullFromField(userId, field, value) {
    return User.findByIdAndUpdate(userId, { $pull: { [field]: value } }, { new: true });
  }

  async findFriendRequests(userId) {
    const user = await User.findOne({_id: userId}).populate('friendRequests.from', 'name email username _id');
    return user ? user.friendRequests : [];
  }

  async findFriends(userId) {
    const user = await User.findOne({_id: userId}).populate('friends', 'name email username _id');
    return user ? user.friends : [];
  }

  
  async updateProfilePicture(userId, file) {
    const user = await this.findById(userId);
    if (user?.profilePicture) {
      //await FileUploadService.deleteFromS3(user.profilePicture);
    }
  
    const uniqueFileName = `images/users/${uuidv4()}_${file.originalname}`;
    const uploadResult = await FileUploadService.uploadToS3(file.buffer, uniqueFileName, file.mimetype);
  
    await this.findByIdAndUpdate(userId,{profilePicture: uploadResult.Location} );
    return uploadResult;
  }
}

export default UserRepositoryImpl;
