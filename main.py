import cgi
import urllib
import json
import flask

from datetime import time, date, datetime

# [START taskq-imp]
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
  def get_from_login(cls):
    user = users.get_current_user()
    if not user:
      return None
    return cls.get_or_insert(user.user_id(), nick=user.nickname(), email=user.email())

class Eater(ndb.Model):
  creator = ndb.KeyProperty(kind=Feeder)
  name = ndb.StringProperty(default='Your first pet')
  am = ndb.TimeProperty(default=time(7))
  pm = ndb.TimeProperty(default=time(19, 30))

  @classmethod
  def query_feeder(cls, feeder):
    return cls.query().filter(cls.creator == feeder.key).fetch(1000)

class Fed(ndb.Model):
  when = ndb.DateTimeProperty(auto_now_add=True)
  who = ndb.KeyProperty(kind=Feeder)
  @classmethod
  def query_eater(cls, eater):
    return cls.query(ancestor=eater.key).order(-Fed.when).fetch(1)

app = flask.Flask(__name__)
app.debug = True

@app.route('/get')
def get():
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
      d = {'key': e.key.urlsafe(), 'name': e.name, 'am': e.am, 'pm':e.pm}
      lastfed = Fed.query_eater(e)
      if len(lastfed) == 0:
        d['current'] = {'date' : datetime.fromordinal(1), 'feeder' : 'Never!'}
      else:
        feeder = lastfed[0].who.get()
        d['current'] = {'date' : lastfed[0].when, 'feeder' : feeder.nick}
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
    keys = []
    for e in eaters:
      am = time(*[int(s) for s in e['am'].split(':')])
      pm = time(*[int(s) for s in e['pm'].split(':')])
      if e['key'] == 'pending':
        newpet = Eater(creator=feeder.key, name=e['name'], am=am, pm=pm)
      else:
        key = ndb.Key(urlsafe=e['key'])
        newpet = key.get()
        newpet.name = e['name']
        newpet.am = am
        newpet.pm = pm
      entry = newpet.put()
      keys.append(entry.urlsafe())
    return json.dumps({'stamp': datetime.now(), 'keys' : keys}, default=json_serial)

@app.route('/feed', methods=['GET', 'POST'])
def feedpet():
    feeder = Feeder.get_from_login()
    if not feeder:
      return json.dumps({'error': 'Not logged in'})

    request = flask.request.get_json()
    if 'pet_key' not in request:
      return json.dumps({'error': 'Pet key required'})

    pet = ndb.Key(urlsafe=request['pet_key']).get()
    if not pet:
      return json.dumps({'error': 'Invalid pet key'})

    # TODO: extract time from query.
    feed = Fed(parent=pet.key, who=feeder.key)
    feed.put()
    response = {
      'stamp': datetime.now(),
      'message': 'Fed!',
      'feeder' : feeder.nick
    }
    return json.dumps(response, default=json_serial)
