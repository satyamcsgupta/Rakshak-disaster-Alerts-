const dns = require('dns');
dns.resolveSrv('_mongodb._tcp.cluster0.kocbuej.mongodb.net', (err, addresses) => {
  if (err) {
    console.error('DNS SRV Resolution Error:', err);
  } else {
    console.log('SRV Addresses:', addresses);
  }
});
