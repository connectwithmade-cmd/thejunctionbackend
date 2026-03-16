import Report from "../../domain/models/Report.js";
import Event from "../../domain/models/Event.js";
import ReportAnalyzer from "./moderation/ReportAnalyzer.js";

class ReportService {

  async createReport({ reporterId, targetType, targetId, reason }) {

    const report = new Report({
      reporterId,
      targetType,
      targetId,
      reason
    });

    await report.save();

    let content;

    if (targetType === "event") {
      content = await Event.findById(targetId);
    }

    if (!content) {
      report.status = "resolved";
      await report.save();
      return report;
    }

    const analysis = await ReportAnalyzer.analyze(report, content);

    if (analysis.action === "remove") {

      if (targetType === "event") {
        content.moderation = {
          status: "blocked"
        };

        await content.save();
      }

      report.status = "auto_resolved";
    }

    if (analysis.action === "review") {
      report.status = "sent_to_moderator";
    }

    if (analysis.action === "ignore") {
      report.status = "resolved";
    }

    await report.save();

    return report;
  }

  async getPendingReports() {
    return Report.find({ status: "sent_to_moderator" })
      .populate("reporterId","name email");
  }

}

export default new ReportService();