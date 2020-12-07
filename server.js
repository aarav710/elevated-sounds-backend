const express = require('express');
const app = express();
const cors = require('cors');
const constants = require('./constants');
const compression = require('compression');
const bcrypt = require('bcrypt');
const cookieParser = require('cookie-parser');
const utilsFunctions = require('./utils');
require('dotenv').config();
const saltRounds = 10;
app.use(express.json());
app.use(cors({
  origin: 'http://localhost:3001',
  methods: ['POST', 'PUT', 'GET', 'OPTIONS', 'HEAD'],
  credentials: true
}));
app.use(cookieParser());
app.use(compression());
app.use(express.static('images'));
const db = require('knex')({
  client: 'pg',
  connection: process.env.DATABASE_URL
});

/* gets all the necessary things required for the website, such as the recommended products info, 
the url links to categories button and the latest product etc.
*/

app.get('/', (req, res) => db.select().from('products').orderBy('no_of_orders', 'desc').limit(10)
  .then(products => res.json(products)));

app.get('/banner', (req, res) => db.select('product_id').from('products')
  .where('imageurl', '=', 'banner.jpg')
  .then(data => res.json(data[0])));

app.post('/register', (req, res) => {
  //this first part is to check if the email id that the user entered is there or not in our db, 
  //as emails should be unique,thus if there already is the same email we do not let the user login.
  db.select().from('users').where('email_id', '=', req.body.IDofuser)
    .then(email => {
      if (email.length !== 0) res.json(null);
    })
  bcrypt.hash(req.body.password, saltRounds, function (err, hash) {
    db.returning('user_id')
      .insert({ email_id: req.body.IDofuser, password: hash }).into('users')
      .then(userID => {
        res.cookie('jwt', utilsFunctions.makeToken(userID), {httpOnly: true, maxAge: constants.maxAge, secure: true});
        res.json(userID[0]);
      }
    )
  });
});

app.post('/signin', (req, res) => {
  db.select('user_id', 'password').from('users').where('email_id', '=', req.body.IDofuser).then(
    userInformation => {
      bcrypt.compare(req.body.password, userInformation[0].password, function (err, result) {
        if (result) {
          res.cookie('jwt', utilsFunctions.makeToken(userInformation[0].user_id), {httpOnly: true, maxAge:constants.maxAge, secure: true});
          res.json(userInformation[0].user_id);
        }
        else res.json(null);
      });
    }
  );
});

app.get('/products', (req, res) => db.select().from('products').then(products => res.json(products)));

app.get('/cart', (req, res) => {
  if (req.cookies.jwt) {
  db('cart').join('products', 'cart.product_id', '=', 'products.product_id')
    .select('products.product_id', 'products.item', 'products.description', 'products.imageurl', 'products.category', 'products.price', 'cart.cart_id')
    .where('cart.user_id', '=', utilsFunctions.getUserID(req.cookies.jwt))
    .then(data => res.json(data))
  } else res.status(401).end();
  }
);

app.get('/logout', (req, res) => {
  res.cookie('jwt', '', {maxAge: 1});
  res.status(200).end();
});

app.get('/checkUser', (req, res) => {
  const token = req.cookies.jwt;
  if (token) {
    const user_id = utilsFunctions.getUserID(token);
    res.json({user_id: user_id});
  }
  else res.json({user_id: null});
});

app.post('/addToCart', (req, res) => {
  const token = req.cookies.jwt;
  if (token) {
  const user_id = utilsFunctions.getUserID(token);
  db('cart').insert({user_id: user_id, product_id: req.body.product_id}).then(response => res.status(200).end());
  } else res.status(401).end();
});

app.post('/deleteFromCart', (req, res) => {
  const token = req.cookies.jwt;
  if (token) { 
  const user_id = utilsFunctions.getUserID(token);
  db('cart').where('user_id', user_id).andWhere('cart_id', req.body.cart_id).del().then(response => {
    res.status(200).end();
  });
  } else res.status(401).end();
});

// this one is only called after taking the user to the buying form when the user confirms the purchase by giving all the details.
app.post('/buyItem', (req, res) => {
  const token = req.cookies.jwt;
  if (token) {
  const user_id = utilsFunctions.getUserID(token);
  db('orders').insert({user_id: user_id, product_id: req.body.product_id}).then(response => res.status(200).end());
  } else res.status(401).end();
});

app.listen(process.env.PORT);