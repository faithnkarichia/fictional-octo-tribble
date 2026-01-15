const SimpleRDBMS = require('../src/db');

const db = new SimpleRDBMS();

db.execute(`
  CREATE TABLE users (
    id INT PRIMARY KEY,
    name TEXT,
    email TEXT UNIQUE,
    age INT
  )
`);

db.execute("INSERT INTO users VALUES (1, 'Alice', 'alice@example.com', 25)");
db.execute("INSERT INTO users VALUES (2, 'Bob', 'bob@example.com', 30)");

console.log(db.execute('SELECT * FROM users'));
console.log(db.execute('SELECT name, age FROM users WHERE age > 25'));

console.log(db.execute('SHOW TABLES'));

console.log(db.execute('DESCRIBE users'));