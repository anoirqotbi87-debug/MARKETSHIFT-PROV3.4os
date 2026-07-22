const http = require('http');
http.get('http://localhost:3000', (res) => {
  console.log('App is alive on 3000');
}).on('error', (e) => {
  console.error('App is down: ' + e.message);
});
