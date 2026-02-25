const express = require("express");
const { authenticate } = require("../middleware/auth.middleware");
const { authorizeRoles } = require("../middleware/role.middleware");
const { getAllUsers, getAllTasks, deleteAnyTask, updateUserRole } = require("../controllers/admin.controller");

const router = express.Router();

// All admin routes require: authentication + ADMIN role
router.use(authenticate);
router.use(authorizeRoles("ADMIN"));

router.get("/users", getAllUsers);
router.patch("/users/:id/role", updateUserRole);
router.get("/tasks", getAllTasks);
router.delete("/tasks/:id", deleteAnyTask);

module.exports = router;
