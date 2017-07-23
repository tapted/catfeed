(function() {
  'use strict';

  var app = {
    isLoading: true,
    visibleCards: {},
    selectedPets: [],
    spinner: document.querySelector('.loader'),
    cardTemplate: document.querySelector('.cardTemplate'),
    container: document.querySelector('.main'),
    addDialog: document.querySelector('.dialog-container'),
    daysOfWeek: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  };


  /*****************************************************************************
   *
   * Event listeners for UI elements
   *
   ****************************************************************************/

  document.getElementById('butReload').addEventListener('click', function() {
    location.reload();
  });

  document.getElementById('butRefresh').addEventListener('click', function() {
    app.fetchData();
  });

  document.getElementById('butAdd').addEventListener('click', function() {
    // Open/show the add new pet dialog
    app.toggleAddDialog(true);
  });

  document.getElementById('butSave').addEventListener('click', function() {
    app.savePets(true);
  });

  document.getElementById('butAddPet').addEventListener('click', function() {
    var pet = {
      key: 'pending',
      name: document.getElementById('petName').value,
      created: Date(),
      am: '07:00:00',
      pm: '19:30:00',
      current: {
        date: '0001-01-01T00:00:00',
        feeder: 'First!',
      },
    };
    app.updatePetCard(pet);
    app.toggleAddDialog(false);
    console.log(app.selectedPets);
    app.selectedPets.push(pet);
    app.savePets(true);
  });

  document.getElementById('butAddCancel').addEventListener('click', function() {
    // Close the add new city dialog
    app.toggleAddDialog(false);
  });


  /*****************************************************************************
   *
   * Methods to update/refresh the UI
   *
   ****************************************************************************/

  // Toggles the visibility of the add new city dialog.
  app.toggleAddDialog = function(visible) {
    if (visible) {
      app.addDialog.classList.add('dialog-container--visible');
    } else {
      app.addDialog.classList.remove('dialog-container--visible');
    }
  };

  // Updates a pet card from the database.
  app.updatePetCard = function(data) {
    var dataLastUpdated = new Date(data.created);
    var current = data.current;
    var card = app.visibleCards[data.key];
    if (!card) {
      card = app.visibleCards['pending'];
    }
    if (!card) {
      card = app.cardTemplate.cloneNode(true);
      card.classList.remove('cardTemplate');
      card.removeAttribute('hidden');
      app.container.appendChild(card);
      app.visibleCards[data.key] = card;
    }

    // Verifies the data provide is newer than what's already visible
    // on the card, if it's not bail, if it is, continue and update the
    // time saved in the card
    var cardLastUpdatedElem = card.querySelector('.card-last-updated');
    var cardLastUpdated = cardLastUpdatedElem.textContent;
    if (cardLastUpdated) {
      cardLastUpdated = new Date(cardLastUpdated);
      // Bail if the card has more recent data then the data
      if (dataLastUpdated.getTime() < cardLastUpdated.getTime()) {
        return;
      }
    }
    cardLastUpdatedElem.textContent = data.created;

    card.querySelector('.petname').textContent = data.name;
    card.querySelector('.phase').textContent = app.phase;
    card.querySelector('.date').textContent = current.date;
    card.querySelector('.feeder').textContent = current.feeder;
    card.querySelector('.visual .icon').classList.add(app.getIconClass(current.code));

    // Replace the event listener: need to bind new data to it.
    var old_feed = card.querySelector('.visual .feed');
    var new_feed = old_feed.cloneNode(true);
    new_feed.disabled = false;
    new_feed.textContent = 'Feed ' + data.name;
    new_feed.addEventListener('click', function() {
      new_feed.disabled = true;
      app.feedPet(data, new_feed);
    });
    old_feed.parentNode.replaceChild(new_feed, old_feed);

    var today = new Date();
    today = today.getDay();
    if (app.isLoading) {
      app.spinner.setAttribute('hidden', true);
      app.container.removeAttribute('hidden');
      app.isLoading = false;
    }
  };


  /*****************************************************************************
   *
   * Methods for dealing with the model
   *
   ****************************************************************************/

  app.requestDone = function(request) {
    console.log(request);
    app.spinner.setAttribute('hidden', true);
    document.querySelector('.footer .stamp').textContent = Date(request.stamp);
    var message = '';
    if (request.message)
      message = request.message;
    if (request.error)
      message = request.error;
    document.querySelector('.footer .message').textContent = message;

    if (request.error) {
      app.onError(request);
    }
  };

  app.onError = function(request) {
    console.log(request);
    document.querySelector('.footer .error').textContent = 'Error';
  };

  app.setUser = function(nick, url) {
    var card = document.querySelector('.user');
    card.querySelector('.url').action = url;
    if (nick) {
      card.querySelector('.nick').textContent = nick;
      card.querySelector('.logout').removeAttribute('hidden');
      card.querySelector('.login').setAttribute('hidden', true);
    } else {
      card.querySelector('.nick').textContent = 'Logged out';
      card.querySelector('.login').removeAttribute('hidden');
      card.querySelector('.logout').setAttribute('hidden', true);
    }
  };

  app.fetchData = function() {
    var request = new XMLHttpRequest();
    request.onreadystatechange = function() {
      if (request.readyState === XMLHttpRequest.DONE) {
        if (request.status === 200) {
          var response = JSON.parse(request.response);
          app.setUser(response.nick, response.url);
          var eaterlist = []
          if (response.eaters.length == 0)
            response.message = 'All pets deleted';          
          for (var e in response.eaters) {
            eaterlist.push(response.eaters[e]);
            app.updatePetCard(response.eaters[e]);
          }
          app.selectedPets = eaterlist;
          app.savePets(false);
          app.requestDone(response);
        } else {
          app.setUser('fail - not connected?', '');
        }
      } else {
        app.setUser('Working..', '');
      }
    };
    request.open('GET', '/get');
    request.send();
  };

  app.feedPet = function(pet_data, button) {
    pet_data.current.date = new Date();
    pet_data.current.feeder = 'Me!';
    if (pet_data.key == 'pending') {
      app.updatePetCard(pet_data);
      app.savePets(true);
      console.log('Pet has a pending key..');
      return;
    }

    localStorage.selectedPets = JSON.stringify(app.selectedPets);

    var request = new XMLHttpRequest();
    request.onreadystatechange = function() {
      if (request.readyState === XMLHttpRequest.DONE) {
        button.disabled = false;
        if (request.status === 200) {
          var response = JSON.parse(request.response);
          pet_data.current.feeder = response.feeder;
          app.requestDone(response);
        } else {
          app.onError(request);
        }
        app.updatePetCard(pet_data);
      }
    };
    request.open('POST', '/feed');
    request.setRequestHeader('Content-type', 'application/json');
    request.send(JSON.stringify({'pet_key' : pet_data.key}));
  };

  app.savePets = function(commit) {
    console.log('Saved commit = ' + commit);
    console.log(app.selectedPets);
    var petString = JSON.stringify(app.selectedPets);
    localStorage.selectedPets = petString;
    if (!commit)
      return;

    var request = new XMLHttpRequest();
    request.onreadystatechange = function() {
      if (request.readyState === XMLHttpRequest.DONE) {
        if (request.status === 200) {
          var response = JSON.parse(request.response);          
          app.requestDone(response);
          for (var i in app.selectedPets) {
            var oKey = app.selectedPets[i].key;
            var nKey = response.keys[i];
            if (oKey == 'pending') {
              app.selectedPets[i].key = nKey;
              app.updatePetCard(app.selectedPets[i]);
            } else if (oKey != nKey) {
              console.log('Key Sync error: ' + oKey + ' != ' + nKey);
            }
          }
          localStorage.selectedPets = JSON.stringify(app.selectedPets);
        } else {
          app.onError(request);
        }
      }
    };
    request.open('POST', '/savepets');
    request.setRequestHeader('Content-type', 'application/json');
    request.send(petString);
  };

  app.getIconClass = function(weatherCode) {
    return 'windy';
  };

  /* Sample data */
  var initialPet = {
    key: 'pending',
    name: 'Angus',
    created: '2016-07-22T01:00:00Z',
    am: '07:00:00',
    pm: '19:30:00',
    current: {
      date: '2016-07-22T01:00:00Z',
      feeder: 'Fred',
    },
  };
  app.phase = 'Local';

  app.selectedPets = localStorage.selectedPets;
  if (app.selectedPets) {
    app.selectedPets = JSON.parse(app.selectedPets);
    for (var i in app.selectedPets) {
      app.selectedPets[i].fresh = false;
      app.updatePetCard(app.selectedPets[i]);
    }
  } else {
    /* The user is using the app for the first time. */
    app.selectedPets = [ initialPet ];
    app.updatePetCard(initialPet);
  }

  app.phase = 'Server';
  app.fetchData();

  // TODO add service worker code here
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker
             .register('./service-worker.js')
             .then(function() { console.log('Service Worker Registered'); });
  }
})();
