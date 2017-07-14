import cgi
import random
import urllib
import json

import flask

# [START taskq-imp]
from google.appengine.api import taskqueue
from google.appengine.ext import ndb
from google.appengine.api import users
# [END taskq-imp]


INDEX = """
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <link rel="canonical" href="https://tapted.appspot.com/catfeed/">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Catfeed PWA</title>
  <link rel="stylesheet" type="text/css" href="styles/inline.css">

  <!-- TODO add manifest here -->
  <link rel="manifest" href="/manifest.json">
  <!-- Add to home screen for Safari on iOS -->
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black">
  <meta name="apple-mobile-web-app-title" content="Catfeed PWA">
  <link rel="apple-touch-icon" href="images/icons/icon-152x152.png">
  <meta name="msapplication-TileImage" content="images/icons/icon-144x144.png">
  <meta name="msapplication-TileColor" content="#2F3BA2">
</head>
<body>
  <header class="header">
    <h1 class="header__title">Catfeed PWA</h1>
    <button id="butRefresh" class="headerButton" aria-label="Refresh"></button>
    <button id="butAdd" class="headerButton" aria-label="Add"></button>
  </header>
  <main class="main">
    <div class="user">
      <p>You are... <span class="nick"></span>
        <form class="url">
          <input type="submit" value="Login" class="login" />
          <input type="submit" value="Logout" class="logout" />
        </form>
      </p>
    </div>

    <div class="card cardTemplate pet-data" hidden>
      <div class="pet-key" hidden></div>
      <div class="card-last-updated" hidden></div>
      <div class="petname"></div>
      <div class="date"></div>
      <div class="description"></div>
      <div class="current">
        <div class="visual">
          <div class="icon">Pet Photo</div>
          <div class="feed">Feed!</div>
        </div>
        <div class="description">
          <p>Last fed...</p>
        </div>
      </div>
  </main>

  <div class="dialog-container">
    <div class="dialog">
      <div class="dialog-title">Add new pet</div>
      <div class="dialog-body">
        <label for="petName">Name: </label><input id="petName" />
      </div>
      <div class="dialog-buttons">
        <button id="butAddPet" class="button">Add</button>
        <button id="butAddCancel" class="button">Cancel</button>
      </div>
    </div>
  </div>

  <div class="loader">
    <svg viewBox="0 0 32 32" width="32" height="32">
      <circle id="spinner" cx="16" cy="16" r="14" fill="none"></circle>
    </svg>
  </div>
  <script src="scripts/app.js" async></script>
</body>
"""

class Note(ndb.Model):
    """Models an individual Note entry with content."""
    content = ndb.StringProperty()


def parent_key(page_name):
    return ndb.Key("Parent", page_name)


app = flask.Flask(__name__)


@app.route('/')
def main_page():
    return INDEX

@app.route('/user/')
def user():
    page_name = flask.request.args.get('page_name', 'default')
    user = users.get_current_user()
    if user:
        return json.dumps({ 'nick' : user.nickname() , 'url' : users.create_logout_url('/')})
    return json.dumps({'url': users.create_login_url('/')})

    #     login_url =
    #     greeting = '<a href="{}">Sign in</a>'.format(login_url)

    # response = """{}
    #       <h2>{}</h2>
    #       <p>{}</p>
    # """.format(HEADER, greeting, cgi.escape(page_name))

    # parent = parent_key(page_name)
    # notes = Note.query(ancestor=parent).fetch(20)
    # for note in notes:
    #     response += '<h3>%s</h3>' % cgi.escape(note.key.id())
    #     response += '<blockquote>%s</blockquote>' % cgi.escape(note.content)

    # response += (
    #     """<hr>
    #        <form action="/add?%s" method="post">
    #        Submit Note: <input value="Title" name="note_title"><br>
    #        <textarea value="Note" name="note_text" rows="4" cols="60">
    #        </textarea>
    #        <input type="submit" value="Etch in stone"></form>"""
    #     % urllib.urlencode({'page_name': page_name}))
    # response += """
    #         <hr>
    #         <form>Switch page: <input value="%s" name="page_name">
    #         <input type="submit" value="Switch"></form>
    #         </body>
    #     </html>""" % cgi.escape(page_name, quote=True)

    # return response


# [START standard]
@ndb.transactional
def insert_if_absent(note_key, note):
    fetch = note_key.get()
    if fetch is None:
        note.put()
        return True
    return False
# [END standard]


# [START two-tries]
@ndb.transactional(retries=1)
def insert_if_absent_2_retries(note_key, note):
    # do insert
    # [END two-tries]
    fetch = note_key.get()
    if fetch is None:
        note.put()
        return True
    return False


# [START cross-group]
@ndb.transactional(xg=True)
def insert_if_absent_xg(note_key, note):
    # do insert
    # [END cross-group]
    fetch = note_key.get()
    if fetch is None:
        note.put()
        return True
    return False


# [START sometimes]
def insert_if_absent_sometimes(note_key, note):
    # do insert
    # [END sometimes]
    fetch = note_key.get()
    if fetch is None:
        note.put()
        return True
    return False


# [START indep]
@ndb.transactional(propagation=ndb.TransactionOptions.INDEPENDENT)
def insert_if_absent_indep(note_key, note):
    # do insert
    # [END indep]
    fetch = note_key.get()
    if fetch is None:
        note.put()
        return True
    return False


# [START taskq]
@ndb.transactional
def insert_if_absent_taskq(note_key, note):
    taskqueue.add(url=flask.url_for('taskq_worker'), transactional=True)
    # do insert
    # [END taskq]
    fetch = note_key.get()
    if fetch is None:
        note.put()
        return True
    return False


@app.route('/worker')
def taskq_worker():
    pass


def pick_random_insert(note_key, note):
    choice = random.randint(0, 5)
    if choice == 0:
        # [START calling2]
        inserted = insert_if_absent(note_key, note)
        # [END calling2]
    elif choice == 1:
        inserted = insert_if_absent_2_retries(note_key, note)
    elif choice == 2:
        inserted = insert_if_absent_xg(note_key, note)
    elif choice == 3:
        # [START sometimes-call]
        inserted = ndb.transaction(lambda:
                                   insert_if_absent_sometimes(note_key, note))
        # [END sometimes-call]
    elif choice == 4:
        inserted = insert_if_absent_indep(note_key, note)
    elif choice == 5:
        inserted = insert_if_absent_taskq(note_key, note)
    return inserted


@app.route('/add', methods=['POST'])
def add_note():
    page_name = flask.request.args.get('page_name', 'default')
    note_title = flask.request.form['note_title']
    note_text = flask.request.form['note_text']

    parent = parent_key(page_name)

    choice = random.randint(0, 1)
    if choice == 0:
        # Use transactional function
        # [START calling]
        note_key = ndb.Key(Note, note_title, parent=parent)
        note = Note(key=note_key, content=note_text)
        # [END calling]
        if pick_random_insert(note_key, note) is False:
            return ('Already there<br><a href="%s">Return</a>'
                    % flask.url_for('main_page', page_name=page_name))
        return flask.redirect(flask.url_for('main_page', page_name=page_name))
    elif choice == 1:
        # Use get_or_insert, which is transactional
        note = Note.get_or_insert(note_title, parent=parent, content=note_text)
        if note.content != note_text:
            return ('Already there<br><a href="%s">Return</a>'
                    % flask.url_for('main_page', page_name=page_name))
        return flask.redirect(flask.url_for('main_page', page_name=page_name))
