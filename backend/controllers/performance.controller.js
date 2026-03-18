import Task from "../models/Task.js"; 
import Attendance from "../models/Attendance.js"; 
// ✅ Gemini Client එක import කිරීම
import { geminiModel } from "../utils/geminiClient.js"; 

const getMonthDateRange = (year, month) => {
  const startDate = new Date(year, month - 1, 1);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);
  return { startDate, endDate };
};

export const getMyPerformance = async (req, res) => {
  try {
    const userId = req.user._id;

    const queryMonth = parseInt(req.query.month);
    const queryYear = parseInt(req.query.year);

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const month = !isNaN(queryMonth) && queryMonth >= 1 && queryMonth <= 12 ? queryMonth : currentMonth;
    const year = !isNaN(queryYear) && queryYear >= 1900 && queryYear <= 2100 ? queryYear : currentYear;

    const { startDate, endDate } = getMonthDateRange(year, month);

    const tasks = await Task.find({
      user: userId,
      dueDate: { $gte: startDate, $lte: endDate },
    });

    const attendanceRecords = await Attendance.find({
      user: userId,
      date: { $gte: startDate, $lte: endDate },
    });

    let overallScore = 0;
    const metrics = [];
    const achievements = [];
    let feedback = "No feedback available at this time.";

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === "Completed").length;
    const taskCompletionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    metrics.push({
      id: 1,
      name: "Task Completion Rate",
      value: parseFloat(taskCompletionRate.toFixed(2)),
      target: 90,
      unit: "%",
      trend: taskCompletionRate >= 90 ? "up" : taskCompletionRate >= 70 ? "neutral" : "down",
    });

    const presentDaysWithCheckIn = attendanceRecords.filter(a => a.checkIn).length;
    const targetCheckInHour = 9;

    const punctualCheckInsCount = attendanceRecords.filter(a => {
        if (!a.checkIn) return false;
        const checkInDate = new Date(a.checkIn);
        return checkInDate.getHours() < targetCheckInHour || (checkInDate.getHours() === targetCheckInHour && checkInDate.getMinutes() === 0);
    }).length;

    const punctualityRate = presentDaysWithCheckIn > 0 ? (punctualCheckInsCount / presentDaysWithCheckIn) * 100 : 0;

    metrics.push({
      id: 2,
      name: "Punctuality",
      value: parseFloat(punctualityRate.toFixed(2)),
      target: 90,
      unit: "%",
      trend: punctualityRate >= 90 ? "up" : punctualityRate >= 70 ? "neutral" : "down",
    });

    let totalHoursWorked = 0;
    attendanceRecords.forEach(record => {
      if (record.checkIn && record.checkOut) {
        const diffMs = new Date(record.checkOut) - new Date(record.checkIn);
        totalHoursWorked += diffMs / (1000 * 60 * 60);
      }
    });

    const targetMonthlyHours = 160;
    const hoursWorkedScore = Math.min((totalHoursWorked / targetMonthlyHours) * 100, 100);
    metrics.push({
      id: 3,
      name: "Hours Worked",
      value: parseFloat(totalHoursWorked.toFixed(2)),
      target: targetMonthlyHours,
      unit: " hrs",
      trend: totalHoursWorked >= targetMonthlyHours * 0.9 ? "up" : totalHoursWorked >= targetMonthlyHours * 0.7 ? "neutral" : "down",
    });

    overallScore = (
      (taskCompletionRate * 0.5) +
      (punctualityRate * 0.25) +
      (hoursWorkedScore * 0.25)
    );
    overallScore = parseFloat(overallScore.toFixed(2));

    if (taskCompletionRate >= 95) achievements.push("Outstanding Task Completion!");
    if (punctualityRate >= 95) achievements.push("Excellent Punctuality!");
    if (totalHoursWorked >= targetMonthlyHours) achievements.push("Achieved working hours target!");
    
    if (achievements.length === 0) achievements.push("Keep working hard to earn achievements!");

    // --- ✅ AI Feedback Generation (Using Gemini) ---
    const prompt = `Generate a concise, encouraging performance feedback for an employee for ${new Date(year, month - 1).toLocaleString('en-US', { month: 'long', year: 'numeric'})}:
    - Overall Score: ${overallScore}%
    - Task Completion: ${taskCompletionRate}% (Target: 90%)
    - Punctuality: ${punctualityRate}% (Target: 90%)
    - Hours Worked: ${totalHoursWorked.toFixed(2)} hrs.
    
    Feedback should be 1-2 sentences in a friendly tone.`;

    try {
      // ✅ Gemini භාවිතා කරන ආකාරය
      const result = await geminiModel.generateContent(prompt);
      const response = await result.response;
      feedback = response.text().trim();
    } catch (aiError) {
      console.error("Failed to generate Gemini feedback:", aiError);
      feedback = "Good job this month! Continue to maintain your performance across all tasks.";
    }

    res.json({
      overallScore: overallScore,
      metrics: metrics,
      achievements: achievements,
      feedback: feedback,
    });
  } catch (err) {
    console.error("Failed to fetch performance:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};