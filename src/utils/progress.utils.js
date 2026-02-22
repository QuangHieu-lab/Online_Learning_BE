const { PROGRESS_STATUS_COMPLETED } = require('../config/constants');

/**
 * Compute course progress from enrollment and course (with modules.lessons) or from progress records + lesson list.
 * Returns { completedCount, total, percent }.
 */
function computeCourseProgress(enrollment, course) {
  const allLessonIds = course.modules.flatMap((m) => m.lessons.map((l) => l.lessonId));
  const total = allLessonIds.length;
  const progressRecords = enrollment.learningProgress || [];
  const completedCount = progressRecords.filter(
    (p) => p.status === PROGRESS_STATUS_COMPLETED
  ).length;
  const percent = total > 0 ? Math.round((completedCount / total) * 100) : 0;
  return { completedCount, total, percent };
}

module.exports = { computeCourseProgress };
