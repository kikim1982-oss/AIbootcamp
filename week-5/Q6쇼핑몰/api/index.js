const express = require('express');
const { requireAuth } = require('../middleware/auth');

const register = require('./auth/register');
const login = require('./auth/login');
const me = require('./auth/me');

const listProducts = require('./products/list');

const listCart = require('./cart/list');
const addCart = require('./cart/add');
const updateCart = require('./cart/update');
const deleteCart = require('./cart/delete');

const router = express.Router();

router.post('/auth/register', register);
router.post('/auth/login', login);
router.get('/auth/me', requireAuth, me);

router.get('/products', listProducts);

router.get('/cart', requireAuth, listCart);
router.post('/cart', requireAuth, addCart);
router.patch('/cart/:id', requireAuth, updateCart);
router.delete('/cart/:id', requireAuth, deleteCart);

module.exports = router;
