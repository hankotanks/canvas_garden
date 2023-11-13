module.exports = {
  render_main_app: (response, token) => {
      response.render('temp', { token: token });
  }
};

/*
const REQUEST = `https://canvas.instructure.com/api/v1/courses`

const axios = require('axios');

axios.get(REQUEST, {
    headers: {
      'Authorization': `Bearer ${ACCESS_TOKEN}`
    }
  }).then(
    response => console.log(response.data)
  ).catch(error => console.error("Unable to "));
*/