require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(cors());
app.use(express.json());

// Connect DB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log(" MongoDB Connected"))
  .catch(err => console.error(" DB Error:", err));

// Schema
const WorkoutSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  type: String, duration: Number, distance: Number, intensity: String
});
const Workout = mongoose.model('Workout', WorkoutSchema);

// AI Config
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const MODEL_NAMES = ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-pro"];

async function getWorkingModel(prompt) {
  for (const name of MODEL_NAMES) {
    try {
      const model = genAI.getGenerativeModel({ model: name });
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (e) { continue; }
  }
  throw new Error("AI Unavailable");
}

// --- ROUTES ---

app.get('/api/workouts', async (req, res) => {
  const workouts = await Workout.find().sort({ date: -1 });
  res.json(workouts);
});

app.post('/api/workouts', async (req, res) => {
  try {
    const newWorkout = new Workout(req.body);
    await newWorkout.save();
    res.json(newWorkout);
  } catch (err) { res.status(500).json({error: err.message}) }
});

app.put('/api/workouts/:id', async (req, res) => {
  try {
    const updated = await Workout.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) { res.status(500).json({error: err.message}) }
});

app.delete('/api/workouts/:id', async (req, res) => {
  await Workout.findByIdAndDelete(req.params.id);
  res.json({ message: "Deleted" });
});

app.post('/api/upload', upload.single('file'), (req, res) => {
  const results = [];
  fs.createReadStream(req.file.path).pipe(csv())
    .on('data', (data) => results.push({
        type: data.type || 'Run', duration: parseInt(data.duration) || 30,
        distance: parseFloat(data.distance) || 0, intensity: data.intensity || 'Medium',
        date: data.date ? new Date(data.date) : new Date()
    }))
    .on('end', async () => {
      await Workout.insertMany(results);
      fs.unlinkSync(req.file.path);
      res.json({ message: 'Success' });
    });
});

// --- ADVANCED 4-TIER AI ANALYTICS ---
app.get('/api/analyze', async (req, res) => {
  try {
    // Fetch last 50 workouts to give AI enough context for monthly/yearly trends
    const recent = await Workout.find().sort({ date: -1 }).limit(50);
    const today = new Date().toISOString().split('T')[0];

    const prompt = `
      Current Date: ${today}.
      Data: ${JSON.stringify(recent)}.

      Task: Analyze performance across 4 timelines.
      1. TODAY: Specific feedback on today's session (if any).
      2. WEEKLY: Summary of the last 7 days (volume/intensity).
      3. MONTHLY: Trend over the last 30 days.
      4. YEARLY: High-level progress note.
      5. PLAN: 3-day future plan.

      Return JSON (No Markdown):
      {
        "today": "Great effort on the 5k run today...",
        "weekly": "Volume is up 10% this week. Good consistency.",
        "monthly": "You logged 12 runs this month. Average pace improved.",
        "yearly": "Consistent year-round. Focus on strength in Q4.",
        "plan": ["Tomorrow: Rest", "Day 2: Intervals", "Day 3: Long Run"],
        "score": 88
      }
    `;
    
    let text = await getWorkingModel(prompt);
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    res.json(JSON.parse(text));
  } catch (error) {
    console.error(error);
    res.json({ 
        today: "No data available.", 
        weekly: "Keep pushing.", 
        monthly: "Maintain consistency.", 
        yearly: "Long term growth.", 
        plan: ["Rest", "Train", "Recover"], 
        score: 0 
    });
  }
});

const PORT = 5000;
app.listen(PORT, () => console.log(` Server running on port ${PORT}`));