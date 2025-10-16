import express from 'express';
import passport from '../../application/services/GoogleAuthService.js';
import CommonResponse from '../../application/common/CommonResponse.js';
import StagePostService from '../../application/services/StagePostService.js';

const router = express.Router();





// 3. Update a stage post
router.put(
  '/:postId',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    try {
      const updatedPost = await StagePostService.update(req.params.postId, req.user.id, req.body);
      CommonResponse.success(res, updatedPost);
    } catch (err) {
      CommonResponse.error(res, err.message, 400);
    }
  }
);

// 4. Delete a stage post
router.delete(
  '/:postId',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    try {
      const result = await StagePostService.delete(req.params.postId, req.user.id);
      CommonResponse.success(res, result);
    } catch (err) {
      CommonResponse.error(res, err.message, 400);
    }
  }
);

// 5. Toggle like on post
router.post(
  '/:postId/toggle-like',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    try {
      const result = await StagePostService.toggleLike(req.params.postId, req.user.id);
      CommonResponse.success(res, result);
    } catch (err) {
      CommonResponse.error(res, err.message, 400);
    }
  }
);

// 6. Add comment
router.post(
  '/:postId/comments',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    try {
      const comment = await StagePostService.addComment(req.params.postId, req.user.id, req.body.text);
      CommonResponse.success(res, comment);
    } catch (err) {
      CommonResponse.error(res, err.message, 400);
    }
  }
);

// 7. Edit comment
router.put(
  '/:postId/comments/:commentId',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    try {
      const updatedComment = await StagePostService.editComment(req.params.postId, req.params.commentId, req.user.id, req.body.text);
      CommonResponse.success(res, updatedComment);
    } catch (err) {
      CommonResponse.error(res, err.message, 400);
    }
  }
);

// 8. Delete comment
router.delete(
  '/:postId/comments/:commentId',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    try {
      const result = await StagePostService.deleteComment(req.params.postId, req.params.commentId, req.user.id);
      CommonResponse.success(res, result);
    } catch (err) {
      CommonResponse.error(res, err.message, 400);
    }
  }
);

// 1. Create a stage post
router.post(
  '/:refType/:refId',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    try {
      const { refType, refId } = req.params;
      const post = await StagePostService.create(refType, refId, req.body, req.user.id);
      CommonResponse.success(res, post);
    } catch (err) {
      CommonResponse.error(res, err.message, 400);
    }
  }
);

// 9. Reorder posts for a refType + refId
router.post(
  '/:refType/:refId/reorder',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    try {
      const { refType, refId } = req.params;
      const newOrderIds = req.body.newOrderIds; // expects array of post IDs
      const reordered = await StagePostService.reorderPosts(refType, refId, newOrderIds, req.user.id);
      CommonResponse.success(res, reordered);
    } catch (err) {
      CommonResponse.error(res, err.message, 400);
    }
  }
);

// 10. Get all stage posts for a group or event with pagination
router.get(
  '/:refType/:refId',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    try {
      const { refType, refId } = req.params;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;

      const posts = await StagePostService.getStagePosts(refType, refId, page, limit, req.user.id);
      CommonResponse.success(res, posts);
    } catch (err) {
      CommonResponse.error(res, err.message, 400);
    }
  }
);


export default router;
