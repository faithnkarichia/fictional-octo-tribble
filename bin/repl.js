#!/usr/bin/env node

const readline = require("readline");
const SimpleRDBMS = require("../src/db");

class REPL {
  constructor() {
    this.db = new SimpleRDBMS();
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: "SQL> ",
    });

    this.setupEventListeners();
  }

  setupEventListeners() {
    this.rl.on("line", (line) => {
      this.handleCommand(line.trim());
      this.rl.prompt();
    });

    this.rl.on("close", () => {
      console.log("\nGoodbye!");
      process.exit(0);
    });
  }

  handleCommand(input) {
    if (!input) return;

    if (input.startsWith(".")) {
      this.handleMetaCommand(input);
      return;
    }

    const result = this.db.execute(input);
    this.displayResult(result);
  }

  handleMetaCommand(command) {
    const [cmd, ...args] = command.slice(1).split(" ");

    switch (cmd.toLowerCase()) {
      case "exit":
      case "quit":
        this.rl.close();
        break;

      case "help":
        this.showHelp();
        break;

      case "tables":
        this.showTables();
        break;

      case "history":
        this.showHistory();
        break;

      case "clear":
        console.clear();
        break;

      case "save":
        this.saveDatabase(args[0]);
        break;

      case "load":
        this.loadDatabase(args[0]);
        break;

      default:
        console.log(`Unknown command: .${cmd}`);
    }
  }

  displayResult(result) {
    if (result.error) {
      console.log(`Error: ${result.error}`);
      return;
    }

    if (result.message) {
      console.log(result.message);
    }

    if (result.data && result.data.length > 0) {
      this.displayTable(result.data);
    } else if (result.count === 0) {
      console.log("(No rows returned)");
    }
  }

  displayTable(data) {
    if (data.length === 0) return;

    // Get column names
    const columns = Object.keys(data[0]);

    // Calculate column widths
    const widths = columns.map((col) => {
      let max = col.length;
      data.forEach((row) => {
        const val = String(row[col] || "");
        if (val.length > max) max = val.length;
      });
      return Math.min(max, 30);
    });

    // Print separator
    const separator =
      "+" + widths.map((w) => "-".repeat(w + 2)).join("+") + "+";
    console.log(separator);

    // Print header
    const header =
      "|" +
      columns.map((col, i) => ` ${col.padEnd(widths[i])} `).join("|") +
      "|";
    console.log(header);
    console.log(separator);

    // Print rows
    data.forEach((row) => {
      const rowStr =
        "|" +
        columns
          .map((col, i) => {
            const val = row[col] === null ? "NULL" : String(row[col]);
            const display =
              val.length > widths[i]
                ? val.substring(0, widths[i] - 3) + "..."
                : val;
            return ` ${display.padEnd(widths[i])} `;
          })
          .join("|") +
        "|";
      console.log(rowStr);
    });

    console.log(separator);
    console.log(`${data.length} row(s)`);
  }

  showHelp() {
    const helpText = `
SQL Commands:
  CREATE TABLE <name> (<col_def>, ...)
    col_def: <name> <type> [PRIMARY KEY] [UNIQUE]
    types: INT, TEXT, REAL, BOOLEAN
  
  INSERT INTO <table> VALUES (<values>)
  
  SELECT <columns|*> FROM <table> [WHERE <condition>]
  
  UPDATE <table> SET <col>=<val>, ... [WHERE <condition>]
  
  DELETE FROM <table> [WHERE <condition>]
  
  DROP TABLE <table>
  
  SHOW TABLES
  
  DESCRIBE <table>

Meta Commands:
  .help     - Show this help
  .tables   - List all tables
  .history  - Show command history
  .clear    - Clear screen
  .exit     - Exit REPL
`;
    console.log(helpText);
  }

  showTables() {
    const result = this.db.execute("SHOW TABLES");
    if (result.data && result.data.length > 0) {
      console.log("\nTables:");
      result.data.forEach((row) => {
        console.log(`  - ${row.Table}`);
      });
      console.log(`\nTotal: ${result.data.length} table(s)`);
    } else {
      console.log("No tables in database");
    }
  }

  showHistory() {
    const history = this.db.history.slice(-10);
    if (history.length > 0) {
      console.log("\nRecent commands:");
      history.forEach((cmd, i) => {
        console.log(`  ${i + 1}: ${cmd}`);
      });
    }
  }

  saveDatabase(filename) {
    if (!filename) {
      console.log("Usage: .save <filename>");
      return;
    }
    const fs = require("fs");
    fs.writeFileSync(filename, JSON.stringify(this.db.toJSON(), null, 2));
    console.log(`Database saved to ${filename}`);
  }

  loadDatabase(filename) {
    if (!filename) {
      console.log("Usage: .load <filename>");
      return;
    }
    const fs = require("fs");
    if (!fs.existsSync(filename)) {
      console.log(`File not found: ${filename}`);
      return;
    }
    const data = JSON.parse(fs.readFileSync(filename, "utf8"));
    this.db.fromJSON(data);
    console.log(`Database loaded from ${filename}`);
  }

  start() {
    console.log("=".repeat(60));
    console.log("Simple RDBMS - Interactive REPL");
    console.log("=".repeat(60));
    console.log("Type SQL commands or .help for help, .exit to quit\n");

    this.db.execute(`
      CREATE TABLE users (
        id INT PRIMARY KEY,
        name TEXT,
        email TEXT UNIQUE,
        age INT
      )
    `);

    this.db.execute(
      "INSERT INTO users VALUES (1, 'Alice', 'alice@example.com', 25)"
    );
    this.db.execute(
      "INSERT INTO users VALUES (2, 'Bob', 'bob@example.com', 30)"
    );

    this.db.execute(`
      CREATE TABLE posts (
        id INT PRIMARY KEY,
        user_id INT,
        title TEXT,
        content TEXT
      )
    `);

    this.db.execute(
      "INSERT INTO posts VALUES (1, 1, 'Hello World', 'My first post')"
    );
    this.db.execute(
      "INSERT INTO posts VALUES (2, 1, 'SQL Tutorial', 'Learning about databases')"
    );

    console.log("Sample database initialized with users and posts tables\n");

    this.rl.prompt();
  }
}

if (require.main === module) {
  const repl = new REPL();
  repl.start();
}
