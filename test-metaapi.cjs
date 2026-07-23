const https = require('https');

const options = {
  hostname: 'mt-client-api-v1.agiliumtrade.agiliumtrade.ai',
  port: 443,
  path: '/users/current/accounts/f8c739ea-abca-41eb-b091-e3d384757954/account-information',
  method: 'GET'
};

const req = https.request(options, (res) => {
  console.log('statusCode:', res.statusCode);
  console.log('headers:', res.headers);
  res.on('data', (d) => {
    process.stdout.write(d);
  });
});

req.on('error', (e) => {
  console.error(e);
});

req.end();
