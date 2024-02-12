import string
import random
import sqlite3
from datetime import datetime
from flask import *
from functools import wraps

app = Flask(__name__)
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0

def get_db():
    db = getattr(g, '_database', None)

    if db is None:
        db = g._database = sqlite3.connect('db/watchparty.sqlite3')
        db.row_factory = sqlite3.Row
        setattr(g, '_database', db)
    return db


@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()


def query_db(query, args=(), one=False):
    db = get_db()
    cursor = db.execute(query, args)
    rows = cursor.fetchall()
    db.commit()
    cursor.close()
    if rows:
        if one: 
            return rows[0]
        return rows
    return None


def new_user():
    name = "Unnamed User #" + ''.join(random.choices(string.digits, k=6))
    password = ''.join(random.choices(string.ascii_lowercase + string.digits, k=10))
    api_key = ''.join(random.choices(string.ascii_lowercase + string.digits, k=40))
    u = query_db('insert into users (name, password, api_key) ' + 
        'values (?, ?, ?) returning id, name, password, api_key',
        (name, password, api_key),
        one=True)
    return u



def get_user_from_api_key(api_key):
    if api_key:
        return query_db('select * from users where api_key = ?', [api_key], one=True)
    return None


def get_api_key_from_user(username, password):
    if username and password:
        return query_db('select * from users where name = ? and password = ?', [username, password], one=True)
    return None


def api_key_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        api_key = request.headers.get('API-Key')
        user = get_user_from_api_key(api_key)
        print('checked api')
        if user is None:
            return jsonify({'error': 'Invalid API key'}), 401
        g.user = user
        return f(*args, **kwargs)
    return decorated_function


# TODO: If your app sends users to any other routes, include them here.
#       (This should not be necessary).
@app.route('/')
@app.route('/profile')
@app.route('/login')
@app.route('/room')
@app.route('/rooms/<chat_id>')
def index(chat_id=None):
    return app.send_static_file('index.html')


@app.errorhandler(404)
def page_not_found(e):
    return app.send_static_file('404.html'), 404




# -------------------------------- API ROUTES ----------------------------------

# TODO: Create the API

@app.route('/api/signup', methods=['POST'])
def signup():
    user = new_user()
    print(f"User created: Username={user['name']}, Password={user['password']}, API Key={user['api_key']}")
    return jsonify({
        'username': user['name'],  
        'password': user['password'],  
        'api_key': user['api_key']
    })


@app.route('/api/checkcredentials', methods=['POST'])
def check_credentials_for_login():
    api_key = request.headers.get('API-Key')
    user = get_user_from_api_key(api_key)
    if user is None:
        # No user found with the provided API key
        return jsonify({'error': 'Invalid API key'}), 401  

    # User found, proceed as normal
    print(f"User gotten: Username={user['name']}, Password={user['password']}, API Key={user['api_key']}, ID = {user['id']}")
    return jsonify({
        'username': user['name'],
        'password': user['password'], 
        'user_id': user['id']
    })


@app.route('/api/getapikey', methods=['GET'])
def get_api_key():
    username = request.headers.get('Username')
    password = request.headers.get('Password')

    user = get_api_key_from_user(username, password)
    if user is None:
        return jsonify({'error': 'User not found'}), 401
    
    print(f"API key found: Username={user['name']}, Password={user['password']}, API Key={user['api_key']}")
    return jsonify({
        'api_key': user['api_key']
    })


@app.route('/api/rooms/new', methods=['GET', 'POST'])
@api_key_required
def create_room():
    print("create room")
    if (request.method == 'POST'): 
        name = "Unnamed Room " + ''.join(random.choices(string.digits, k=6))
        room = query_db('insert into rooms (name) values (?) returning id', [name], one=True)
        return jsonify({
            'room_id': room['id']
        })
    else:
        print("get rooms")
        rooms = query_db('select * from rooms')
        return jsonify([dict(room) for room in rooms])


@app.route('/api/user/username', methods=['POST'])
@api_key_required
def change_username():
    print("change username")
    data = request.get_json()
    user_id = g.user['id']
    if not data:
        return jsonify({'error': 'Missing new_username'}), 400
    else:
        new_username = data['new_username']
        query_db('update users set name = ? where id = ?', [new_username, user_id])

    return jsonify({'message': 'Username updated successfully'})


@app.route('/api/user/password', methods=['POST'])
@api_key_required
def change_password():
    print("change password")
    data = request.get_json()
    user_id = g.user['id']
    if not data:
        return jsonify({'error': 'Missing password'}), 400
    else:
        password = data['new_password']
        query_db('update users set password = ? where id = ?', [password, user_id])

    return jsonify({'message': 'Password updated successfully'})



@app.route('/api/rooms/<roomid>', methods=['GET', 'POST'])
@api_key_required
def get_room_information(roomid):  
    print("get room information")
    if request.method == 'GET':
        room_info = query_db('SELECT * FROM rooms WHERE id = ?', [roomid], one=True)
        if room_info is None:
            return jsonify({'error': 'Room not found'}), 404
        return jsonify({
            'room_id': room_info['id'],
            'room_name': room_info['name']
        })
    
    elif request.method == 'POST':
        new_name = request.json.get('name')
        query_db('UPDATE rooms SET name = ? WHERE id = ?', [new_name, roomid])
        return jsonify({
            'room_name': new_name
        })


@app.route('/api/rooms/<roomid>/messages', methods=['GET', 'POST'])
@api_key_required
def get_and_post_messages(roomid):  
    print("get and post messages")
    if request.method == 'GET':
        print(roomid)
        messages = query_db('SELECT u.name, m.body, m.id FROM messages m LEFT JOIN users u ON m.user_id = u.id WHERE room_id = ?',[roomid])
        for msg in messages:
            print(f"Message ID: {msg['id']}, User Name: {msg['name']}, Message: {msg['body']}")
        return jsonify([dict(msg) for msg in messages])
    elif request.method == 'POST':
        user_id = g.user['id']
        message_body = request.json.get('message')
        query_db('INSERT INTO messages (room_id, user_id, body) VALUES (?, ?, ?)', [roomid, user_id, message_body])
        messages = query_db('SELECT * FROM messages', [])
        for msg in messages:
            print(f"Message ID: {msg['id']}, Room ID: {msg['room_id']}, User ID: {msg['user_id']}, Message: {msg['body']}")
        return jsonify({'message': 'Message posted successfully'}), 201


# @app.route('/api/login')
# def login():
#   ... 

# ... etc
