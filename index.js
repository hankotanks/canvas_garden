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
    res.render('app', { token: req.body.token, user: req.body.user });
  } else if(req.body.status == 'failure') {
    res.render('login', { message: 'An account with this username exists, but it couldn\'t be authenticated. Please try again' });
  }
});

const redirect = (response, token, user) => {
  let data;
  if(token) {
    data = { status: 'success', token: token, user: user };
  } else {
    data = { status: 'failure', token: null, user: null };
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
      redirect(res, raw_token, acct.user);
    } else {
      // LOGIN FAILURE
      redirect(res, null, acct.user);
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
    checkSum: CryptoJS.MD5(USERS_TEMP[user].pw).toString(),
    stored_assignments: [],
    resources: {
      seeds: 0
    }
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

  socket.on('getOldAssignments', data => {
    let { user, token } = data;

    console.log(user);
    socket.emit('getOldAssignments', USERS[user].stored_assignments || []);
  });

  socket.on('getCurrentAssignments', async token => {
    const assignments = [];

    const next_regex = /,<.+?(?=>; rel="next")/;

    let next_request = 'https://canvas.instructure.com/api/v1/users/self/activity_stream/';
    while(next_request != null) {
      let response = await axios.get(next_request, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const match = response.headers.link.match(next_regex);

      next_request = match ? match[0].substring(2) : null;
      const batch = response.data
        .filter(item => item.type == "Submission" && !item.submitted_at)
        .map(item => ({
          title: item.title,
          id: item.assignment_id,
          course_name: item.course.name,
          due_at: item.assignment.due_at
        }));

      assignments.push(...batch);
    }

    socket.emit('getCurrentAssignments', assignments);
  });

  socket.on('storeAssignments', data => {
    let { user, token, assignments } = data;

    USERS[user].stored_assignments = assignments;

    fs.writeFileSync(ENV.userDataPath, JSON.stringify(USERS));
  });

  socket.on('getResourceCounts', user => {
    socket.emit('getResourceCounts', USERS[user].resources);
  });

  socket.on('redeemAssignment', user => {
    USERS[user].resources.seeds += 1;
    socket.emit('getResourceCounts', USERS[user].resources);
  });
});