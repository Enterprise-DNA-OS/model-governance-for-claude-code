# Verification scope

npm test creates a fresh temporary database, migrates, seeds twice and exercises every CLI command. It checks approval gates, expired evidence, version changes, rollback, duplicate imports, changed imports, source retention, selector ambiguity, invalid arguments, date validity and escaped HTML. It renders all three dashboard and document types. No customer data or network calls are used.

The same Node test script runs on Windows and Linux. The committed workflow runs Node 22 on both. A local Linux pass is not a claim that Windows or hosted PostgreSQL has run. Set TEST_DATABASE_URL to a disposable empty PostgreSQL database to run the same suite there. It never drops or truncates a database. The database must be empty and explicitly isolated.

The export is a complete domain data handover, not a restore tool. Evidence links are not fetched. No load, penetration, authentication or regulatory certification tests are included.
