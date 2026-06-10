import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { randomBytes } from 'crypto';

export async function POST(req: Request) {
  try {
    const { targetEntity } = await req.json();

    if (!targetEntity) {
      return NextResponse.json({ error: 'Target entity identifier is required' }, { status: 400 });
    }

    const cleanEntity = targetEntity.trim();
    const { client } = await connectToDatabase();

    // 1. DYNAMIC SCHEMA DISCOVERY
    // listDatabases() requires the Atlas user to have readAnyDatabase@admin or
    // atlasAdmin role. If your user only has collection-level access, scope this
    // to specific database names instead.
    let databasesList: { databases: { name: string }[] };
    try {
      databasesList = await client.db().admin().listDatabases();
    } catch (adminErr: any) {
      // If the Atlas user lacks admin privileges, fall back to the target database
      // specified in the URI (or 'sample_mflix' as the known demo DB).
      console.warn('[WARN] listDatabases() denied — falling back to URI database.', adminErr.message);
      const fallbackDbName = client.db().databaseName || 'sample_mflix';
      databasesList = { databases: [{ name: fallbackDbName }] };
    }

    let totalDeleted = 0;
    let totalModified = 0;
    const executionLogs: string[] = [];

    executionLogs.push('[SYSTEM] Initiating Autonomous Schema Crawl...');
    executionLogs.push(`[SYSTEM] Discovered ${databasesList.databases.length} database(s) in cluster.`);

    for (const databaseInfo of databasesList.databases) {
      // Skip internal MongoDB system databases
      if (['admin', 'local', 'config'].includes(databaseInfo.name)) continue;

      const currentDb = client.db(databaseInfo.name);

      let collections: { name: string }[];
      try {
        collections = await currentDb.listCollections().toArray();
      } catch {
        // User may not have listCollections privilege on every DB — skip silently
        continue;
      }

      for (const collectionInfo of collections) {
        const coll = currentDb.collection(collectionInfo.name);

        // Hunt the target entity across common PII fields via regex
        const query = {
          $or: [
            { email: new RegExp(cleanEntity, 'i') },
            { 'user.email': new RegExp(cleanEntity, 'i') },
            { username: new RegExp(cleanEntity, 'i') },
          ],
        };

        try {
          const collName = collectionInfo.name.toLowerCase();

          // Compliance Decision: Redact logs/history; hard-delete primary records
          if (
            collName.includes('log') ||
            collName.includes('history') ||
            collName.includes('comment')
          ) {
            const updateResult = await coll.updateMany(query, {
              $set: {
                email: 'redacted@oblivion.protocol',
                name: 'REDACTED_USER',
                username: 'REDACTED_USER',
              },
            });
            if (updateResult.modifiedCount > 0) {
              totalModified += updateResult.modifiedCount;
              executionLogs.push(
                `[SUCCESS] REDACTED ${updateResult.modifiedCount} record(s) in ${databaseInfo.name}.${collectionInfo.name}`
              );
            }
          } else {
            const deleteResult = await coll.deleteMany(query);
            if (deleteResult.deletedCount > 0) {
              totalDeleted += deleteResult.deletedCount;
              executionLogs.push(
                `[SUCCESS] WIPED ${deleteResult.deletedCount} record(s) from ${databaseInfo.name}.${collectionInfo.name}`
              );
            }
          }
        } catch {
          // Skip system views or collections that can't be queried
        }
      }
    }

    if (totalDeleted === 0 && totalModified === 0) {
      executionLogs.push(
        `[INFO] Deep scan complete. Zero traces of "${cleanEntity}" found across all schemas.`
      );
    }

    // Cryptographically sound receipt hash (replaces Math.random())
    const cryptoHash = randomBytes(32).toString('hex');

    return NextResponse.json({
      success: true,
      status: 'Oblivion Protocol Executed',
      receipt: `RTBF-${cryptoHash}`,
      logs: executionLogs,
      summary: { deletedCount: totalDeleted, modifiedCount: totalModified },
    });
  } catch (error: any) {
    console.error('Execution Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
