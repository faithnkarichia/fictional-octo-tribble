class SimpleRDBMS {
  constructor() {
    this.tables = {};
    this.history = [];
  }

  execute(sql) {
    this.history.push(sql);
    sql = sql.trim();

    if (sql.endsWith(";")) sql = sql.slice(0, -1);

    const parts = sql.split(" ").filter((p) => p);
    const command = parts[0].toUpperCase();

    try {
      switch (command) {
        case "CREATE":
          return this._createTable(sql);
        case "INSERT":
          return this._insert(sql);
        case "SELECT":
          return this._select(sql);
        case "UPDATE":
          return this._update(sql);
        case "DELETE":
          return this._delete(sql);
        case "DROP":
          return this._dropTable(sql);
        case "SHOW":
          return this._showTables();
        case "DESCRIBE":
          return this._describe(sql);
        default:
          return { error: `Unknown command: ${command}` };
      }
    } catch (error) {
      return { error: error.message };
    }
  }

  _createTable(sql) {
    const match = sql.match(/CREATE TABLE (\w+) \((.+)\)/i);
    if (!match) throw new Error("Invalid CREATE TABLE syntax");

    const tableName = match[1];
    const columnsDef = match[2];

    if (this.tables[tableName]) {
      throw new Error(`Table ${tableName} already exists`);
    }

    const columns = {};
    const constraints = {};

    columnsDef.split(",").forEach((colDef) => {
      const parts = colDef.trim().split(/\s+/);
      const colName = parts[0];
      const colType = parts[1].toUpperCase();
      columns[colName] = colType;

      if (parts.includes("PRIMARY")) {
        constraints.primaryKey = colName;
      }
      if (parts.includes("UNIQUE")) {
        constraints[colName] = { unique: true };
      }
    });

    this.tables[tableName] = {
      columns,
      constraints,
      rows: [],
      indexes: {},
    };

    return { message: `Table ${tableName} created` };
  }

  _insert(sql) {
    const match = sql.match(/INSERT INTO (\w+) VALUES \((.+)\)/i);
    if (!match) throw new Error("Invalid INSERT syntax");

    const tableName = match[1];
    const valuesStr = match[2];

    const table = this.tables[tableName];
    if (!table) throw new Error(`Table ${tableName} doesn't exist`);

    const values = this._parseValues(valuesStr);
    const columnNames = Object.keys(table.columns);

    if (values.length !== columnNames.length) {
      throw new Error(
        `Expected ${columnNames.length} values, got ${values.length}`
      );
    }

    if (table.constraints.primaryKey) {
      const pkCol = table.constraints.primaryKey;
      const pkIndex = columnNames.indexOf(pkCol);
      const pkValue = values[pkIndex];

      const existing = table.rows.find((row) => row[pkCol] === pkValue);
      if (existing) throw new Error(`Duplicate primary key: ${pkValue}`);
    }

    const row = {};
    columnNames.forEach((col, i) => {
      row[col] = values[i];
    });

    table.rows.push(row);
    return { message: "1 row inserted" };
  }

  _select(sql) {
    const selectMatch = sql.match(/SELECT (.+) FROM (\w+)(?: WHERE (.+))?/i);
    if (!selectMatch) throw new Error("Invalid SELECT syntax");

    const columns = selectMatch[1];
    const tableName = selectMatch[2];
    const whereClause = selectMatch[3];

    const table = this.tables[tableName];
    if (!table) throw new Error(`Table ${tableName} doesn't exist`);

    let rows = table.rows;

    if (whereClause) {
      rows = rows.filter((row) => this._evaluateWhere(row, whereClause));
    }

    const columnNames =
      columns === "*"
        ? Object.keys(table.columns)
        : columns.split(",").map((c) => c.trim());

    const result = rows.map((row) => {
      const selected = {};
      columnNames.forEach((col) => {
        if (col in row) selected[col] = row[col];
      });
      return selected;
    });

    return {
      data: result,
      count: result.length,
      columns: columnNames,
    };
  }

  _showTables() {
    const tables = Object.keys(this.tables);
    return {
      data: tables.map((name) => ({ Table: name })),
      count: tables.length,
    };
  }

  _describe(sql) {
    const match = sql.match(/DESCRIBE (\w+)/i);
    if (!match) throw new Error("Invalid DESCRIBE syntax");

    const tableName = match[1];
    const table = this.tables[tableName];
    if (!table) throw new Error(`Table ${tableName} doesn't exist`);

    const columns = Object.entries(table.columns).map(([name, type]) => ({
      Field: name,
      Type: type,
      Key: name === table.constraints.primaryKey ? "PRI" : "",
    }));

    return { data: columns, count: columns.length };
  }

  _parseValues(valuesStr) {
    const values = [];
    let current = "";
    let inQuotes = false;
    let quoteChar = "";

    for (let char of valuesStr) {
      if ((char === "'" || char === '"') && !inQuotes) {
        inQuotes = true;
        quoteChar = char;
        current += char;
      } else if (char === quoteChar && inQuotes) {
        inQuotes = false;
        current += char;
        values.push(current);
        current = "";
      } else if (char === "," && !inQuotes) {
        if (current.trim()) {
          values.push(this._parseValue(current.trim()));
        }
        current = "";
      } else {
        current += char;
      }
    }

    if (current.trim()) {
      values.push(this._parseValue(current.trim()));
    }

    return values;
  }

  _parseValue(str) {
    if (str.startsWith("'") && str.endsWith("'")) {
      return str.slice(1, -1);
    }
    if (str.startsWith('"') && str.endsWith('"')) {
      return str.slice(1, -1);
    }
    if (str.toLowerCase() === "null") {
      return null;
    }
    if (str.toLowerCase() === "true") {
      return true;
    }
    if (str.toLowerCase() === "false") {
      return false;
    }
    if (!isNaN(Number(str))) {
      return Number(str);
    }
    return str;
  }

  _update(sql) {
    const match = sql.match(/UPDATE (\w+) SET (.+)(?: WHERE (.+))?/i);
    if (!match) throw new Error("Invalid UPDATE syntax");

    const tableName = match[1];
    const setClause = match[2];
    const whereClause = match[3];

    const table = this.tables[tableName];
    if (!table) throw new Error(`Table ${tableName} doesn't exist`);

    const updates = {};
    setClause.split(",").forEach((pair) => {
      const [col, val] = pair.split("=").map((s) => s.trim());
      updates[col] = this._parseValue(val);
    });

    let affected = 0;
    table.rows.forEach((row) => {
      if (!whereClause || this._evaluateWhere(row, whereClause)) {
        Object.assign(row, updates);
        affected++;
      }
    });

    return { message: `${affected} row(s) updated` };
  }

  _delete(sql) {
    const match = sql.match(/DELETE FROM (\w+)(?: WHERE (.+))?/i);
    if (!match) throw new Error("Invalid DELETE syntax");

    const tableName = match[1];
    const whereClause = match[2];

    const table = this.tables[tableName];
    if (!table) throw new Error(`Table ${tableName} doesn't exist`);

    const initialCount = table.rows.length;

    if (whereClause) {
      table.rows = table.rows.filter(
        (row) => !this._evaluateWhere(row, whereClause)
      );
    } else {
      table.rows = [];
    }

    const deleted = initialCount - table.rows.length;
    return { message: `${deleted} row(s) deleted` };
  }

  _dropTable(sql) {
    const match = sql.match(/DROP TABLE (\w+)/i);
    if (!match) throw new Error("Invalid DROP TABLE syntax");

    const tableName = match[1];

    if (!this.tables[tableName]) {
      throw new Error(`Table ${tableName} doesn't exist`);
    }

    delete this.tables[tableName];
    return { message: `Table ${tableName} dropped` };
  }

  _evaluateWhere(row, condition) {
    const operators = [">=", "<=", "!=", "<>", "=", "<", ">"];

    for (const op of operators) {
      if (condition.includes(op)) {
        const [left, right] = condition.split(op).map((s) => s.trim());
        const leftVal = row[left];
        const rightVal = this._parseValue(right);

        switch (op) {
          case "=":
            return leftVal == rightVal;
          case "!=":
          case "<>":
            return leftVal != rightVal;
          case "<":
            return leftVal < rightVal;
          case ">":
            return leftVal > rightVal;
          case "<=":
            return leftVal <= rightVal;
          case ">=":
            return leftVal >= rightVal;
        }
      }
    }

    return false;
  }

  toJSON() {
    return this.tables;
  }

  fromJSON(data) {
    this.tables = data;
  }
}

module.exports = SimpleRDBMS;
