const Task = require('../models/Task');

const listTasks = async (req, res, next) => {
  try {
    const tasks = await Task.find({ user: req.user._id }).sort({
      createdAt: -1
    });
    res.json(tasks);
  } catch (err) {
    next(err);
  }
};

module.exports = { listTasks };
