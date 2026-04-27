import sqlite3
import hashlib
import os

DB_FILE = 'users.db'

def get_db():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL
        )
    ''')
    conn.commit()
    conn.close()

    # Create admin user if not exists
    create_user('TUf_Jerry', 'Jerry@215')

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def create_user(username: str, password: str) -> bool:
    """Create a new user. Returns True if successful, False if username exists."""
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute(
            'INSERT INTO users (username, password_hash) VALUES (?, ?)',
            (username, hash_password(password))
        )
        conn.commit()
        return True
    except sqlite3.IntegrityError:
        return False
    finally:
        conn.close()

def verify_user(username: str, password: str) -> bool:
    """Verify a user's password."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT password_hash FROM users WHERE username = ?', (username,))
    row = cursor.fetchone()
    conn.close()
    
    if row and row['password_hash'] == hash_password(password):
        return True
    return False

def get_total_users() -> int:
    """Return the total number of registered users."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT COUNT(*) as count FROM users')
    row = cursor.fetchone()
    conn.close()
    
    if row:
        return row['count']
    return 0

def get_all_users():
    """Return a list of all registered usernames."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT id, username FROM users')
    rows = cursor.fetchall()
    conn.close()
    
    return [{"id": r['id'], "username": r['username']} for r in rows]

# Initialize the database on module import
init_db()
