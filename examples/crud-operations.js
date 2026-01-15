const SimpleRDBMS = require("../src/db");

const db = new SimpleRDBMS();

db.execute(`
  CREATE TABLE products (
    id INT PRIMARY KEY,
    name TEXT,
    price REAL,
    in_stock BOOLEAN
  )
`);

db.execute("INSERT INTO products VALUES (1, 'Laptop', 999.99, true)");
db.execute("INSERT INTO products VALUES (2, 'Mouse', 25.50, true)");
db.execute("INSERT INTO products VALUES (3, 'Keyboard', 75.00, false)");

console.log("Initial data:");
console.log(db.execute("SELECT * FROM products"));

console.log("\nUpdating product 3:");
db.execute("UPDATE products SET price = 69.99, in_stock = true WHERE id = 3");
console.log(db.execute("SELECT * FROM products WHERE id = 3"));

console.log("\nDeleting out of stock products:");
db.execute("DELETE FROM products WHERE in_stock = false");
console.log(db.execute("SELECT * FROM products"));

console.log("\nDropping table:");
console.log(db.execute("DROP TABLE products"));
console.log(db.execute("SHOW TABLES"));
