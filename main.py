import cgi
import random
import urllib
import json
import flask

from datetime import time, date, datetime

# [START taskq-imp]
from google.appengine.api import taskqueue
from google.appengine.ext import ndb
from google.appengine.api import users
# [END taskq-imp]

def json_serial(obj):
    """JSON serializer for objects not serializable by default json code"""
    if isinstance(obj, (datetime, date, time)):
        serial = obj.isoformat()
        return serial
    raise TypeError ("Type %s not serializable" % type(obj))

class Feeder(ndb.Model):
  user_id = ndb.StringProperty()
  nick = ndb.StringProperty()
  email = ndb.StringProperty()
  tz = ndb.StringProperty(default='Australia/Sydney')

  @classmethod
  def get_by_user(cls, user):
    return cls.query().filter(cls.user_id == user.user_id()).get()

class Eater(ndb.Model):
  name = ndb.StringProperty(default='Your first pet')
  am = ndb.TimeProperty(default=time(7))
  pm = ndb.TimeProperty(default=time(19, 30))

  @classmethod
  def query_feeder(cls, feeder):
    return cls.query(ancestor=feeder.key).fetch(1000)

class Fed(ndb.Model):
  when = ndb.DateTimeProperty(auto_now_add=True)
  who = ndb.StringProperty()
  @classmethod
  def query_eater(cls, eater):
    return cls.query(ancestor=eater.key).order(-Fed.when).fetch(1)

app = flask.Flask(__name__)
app.debug = True

@app.route('/get')
def get():
    page_name = flask.request.args.get('page_name', 'default')
    user = users.get_current_user()
    if not user:
      return json.dumps({'url': users.create_login_url('/')})

    data = { 'nick' : user.nickname() , 'url' : users.create_logout_url('/')}
    data['feeder'] = {
      'nick' : user.nickname(),
      'email': user.email(),
    }
    feeder = Feeder.get_or_insert(user.user_id(), **data['feeder'])
    eaters = Eater.query_feeder(feeder)
    data['eaters'] = []
    if len(eaters) == 0:
      e = Eater(parent=feeder.key)
      eater_key = e.put()
      eaters.append(Eater())
      eaters = Eater.query_feeder(feeder)
    for e in eaters:
      print e
      d = {'key': e.key.urlsafe(), 'name': e.name, 'am': e.am, 'pm':e.pm}
      lastfed = Fed.query_eater(e)
      if len(lastfed) == 0:
        d['current'] = {'date' : datetime.fromordinal(1), 'feeder' : 'Never!'}
      else:
        d['current'] = {'date' : lastfed[0].when, 'feeder' : lastfed[0].who}
      data['eaters'].append(d)

    data['stamp'] = datetime.now()
    return json.dumps(data, default=json_serial)

@app.route('/savepets', methods=['GET', 'POST'])
def savepets():
    user = users.get_current_user()
    if not user:
      return json.dumps({'error': 'Not logged in'})
    eaters = flask.request.get_json()
    feeder = Feeder.get_or_insert(user.user_id())
    for e in eaters:
      print e
      am = time(*[int(s) for s in e['am'].split(':')])
      pm = time(*[int(s) for s in e['pm'].split(':')])
      if e['key'] == 'pending':
        newpet = Eater(parent=feeder.key, name=e['name'], am=am, pm=pm)
      else:
        key = ndb.Key(urlsafe=e['key'])
        newpet = key.get()
        newpet.name = e['name']
        newpet.am = am
        newpet.pm = pm
      newpet.put()
    return json.dumps({'stamp': datetime.now()}, default=json_serial)

