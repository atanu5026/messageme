const express = require('express');
const router = express.Router();
const { createStatus, getStatuses, deleteStatus } = require('../controllers/status.controller');
const { protect } = require('../middleware/auth.middleware');
const { upload } = require('../config/cloudinary');

router.use(protect);

router.get('/', getStatuses);
router.post('/', upload.single('image'), createStatus);
router.delete('/:id', deleteStatus);

module.exports = router;
