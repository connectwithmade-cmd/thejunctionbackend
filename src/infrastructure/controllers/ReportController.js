import express from "express";
import passport from "../../application/services/GoogleAuthService.js";
import CommonResponse from "../../application/common/CommonResponse.js";
import ReportService from "../../application/services/ReportService.js";

const router = express.Router();


// Create report
router.post(
  "/",
  passport.authenticate("jwt",{ session:false }),
  async (req,res)=>{

    try{

      const reporterId = req.user.id;

      const { targetType, targetId, reason } = req.body;

      const report = await ReportService.createReport({
        reporterId,
        targetType,
        targetId,
        reason
      });

      CommonResponse.success(res,report);

    }catch(err){
      CommonResponse.error(res,err.message,400);
    }

  }
);


// Moderator queue
router.get(
  "/moderator-queue",
  passport.authenticate("jwt",{ session:false }),
  async(req,res)=>{

    try{

      const reports = await ReportService.getPendingReports();

      CommonResponse.success(res,reports);

    }catch(err){
      CommonResponse.error(res,err.message,400);
    }

  }
);

export default router;