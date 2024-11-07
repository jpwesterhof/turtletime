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

function onStyleChange(element, fn) {
  //https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver
  new MutationObserver((mutationList, observer) => {
    for (const mutation of mutationList) {
      if(mutation.type === 'attributes' && mutation.attributeName === 'style') {
        if(fn(mutation)) {
          observer.disconnect();
        }
      }
    }
  }).observe(element, { attributes: true, childList: true, subtree: true });
}

function htmlToNode(html) {
    const template = document.createElement('template');
    template.innerHTML = html;
    const nNodes = template.content.childNodes.length;
    if (nNodes !== 1) {
        throw new Error(
            `html parameter must represent a single node; got ${nNodes}. ` +
            'Note that leading or trailing spaces around an element in your ' +
            'HTML, like " <img/> ", get parsed as text nodes neighbouring ' +
            'the element; call .trim() on your input to avoid this.'
        );
    }
    return template.content.firstChild;
}

function msToHumanReadable(ms) {
  const milliseconds = Math.floor((ms % 1000) / 100),
        seconds = Math.floor((ms / 1000) % 60),
        minutes = Math.floor((ms / (1000 * 60)) % 60),
        hours = Math.floor((ms / (1000 * 60 * 60)) % 24),
        days = Math.floor((ms / (1000 * 60 * 60 * 24)));

  const pieces = [
    days    == 0? '': `${days} day${days == 1? '':'s'}`,
    hours   == 0? '': `${hours} hour${hours == 1? '':'s'}`,
    minutes == 0? '': `${minutes} minute${minutes == 1? '':'s'}`,
    seconds == 0? '': `${seconds} second${seconds == 1? '':'s'}`,
  ].filter(e => e != '');

  if(pieces.length == 0) return '0 seconds';
  const lastPiece = pieces.pop();
  return pieces.length == 0? lastPiece: [pieces.join(', '), lastPiece].join(' and ');
}

class TurtleTimeStorageHandler {
  constructor(key, keep) {
    this.key = key;
    this.keep = keep;
  }
  getTime(turtleId, callback) {
    this.getInfo(turtleId, (result) => {
      callback(result === null? 2*60*1000: result['time']);
    });
  }
  getInfo(turtleId, callback) {
    chrome.storage.local.get(turtleId, (result) => {
      callback(Object.keys(result).length === 0? null: result[turtleId]);
    });
  }
  setInfo(turtleId, title, time, image, url, callback = null) {
    chrome.storage.local.set({ [turtleId]: {
      title: title,
      time: time,
      image: image,
      url: url
    }}).then(() => {
      chrome.storage.local.get(this.key, (result) => {
        let idArray = (Object.keys(result).length === 0 && result.constructor === Object)? []: result[this.key].filter((e, i) => e != turtleId);
        while(idArray.length > this.keep - 1) {
          chrome.storage.local.remove(idArray.shift());
        }
        idArray.push(turtleId);
        chrome.storage.local.set({ [this.key]: idArray });
      })
    });
  }
}