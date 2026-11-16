import { DatabaseSync } from 'node:sqlite'

const db = new DatabaseSync('data/scoops.sqlite')
db.exec('PRAGMA foreign_keys = OFF')
const row = db.prepare("select customer_id as id from customers where last_name = 'Tester'").get()
if (row) {
  db.prepare('delete from order_details where order_id in (select order_id from orders where customer_id = ?)').run(row.id)
  db.prepare('delete from orders where customer_id = ?').run(row.id)
  db.prepare('delete from customer_logins where customer_id = ?').run(row.id)
  db.prepare('delete from customers where customer_id = ?').run(row.id)
  console.log('removed', row.id)
} else {
  console.log('no tester row')
}
