import { MongoClient, Db } from 'mongodb';

const uri = process.env.MONGODB_URI as string;

if (!uri) {
  throw new Error('Missing MONGODB_URI — add it to your .env file.');
}

// In development, attach the client promise to globalThis so that
// Next.js hot reloads don't spawn a new MongoClient on every file save.
// In production each serverless instance creates exactly one client.
declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === 'development') {
  if (!global._mongoClientPromise) {
    const client = new MongoClient(uri);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  const client = new MongoClient(uri);
  clientPromise = client.connect();
}

export async function connectToDatabase(): Promise<{ client: MongoClient; db: Db }> {
  const client = await clientPromise;
  // Use the database name from the URI if present; otherwise falls back to 'test'.
  // Set a DB name explicitly in the URI path (e.g. /myDatabase) for clarity.
  const db = client.db();
  return { client, db };
}
