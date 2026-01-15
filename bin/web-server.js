#!/usr/bin/env node

const express = require('express');
const SimpleRDBMS = require('../src/db');

class WebServer {
  constructor(port = 3000) {
    this.app = express();
    this.db = new SimpleRDBMS();
    this.port = port;
    
    this.setupMiddleware();
    this.setupRoutes();
    this.initializeSampleData();
  }

  setupMiddleware() {
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
      next();
    });
  }

  setupRoutes() {
    this.app.get('/', (req, res) => {
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Simple RDBMS Web API</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 40px; }
                .container { max-width: 800px; margin: 0 auto; }
                .header { background: #4a6fa5; color: white; padding: 20px; border-radius: 5px; }
                .endpoint { background: #f5f5f5; padding: 15px; margin: 10px 0; border-radius: 3px; }
                code { background: #eee; padding: 2px 5px; border-radius: 3px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Simple RDBMS Web API</h1>
                    <p>A lightweight relational database management system</p>
                </div>
                
                <h2>API Endpoints</h2>
                
                <div class="endpoint">
                    <h3>GET /tables</h3>
                    <p>List all tables in the database</p>
                    <code>curl http://localhost:${this.port}/tables</code>
                </div>
                
                <div class="endpoint">
                    <h3>GET /tables/:name</h3>
                    <p>Describe a specific table</p>
                    <code>curl http://localhost:${this.port}/tables/users</code>
                </div>
                
                <div class="endpoint">
                    <h3>POST /sql</h3>
                    <p>Execute SQL query</p>
                    <code>curl -X POST http://localhost:${this.port}/sql -H "Content-Type: application/json" -d '{"query": "SELECT * FROM users"}'</code>
                </div>
                
                <div class="endpoint">
                    <h3>GET /users</h3>
                    <p>Get all users</p>
                    <code>curl http://localhost:${this.port}/users</code>
                </div>
                
                <div class="endpoint">
                    <h3>POST /users</h3>
                    <p>Create a new user</p>
                    <code>curl -X POST http://localhost:${this.port}/users -H "Content-Type: application/json" -d '{"id": 3, "name": "Charlie", "email": "charlie@example.com", "age": 35}'</code>
                </div>
                
                <h2>Interactive Console</h2>
                <p>Try the <a href="/console">SQL Console</a> for interactive queries.</p>
            </div>
        </body>
        </html>
      `);
    });

    this.app.get('/tables', (req, res) => {
      const result = this.db.execute('SHOW TABLES');
      res.json(result);
    });

    this.app.get('/tables/:name', (req, res) => {
      const result = this.db.execute(`DESCRIBE ${req.params.name}`);
      res.json(result);
    });

    this.app.post('/sql', (req, res) => {
      const { query } = req.body;
      if (!query) {
        return res.status(400).json({ error: 'Query parameter required' });
      }
      
      const result = this.db.execute(query);
      res.json(result);
    });

    this.app.get('/users', (req, res) => {
      const result = this.db.execute('SELECT * FROM users');
      res.json(result);
    });

    this.app.post('/users', (req, res) => {
      const { id, name, email, age } = req.body;
      if (!id || !name || !email) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      
      const sql = `INSERT INTO users VALUES (${id}, '${name}', '${email}', ${age || 'NULL'})`;
      const result = this.db.execute(sql);
      res.json(result);
    });

    this.app.put('/users/:id', (req, res) => {
      const { name, email, age } = req.body;
      const updates = [];
      
      if (name) updates.push(`name = '${name}'`);
      if (email) updates.push(`email = '${email}'`);
      if (age !== undefined) updates.push(`age = ${age}`);
      
      if (updates.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }
      
      const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = ${req.params.id}`;
      const result = this.db.execute(sql);
      res.json(result);
    });

    this.app.delete('/users/:id', (req, res) => {
      const sql = `DELETE FROM users WHERE id = ${req.params.id}`;
      const result = this.db.execute(sql);
      res.json(result);
    });

    this.app.get('/console', (req, res) => {
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>SQL Console</title>
            <style>
                body { font-family: 'Monaco', 'Menlo', monospace; margin: 40px; }
                .container { max-width: 1200px; margin: 0 auto; }
                .editor-area { display: flex; gap: 20px; }
                .editor, .output { flex: 1; }
                textarea {
                    width: 100%;
                    height: 300px;
                    font-family: 'Monaco', 'Menlo', monospace;
                    font-size: 14px;
                    padding: 10px;
                    border: 1px solid #ddd;
                    border-radius: 3px;
                    resize: vertical;
                }
                button {
                    background: #4a6fa5;
                    color: white;
                    padding: 10px 20px;
                    border: none;
                    border-radius: 3px;
                    cursor: pointer;
                    margin: 10px 0;
                }
                button:hover { background: #3a5a85; }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 10px 0;
                }
                th, td {
                    border: 1px solid #ddd;
                    padding: 8px;
                    text-align: left;
                }
                th {
                    background-color: #f2f2f2;
                }
                .error {
                    color: red;
                    background: #ffe6e6;
                    padding: 10px;
                    border-radius: 3px;
                    margin: 10px 0;
                }
                .success {
                    color: green;
                    background: #e6ffe6;
                    padding: 10px;
                    border-radius: 3px;
                    margin: 10px 0;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>SQL Console</h1>
                
                <div class="editor-area">
                    <div class="editor">
                        <h3>SQL Editor</h3>
                        <textarea id="sql-editor" placeholder="Enter SQL query...">
SELECT * FROM users;
SELECT * FROM posts;
SHOW TABLES;</textarea>
                        
                        <button onclick="executeSQL()">Execute</button>
                        <button onclick="clearEditor()">Clear</button>
                        
                        <h4>Examples:</h4>
                        <button onclick="loadExample('SELECT * FROM users;')">Show Users</button>
                        <button onclick="loadExample('SELECT * FROM posts;')">Show Posts</button>
                        <button onclick="loadExample('SHOW TABLES;')">Show Tables</button>
                        <button onclick="loadExample('DESCRIBE users;')">Describe Users</button>
                    </div>
                    
                    <div class="output">
                        <h3>Results</h3>
                        <div id="output"></div>
                    </div>
                </div>
            </div>
            
            <script>
                function loadExample(sql) {
                    document.getElementById('sql-editor').value = sql;
                }
                
                function clearEditor() {
                    document.getElementById('sql-editor').value = '';
                    document.getElementById('output').innerHTML = '';
                }
                
                function executeSQL() {
                    const sql = document.getElementById('sql-editor').value.trim();
                    if (!sql) return;
                    
                    fetch('/sql', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ query: sql })
                    })
                    .then(response => response.json())
                    .then(data => {
                        displayResult(data);
                    })
                    .catch(error => {
                        document.getElementById('output').innerHTML = 
                            '<div class="error">Error: ' + error.message + '</div>';
                    });
                }
                
                function displayResult(data) {
                    const output = document.getElementById('output');
                    
                    if (data.error) {
                        output.innerHTML = '<div class="error"><strong>Error:</strong> ' + data.error + '</div>';
                        return;
                    }
                    
                    let html = '<div class="success">' + (data.message || 'Query executed successfully') + '</div>';
                    
                    if (data.data && data.data.length > 0) {
                        html += '<table>';
                        
                        // Create header
                        html += '<thead><tr>';
                        if (data.data[0]) {
                            Object.keys(data.data[0]).forEach(key => {
                                html += '<th>' + key + '</th>';
                            });
                        }
                        html += '</tr></thead>';
                        
                        // Create rows
                        html += '<tbody>';
                        data.data.forEach(row => {
                            html += '<tr>';
                            Object.values(row).forEach(cell => {
                                html += '<td>' + (cell === null ? 'NULL' : cell) + '</td>';
                            });
                            html += '</tr>';
                        });
                        html += '</tbody></table>';
                        
                        html += '<p>' + data.data.length + ' row(s) returned</p>';
                    } else {
                        html += '<p>(No rows returned)</p>';
                    }
                    
                    output.innerHTML = html;
                }
            </script>
        </body>
        </html>
      `);
    });
  }

  initializeSampleData() {
    const tables = this.db.execute('SHOW TABLES');
    if (!tables.data || tables.data.length === 0) {
      this.db.execute(`
        CREATE TABLE users (
          id INT PRIMARY KEY,
          name TEXT,
          email TEXT UNIQUE,
          age INT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      this.db.execute("INSERT INTO users VALUES (1, 'Alice Smith', 'alice@example.com', 25, '2024-01-15')");
      this.db.execute("INSERT INTO users VALUES (2, 'Bob Johnson', 'bob@example.com', 30, '2024-01-20')");
      this.db.execute("INSERT INTO users VALUES (3, 'Charlie Brown', 'charlie@example.com', 22, '2024-02-01')");
      
      this.db.execute(`
        CREATE TABLE posts (
          id INT PRIMARY KEY,
          user_id INT,
          title TEXT,
          content TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      this.db.execute("INSERT INTO posts VALUES (1, 1, 'Hello World', 'Welcome to my blog!', '2024-01-16')");
      this.db.execute("INSERT INTO posts VALUES (2, 1, 'Database Systems', 'Learning about RDBMS', '2024-01-18')");
      this.db.execute("INSERT INTO posts VALUES (3, 2, 'Web Development', 'Building modern web apps', '2024-01-25')");
      
      console.log('Sample database initialized');
    }
  }

  start() {
    this.app.listen(this.port, () => {
      console.log(`Simple RDBMS Web Server running on http://localhost:${this.port}`);
      console.log(`Interactive console: http://localhost:${this.port}/console`);
    });
  }
}

if (require.main === module) {
  const port = process.argv[2] || 3000;
  const server = new WebServer(parseInt(port));
  server.start();
}