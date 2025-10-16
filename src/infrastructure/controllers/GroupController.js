import express from 'express';
import multer from 'multer';
import CommonResponse from '../../application/common/CommonResponse.js';
import GroupService from "../../application/services/GroupService.js";
import passport from "../../application/services/GoogleAuthService.js";
import mongoose from "mongoose";


const router = express.Router();
const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter: (req, file, cb) => {
        if (file && !file.mimetype.startsWith('image/')) {
            return cb(new Error('Only image files are allowed'), false);
        }
        cb(null, true);
    },
});
// 1. Create Group
router.post(
  '/',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    const {
      name,
      description,
      categories,
      tags,
      bannerImages,
      type, // public / private
    } = req.body;

    const userId = req.user.id;

    try {
      const group = await GroupService.createGroup({
        name,
        description,
        categories: categories || [],
        tags: tags || [],
        bannerImages: bannerImages || [],
        type,
        creator: userId,
        members: [
          {
            user: new mongoose.Types.ObjectId(userId),
            role: 'admin',
          },
        ],
        stagePosts: [],
        eventIds: [] ,
        eventStatuses: new Map(),
      });

      CommonResponse.success(res, group);
    } catch (err) {
      CommonResponse.error(res, err.message, 400);
    }
  }
);
router.post('/respond', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const { groupId, action } = req.body;

    // Validate inputs
    if (!groupId || !['accept', 'reject'].includes(action)) {
      return CommonResponse.error(res, 'Missing or invalid groupId/action.', 400);
    }

    const result = await GroupService.respondToInviteOrJoin(groupId, req.user.id, action);
    CommonResponse.success(res, {
      message: `You have ${action === 'accept' ? 'joined' : 'responded to'} the group.`,
      group: result
    });
  } catch (err) {
    console.error('Group respond error:', err);
    CommonResponse.error(res, err.message || 'Failed to respond to group invite.', 400);
  }
});





router.get('/public', 
      passport.authenticate('jwt', { session: false }),

    async (req, res) => {

  try {
    const {
      category,
      searchString,
      page,
      limit,
    } = req.query;

    const filters = {
      category,
      searchString,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10,
      userId: req.user.id, // Use authenticated user's ID
    };

    const groups = await GroupService.getAllPublicGroups(filters);
    CommonResponse.success(res, groups);
  } catch (err) {
    CommonResponse.error(res, err.message || 'Something went wrong', 400);
  }
});

// Get paginated groups created by user
router.get(
  '/my-groups',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    const  userId  = req.user.id;
    const { page = 1, limit = 10 } = req.query;

    try {
      const result = await GroupService.getMyCreatedGroups(userId, parseInt(page), parseInt(limit));
      CommonResponse.success(res, result);
    } catch (err) {
      CommonResponse.error(res, err.message, 403);
    }
  }
);


// Get paginated groups joined by user
router.get(
  '/joined',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    const  userId  = req.user.id;
    const { page = 1, limit = 10 } = req.query;
    console.log("User ID:", userId, "Page:", page, "Limit:", limit);

    try {
      const result = await GroupService.getMyJoinedGroups(userId, parseInt(page), parseInt(limit));
      CommonResponse.success(res, result);
    } catch (err) {
      CommonResponse.error(res, err.message, 403);
    }
  }
);

router.get(
  '/group/by-id/:id',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    try {
      const group = await GroupService.findGroupById(req.params.id, req.user.id);
      CommonResponse.success(res, group);
    } catch (err) {
      CommonResponse.error(res, err.message || 'Failed to fetch group', 403);
    }
  }
);





// Edit/Modify Group
router.post(
  '/:groupId',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    const { groupId } = req.params;
    const {
      name,
      description,
      categories,
      tags,
      bannerImages,
      type,
    } = req.body;

    const updates = {};

    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (categories !== undefined) updates.categories = categories;
    if (tags !== undefined) updates.tags = tags;
    if (bannerImages !== undefined) updates.bannerImages = bannerImages;
    if (type !== undefined) updates.type = type;

    try {
      const group = await GroupService.editGroup(groupId, updates, req.user.id);
      CommonResponse.success(res, group);
    } catch (err) {
      CommonResponse.error(res, err.message, 400);
    }
  }
);


// 4. Search Public Groups
router.get('/search', async (req, res) => {
    const { query, category } = req.query;
    console.log(query, category)

    try {
        const groups = await GroupService.searchPublicGroups(query, category);
        CommonResponse.success(res, groups);
    } catch (err) {
        CommonResponse.error(res, err.message, 400);
    }
});


// 5. Invite Users to Group
router.post('/:groupId/invite', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userIds } = req.body;

    if (!groupId || !Array.isArray(userIds) || userIds.length === 0) {
      return CommonResponse.error(res, 'groupId (in URL) and userIds (array in body) are required.', 400);
    }

    await GroupService.inviteUsers(groupId, userIds, req.user.id);
    CommonResponse.success(res, { message: 'Users invited successfully.' });
  } catch (err) {
    console.error("Error:", err);
    CommonResponse.error(res, err.message || 'Something went wrong', 400);
  }
});









export default router;
