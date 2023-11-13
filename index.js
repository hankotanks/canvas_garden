const fs = require('fs');
const CryptoJS = require('crypto-js');
const express = require('express');
const axios = require('axios');
const socketIo = require('socket.io');

const ENV_PATH = './public/assets/env.json';
const ENV = JSON.parse(fs.readFileSync(ENV_PATH));

USERS = undefined;
USERS_TEMP = {};

if(fs.existsSync(ENV.userDataPath)) {
  USERS = JSON.parse(fs.readFileSync(ENV.userDataPath, 'utf-8'));
} else {
  USERS = {};
}

const app = express();

app.set('view engine', 'ejs');

app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'))

app.get('/', (req, res) => {
  res.render('login', { message: 'If the entered username does not exist, a new account will be created.' });
});

app.post('/', (req, res) => {
  if(req.body.status == 'success') {
    res.render('app', { token: req.body.token });
  } else if(req.body.status == 'failure') {
    res.render('login', { message: 'An account with this username exists, but it couldn\'t be authenticated. Please try again' });
  }
});

const redirect = (response, token) => {
  let data;
  if(token) {
    data = { status: 'success', token: token };
  } else {
    data = { status: 'failure', token: null };
  }

  response.render('login_redirect', data);
};

app.post('/register', (req, res) => {
  if(!(req.body.user && req.body.pw)) {
    throw new Error('Invalid login object recieved');
  }

  let acct = {
    user: req.body.user,
    pw: req.body.pw
  };

  if(USERS[acct.user]) {
    const checkSum = CryptoJS.MD5(acct.pw).toString();

    if(checkSum == USERS[acct.user].checkSum) {
      const encrypted_token = USERS[acct.user].token;
      const decrypted_token = CryptoJS.AES.decrypt(encrypted_token, acct.pw);

      const raw_token = decrypted_token.toString(CryptoJS.enc.Utf8);

      // LOGIN SUCCESS
      redirect(res, raw_token);
    } else {
      // LOGIN FAILURE
      redirect(res, null);
    }
  } else {
    USERS_TEMP[acct.user] = { pw: acct.pw };

    res.render("login_token", { user: acct.user });
  }

  res.end();
});

app.post('/token', (req, res) => {
  if(!(req.body.user && req.body.token)) {
    throw new Error('Invalid token object recieved');
  }

  const { user, token } = req.body;

  USERS[user] = {
    user: user,
    token: CryptoJS.AES.encrypt(token, USERS_TEMP[user].pw).toString(),
    checkSum: CryptoJS.MD5(USERS_TEMP[user].pw).toString()
  };

  delete USERS_TEMP[user];

  fs.writeFileSync(ENV.userDataPath, JSON.stringify(USERS));
  
  // REGISTRATION SUCCESS
  redirect(res, token);
});

const server = app.listen(ENV.port, _ => {
  console.log(`Server listening on ${ENV.port}`);
});

const io = socketIo(server, {
  cors: {
    origin: '*',
  }
});

io.on('connection', (socket) => {
  socket.on('getCourses', token => {
    const REQUEST = 'https://canvas.instructure.com/api/v1/courses';

    axios.get(REQUEST, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }).then(response => {
      const courses = response.data.map(course => course.name);

      socket.emit('getCourses', courses);
    }).catch(error => socket.emit('error', JSON.stringify(error)));
  });
});