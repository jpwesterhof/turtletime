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

const turtleId = [config.turtleIdRegex.exec(location.pathname)].map(id => id == null? false: id[1]).pop();

initExtension();
if(turtleId) {
  runExtension();
}

function initExtension() {
  const menu = document.querySelector('ul.navbar-nav');
  const menu_item = menu.firstElementChild.cloneNode();
  const link_item = menu.firstElementChild.firstElementChild.cloneNode();
  link_item.href = chrome.runtime.getURL('options.html');
  link_item.target = '_blank';
  link_item.innerHTML = 'Turtletime';
  () => link_item.addEventListener('click', (e) => {
    e.preventDefault();
    return false;
  });

  menu_item.appendChild(link_item);
  menu.appendChild(menu_item);
}

function runExtension() {
  const ttsh = new TurtleTimeStorageHandler(config.storageKey, config.storageKeep);
/*
  chrome.storage.local.get(config.storageKey).then((result) => { 
    console.log('for storageKey', result);
  });
  chrome.storage.local.get(null).then((result) => { 
    console.log('for null', result);
  });
*/
  //Get the run button from the turtletoy DOM
  const runButton = document.querySelector('#objectCompileButton');
  const spinnerElement = runButton.querySelector('#compileSpinner');

  //Create a new button which triggers a 'Run & Compile without time limit'
  const runNoLimitButton = htmlToNode(`<button class="btn btn-danger ml-auto" data-toggle="modal" data-target="#noTimeLimitModal" onclick="return false;">Compile &amp; Run without time limit</button>`);
  if(turtleId == 'new') {
    runNoLimitButton.innerText = runNoLimitButton.innerText + ' (Save turtle first)';
  }
  runNoLimitButton.disabled = true;
  runNoLimitButton.addEventListener('click', (e) => { e.preventDefault(); });
  runButton.insertAdjacentElement('beforebegin', runNoLimitButton);
  //When the page is first loaded, the turtle will run. During this time the 'Run & Compile without time limit' is disabled. The next line makes sure it's enabled when that initial run is completed.
  toggleButtonOnCompileAndRun(runNoLimitButton, spinnerElement);

  //This extension does not have access to jQuery or bootstrap used in turtletoy. Therefor some html needs to be injected to make use of these libraries.
  //This button is used to display a modal while rendering. (The user still can use the url to change parameters and relaunch a render, this is a know issue)
  const triggerBusyModalButton = htmlToNode(`<button type="button" data-toggle="modal" data-target="#noTimeLimitBusyModal" data-backdrop="static" onclick="return false;" style="display: none;">test</button>`);
  triggerBusyModalButton.addEventListener('click', (e) => { e.preventDefault(); });
  runNoLimitButton.appendChild(triggerBusyModalButton);

  //A button to enable the user to close the modal (since this extension cannot access the bootstrap runtime)
  const completedModalButton = htmlToNode(`<button type="button" class="btn btn-primary btn-default-width" data-dismiss="modal"><span class="spinner-border spinner-border-sm mr-1"></span> Ok</button>`);
  completedModalButton.disabled = true;
  const processingSpinner = completedModalButton.querySelector('span');
  //The modal to show while a render without time limit is ran
  const busyModalHtml = getProcessingModal();
  busyModalHtml.querySelector('.modal-footer').appendChild(completedModalButton);
  const timelessProgress = busyModalHtml.querySelector('#timelessProgress');
  const timelessProgressOvertime = busyModalHtml.querySelector('#timelessProgressOvertime');
  document.querySelector('body').appendChild(busyModalHtml);
  const stopwatchDiv = busyModalHtml.querySelector('.stopwatch');
  completedModalButton.addEventListener('click', () => { window.setTimeout(() => {
    //reset the modal to conditions to start a new run (with a delay so the user doesn't see it when the modal is removed with an animation)
    stopwatchDiv.innerHTML = '0 seconds';
    processingSpinner.style.display = 'inline-block';
    completedModalButton.disabled = true;
    timelessProgress.style.width = '0%';
    timelessProgress.classList.add('progress-bar-animated');
    timelessProgressOvertime.classList.add('progress-bar-animated');
  }, 500) });

  const canvas = document.querySelector('canvas#canvas_turtle');
  const turtleTitle = config.titleRegex.exec(document.querySelector('title').innerText)[1];

  //A 2-step activation to warn the user for eternal loops and other locks of the tab
  //The 'cancel' button is set to be the default on purpose.
  const areYouSureModalHtml = getAreYouSureModal();
  document.querySelector('body').appendChild(areYouSureModalHtml);
  const continueButton = areYouSureModalHtml.querySelector('#timelesscontinue');

  //Eliminating the time limitation
  continueButton.addEventListener('click', () => {
    //Set a default time for rendering and try to obtain it from local storage
    let lastTime = 2 * 60 * 1000;
    ttsh.getTime(turtleId, (result) => {
      lastTime = result
    });
    
    //show the second modal
    triggerBusyModalButton.click();

    const startDatetime = new Date();

    const newId = setTimeout(() => {}, 1000);
    runButton.click();
    let id = window.setTimeout(function() {}, 1000);
    window.clearTimeout(id);

    while (newId < id--) {
      window.clearTimeout(id); // remove all 'setTimeouts' since newId = setTimeout(), effectively clearing Turtletoy's time limitation
    }

    const monitorId = window.setInterval(() => {
      const msDiff = (new Date()) - startDatetime;
      stopwatchDiv.innerHTML = msToHumanReadable(msDiff);
      timelessProgress.style.width = Math.min(100, 100 * msDiff / lastTime)+'%';
      timelessProgressOvertime.style.width = Math.max(0, 100 * msDiff / lastTime - 100) + '%';
    }, 1000);

    onCompileAndRunComplete(() => {
      window.clearInterval(monitorId);
      ttsh.setInfo(turtleId, turtleTitle, (new Date()) - startDatetime, getResizedDataUrl(canvas, config.thumbnailSize), window.location.href);
      completedModalButton.disabled = false;
      processingSpinner.style.display = 'none';
      timelessProgress.style.width = '100%';
      timelessProgress.classList.remove('progress-bar-animated');
      timelessProgressOvertime.style.width = '0%';
      timelessProgressOvertime.classList.remove('progress-bar-animated');
    }, spinnerElement);
  });

  function getResizedDataUrl(sourceCanvas, squareSize) {
    const targetCanvas = document.createElement("canvas");
    targetCanvas.height = squareSize;
    targetCanvas.width = squareSize;

    targetCanvas.getContext("2d").drawImage(sourceCanvas, 0, 0, squareSize, squareSize);
    return targetCanvas.toDataURL('image/png');
  }

  function toggleButtonOnCompileAndRun(runNoLimitButton, spinnerElement) {
    onStyleChange(spinnerElement, () => {
      runNoLimitButton.disabled = turtleId == 'new' || !(spinnerElement.style.display === 'none');
    });
  }

  function onCompileAndRunComplete(fn, spinnerElement) {
    onStyleChange(spinnerElement, () => {
      if(spinnerElement.style.display === 'none') {
        fn();
        return true;
      }
    });
  }

  function getAreYouSureModal() {
    return htmlToNode(`<div class="modal fade" id="noTimeLimitModal" tabindex="-1" role="dialog" aria-labelledby="noTimeLimitModal" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered" role="document">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="exampleModalLongTitle">Are you sure?</h5>
          <button type="button" class="close" data-dismiss="modal" aria-label="Close">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <div class="modal-body">
          Running without a time limit might cause the browser (tab) to become unresponsive. Make sure to save your work first.
        </div>
        <div class="modal-footer">
          <button type="button" id="timelesscontinue" class="btn btn-secondary btn-default-width" data-dismiss="modal">Continue</button>
          <button type="button" class="btn btn-primary btn-default-width" data-dismiss="modal">Cancel</button>
        </div>
      </div>
    </div>
  </div>`);
  }

  function getProcessingModal() {
    return htmlToNode(`<div class="modal fade" id="noTimeLimitBusyModal" tabindex="-1" role="dialog" aria-labelledby="noTimeLimitBusyModal" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered" role="document">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="exampleModalLongTitle">Working...</h5>
        </div>
        <div class="modal-body">
          <p>Please wait while your turtle completes it's run.</p>
          <p>Running for <span class="stopwatch">0 seconds</span>.</p>
          <div class="progress">
            <div id="timelessProgress" class="progress-bar progress-bar-striped progress-bar-animated" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100" style="width: 0%"></div>
            <div id="timelessProgressOvertime" class="progress-bar progress-bar-striped progress-bar-animated bg-warning" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100" style="width: 0%"></div>
          </div>
          <p>(Progress bar based on your  last run of this turtle)</p>
        </div>
        <div class="modal-footer">
        </div>
      </div>
    </div>
  </div>`);
  }
}
