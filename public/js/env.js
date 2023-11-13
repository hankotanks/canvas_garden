// This function was inspired by the following answer on SO:
// https://stackoverflow.com/a/41133213
// Credit to Dave Burton
const env = _ => {
    var request = new XMLHttpRequest();

    request.open("GET", "../assets/env.json", false);
    request.send();

    var result = null;
    if(request.status == 200) {
      result = request.responseText;
    }

    window.ENV = JSON.parse(result.trim());
  }