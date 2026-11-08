// Upgrade account identity without changing IDs or owned data.
export function initAccounts(db) {
  const columns = db.prepare('PRAGMA table_info(accounts)').all()
  db.exec('PRAGMA foreign_keys=OFF; BEGIN IMMEDIATE')
  try {
    if (!columns.some(c => c.name === 'phone')) {
      db.exec('ALTER TABLE accounts ADD COLUMN phone TEXT; DELETE FROM sessions')
    }
    if (columns.find(c => c.name === 'email')?.notnull) {
      db.exec(`CREATE TABLE accounts_next (
        id TEXT PRIMARY KEY, email TEXT UNIQUE, name TEXT NOT NULL,
        salt TEXT NOT NULL, hash TEXT NOT NULL, state TEXT NOT NULL,
        revision INTEGER DEFAULT 0, phone TEXT);
        INSERT INTO accounts_next SELECT id,email,name,salt,hash,state,revision,phone FROM accounts;
        DROP TABLE accounts;
        ALTER TABLE accounts_next RENAME TO accounts;`)
    }
    db.exec('CREATE UNIQUE INDEX IF NOT EXISTS account_phone ON accounts(phone)')
    if (db.prepare('PRAGMA foreign_key_check').all().length) {
      throw new Error('Account migration failed the ownership integrity check')
    }
    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  } finally {
    db.exec('PRAGMA foreign_keys=ON')
  }
}
