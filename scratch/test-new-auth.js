const { MongoClient } = require('mongodb');
const uri = "mongodb://Rakshak:H2CkBBtwKL37UyY9@ac-n1hxxrk-shard-00-02.kocbuej.mongodb.net:27017/?authSource=admin&ssl=true";
const client = new MongoClient(uri);
async function run() {
  try {
    await client.connect();
    console.log('Connection successful!');
    const isMaster = await client.db('admin').command({ isMaster: 1 });
    console.log('Replica Set Name:', isMaster.setName);
  } catch (e) {
    console.error('Connection failed:', e.message);
  } finally {
    await client.close();
  }
}
run();
