// Quick test to see if the API methods exist
const BlocSaviourAPI = require('./lib/api/blockchain-real.ts');
console.log('Available methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(BlocSaviourAPI)));
