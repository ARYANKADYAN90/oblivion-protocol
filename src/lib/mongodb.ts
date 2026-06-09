import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI as string;
let client: MongoClient | null = null;

export async function connectToDatabase() {
  if (!uri) {
    throw new Error('Please add your Mongo URI to .env');
  }

  if (!client) {
    client = new MongoClient(uri);
    await client.connect();
  }
  
  return client.db();
}
