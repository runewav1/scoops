import { DatabaseSync } from 'node:sqlite'

const db = new DatabaseSync('data/scoops.sqlite')
const row = db.prepare("select id from transactions where first_initial = 'Q' and last_name = 'Tester'").get()
if (row) {
  db.prepare('delete from transaction_items where transaction_id = ?').run(row.id)
  db.prepare('delete from transactions where id = ?').run(row.id)
  console.log('removed', row.id)
} else {
  console.log('no tester row')
}
