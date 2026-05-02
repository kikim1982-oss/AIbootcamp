const express = require('express');
const { requireAuth } = require('../middleware/auth');

const register = require('./auth/register');
const login = require('./auth/login');
const logout = require('./auth/logout');
const me = require('./auth/me');

const listPosts = require('./posts/list');
const createPost = require('./posts/create');
const updatePost = require('./posts/update');
const deletePost = require('./posts/delete');
const likePost = require('./posts/like');

const router = express.Router();

router.post('/auth/register', register);
router.post('/auth/login', login);
router.post('/auth/logout', logout);
router.get('/auth/me', requireAuth, me);

router.get('/posts', listPosts);
router.post('/posts', requireAuth, createPost);
router.patch('/posts/:id', requireAuth, updatePost);
router.delete('/posts/:id', requireAuth, deletePost);
router.post('/posts/:id/like', likePost);

module.exports = router;
