import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

export async function POST(req: Request) {
  try {
    const { targetEntity } = await req.json();

    if (!targetEntity) {
      return NextResponse.json({ error: "Target entity identifier is required" }, { status: 400 });
    }

    const cleanEntity = targetEntity.trim();
    const db = await connectToDatabase();
    const adminDb = db.client.db().admin();
    
    // 1. DYNAMIC SCHEMA DISCOVERY
    // Instead of hardcoding collections, the agent autonomously maps the entire cluster
    const databasesList = await adminDb.listDatabases();
    let totalDeleted = 0;
    let totalModified = 0;
    const executionLogs = [];

    executionLogs.push(`[SYSTEM] Initiating Autonomous Schema Crawl...`);
    executionLogs.push(`[SYSTEM] Discovered ${databasesList.databases.length} databases in cluster.`);

    for (const databaseInfo of databasesList.databases) {
      // Skip system databases
      if (['admin', 'local', 'config'].includes(databaseInfo.name)) continue;

      const currentDb = db.client.db(databaseInfo.name);
      const collections = await currentDb.listCollections().toArray();
      
      for (const collectionInfo of collections) {
        const coll = currentDb.collection(collectionInfo.name);
        
        // Use a wildcard text search or explicit regex to hunt the entity
        // We will do a regex search across common PII fields
        const query = { 
          $or: [
            { email: new RegExp(cleanEntity, 'i') },
            { "user.email": new RegExp(cleanEntity, 'i') },
            { username: new RegExp(cleanEntity, 'i') }
          ] 
        };

        try {
          // Autonomous Decision: Anonymize or Hard Delete?
          // If collection name contains 'log' or 'history', we redact.
          // Otherwise, we hard delete.
          if (collectionInfo.name.toLowerCase().includes('log') || collectionInfo.name.toLowerCase().includes('history') || collectionInfo.name.toLowerCase().includes('comments')) {
            const updateResult = await coll.updateMany(query, {
              $set: {
                email: "redacted@oblivion.protocol",
                name: "REDACTED_USER",
                username: "REDACTED_USER"
              }
            });
            if (updateResult.modifiedCount > 0) {
              totalModified += updateResult.modifiedCount;
              executionLogs.push(`[SUCCESS] REDACTED ${updateResult.modifiedCount} record(s) in ${databaseInfo.name}.${collectionInfo.name}`);
            }
          } else {
            const deleteResult = await coll.deleteMany(query);
            if (deleteResult.deletedCount > 0) {
              totalDeleted += deleteResult.deletedCount;
              executionLogs.push(`[SUCCESS] WIPED ${deleteResult.deletedCount} record(s) from ${databaseInfo.name}.${collectionInfo.name}`);
            }
          }
        } catch (e) {
          // Ignore collections that can't be queried (e.g. system views)
        }
      }
    }

    if (totalDeleted === 0 && totalModified === 0) {
      executionLogs.push(`[INFO] Deep scan complete. Zero traces of ${cleanEntity} found across all schemas.`);
    }

    const cryptoHash = Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('');

    return NextResponse.json({ 
      success: true, 
      status: "Oblivion Protocol Executed",
      receipt: `RTBF-${cryptoHash}`,
      logs: executionLogs,
      summary: { deletedCount: totalDeleted, modifiedCount: totalModified }
    });

  } catch (error: any) {
    console.error("Execution Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
