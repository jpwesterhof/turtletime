// Copyright 2024 Jurgen https://turtletoy.net/user/Jurgen
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// Saves options to chrome.storage
const saveOptions = () => {
  const color = document.getElementById('color').value;
  const likesColor = document.getElementById('like').checked;

  chrome.storage.sync.set(
    { favoriteColor: color, likesColor: likesColor },
    () => {
      // Update status to let user know options were saved.
      const status = document.getElementById('status');
      status.textContent = 'Options saved.';
      setTimeout(() => {
        status.textContent = '';
      }, 750);
    }
  );
};

const populateTable = (items) => {
  const turtles = [];
  if(config.storageKey in items) {
    items[config.storageKey].map(e => e).reverse().forEach(e => {
      const item = items[e];
      item.id = e;
      turtles.push(item)
    });
  }

  const homeObjects = document.querySelector('div.home-objects');
  homeObjects.innerHTML = '';

  const htmlentities = (str) => str.replace(/[\u00A0-\u9999<>\&]/g, i => '&#'+i.charCodeAt(0)+';');

  for (const info of turtles) {
    const title = htmlentities(info.title);
    const url = htmlentities(info.url);
    const tid = htmlentities(info.id);

    homeObjects.appendChild(htmlToNode(
      `<div class="card float-left mr-3 mb-3 object-card">
        <a href="${info.url}" class="m-0 p-0" data-object_id="eacf65fc03" title="${title}" data-version="1" aria-label="${title}" target="_blank">
          <picture>
            <img src="${info.image}" class="m-0 p-0 card-img-top card-object" loading="lazy" alt="${title}">
          </picture>
        </a>
        <div class="card-body">
          <a href="https://turtletoy.net/turtle/${tid}" aria-label="${title}" class="object-card_title" target="_blank">
            <h5 class="text-truncate">${title}</h5>
          </a>
          <div class="clearfix social-container small">
            <div>Last render took ${msToHumanReadable(info.time)}</div>
          </div>
        </div>
      </div>`
    ));
  }
}

const loadOptionsPage = () => {
  const clearStorageButton = document.getElementById('clearstorage');
  clearStorageButton.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.storage.local.clear().then(() => {
      chrome.storage.local.get(null, populateTable);
    });
  });

  // Restores select box and checkbox state using the preferences
  // stored in chrome.storage.

  chrome.storage.local.get(null, populateTable);
};


switch (document.readyState) {
  case "loading": // The document is loading.
  case "interactive": { //The document has finished loading but sub-resources such as scripts, images, stylesheets and frames are still loading.
    window.addEventListener('load', loadOptionsPage);
    break;
  }
  case "complete": // The page is fully loaded.
    loadOptionsPage();
    break;
}

