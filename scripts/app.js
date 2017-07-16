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

  document.getElementById('butRefresh').addEventListener('click', function() {
    // Refresh all of the forecasts
    app.fetchData();
  });

  document.getElementById('butAdd').addEventListener('click', function() {
    // Open/show the add new pet dialog
    app.toggleAddDialog(true);
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
      card.querySelector('.petname').textContent = data.name;
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

    card.querySelector('.date').textContent = current.date;
    card.querySelector('.feeder').textContent = current.feeder;
    card.querySelector('.visual .icon').classList.add(app.getIconClass(current.code));
    card.querySelector('.visual .feed').textContent = 'Feedstate';
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
    document.querySelector('.footer .stamp').textContent = Date(request.stamp);
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
          for (var e in response.eaters) {
            eaterlist.push(response.eaters[e]);
            app.updatePetCard(response.eaters[e]);
          }
          app.selectedPets = eaterlist;
          app.savePets(false);
          app.requestDone(response);
        }
      } else {
        app.setUser('fail - not connected?', '');
      }
    };
    request.open('GET', '/get');
    request.send();
  };

  app.savePets = function(commit) {
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
          app.fetchData();
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

  app.fetchData();

  /*
   * Fake weather data that is presented when the user first uses the app,
   * or when the user has not saved any cities. See startup code for more
   * discussion.
   */
  var initialPet = {
    key: '2459115',
    name: 'Angus',
    created: '2016-07-22T01:00:00Z',
    am: '07:00:00',
    pm: '19:30:00',
    current: {
      date: '2016-07-22T01:00:00Z',
      feeder: 'Fred',
    },
  };
  // TODO uncomment line below to test app with fake data
  app.updatePetCard(initialPet);

  /************************************************************************
   *
   * Code required to start the app
   *
   * NOTE: To simplify this codelab, we've used localStorage.
   *   localStorage is a synchronous API and has serious performance
   *   implications. It should not be used in production applications!
   *   Instead, check out IDB (https://www.npmjs.com/package/idb) or
   *   SimpleDB (https://gist.github.com/inexorabletash/c8069c042b734519680c)
   ************************************************************************/

  // TODO add startup code here
  app.selectedPets = localStorage.selectedPets;
  if (app.selectedPets) {
    app.selectedPets = JSON.parse(app.selectedPets);
    app.selectedPets.forEach(function(city) {
      //app.getForecast(city.key, city.label);
    });
  } else {
    /* The user is using the app for the first time, or the user has not
     * saved any cities, so show the user some fake data. A real app in this
     * scenario could guess the user's petname via IP lookup and then inject
     * that data into the page.
     */
    app.updatePetCard(initialPet);
    app.selectedPets = [
      {key: initialPet.key, label: initialPet.label}
    ];
    app.savePet();
  }

  // TODO add service worker code here
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker
             .register('./service-worker.js')
             .then(function() { console.log('Service Worker Registered'); });
  }
})();
