var blockedDomains = [];
var isFullBlocked = null;
var blockedDomainsClock = false;

async function loadBlockedDomains(force = false) {
  if (!force && blockedDomains.length > 0) {
    return;
  }
  const { blockedDomains: rawBlockedDomains } = await chrome.storage.sync.get([
    "blockedDomains",
  ]);

  blockedDomains = rawBlockedDomains || [];
  console.log("Value currently is " + blockedDomains);
}

async function addBlockedDomain(domain) {
  blockedDomains.push(domain);
  await chrome.storage.sync.set(
    { blockedDomains: blockedDomains },
    function () {
      console.log("Value is set to " + blockedDomains);
    }
  );
}

async function removeBlockedDomain(domain) {
  const index = blockedDomains.indexOf(domain);
  if (index > -1) {
    blockedDomains.splice(index, 1);
  }
  await chrome.storage.sync.set(
    { blockedDomains: blockedDomains },
    function () {
      console.log("Value is set to " + blockedDomains);
    }
  );
}

async function removeBlockedDomain(domain) {
  const index = blockedDomains.indexOf(domain);
  if (index > -1) {
    blockedDomains.splice(index, 1);
  }
  await chrome.storage.sync.set(
    { blockedDomains: blockedDomains },
    function () {
      console.log("Value is set to " + blockedDomains);
    }
  );
}

async function loadIsFullBlocked(force = false) {
  if (!force && isFullBlocked !== null) {
    return;
  }
  const { isFullBlocked: rawIsFullBlocked } = await chrome.storage.sync.get([
    "isFullBlocked",
  ]);
  isFullBlocked = rawIsFullBlocked || false;
}

async function setIsFullBlocked(isFullBlocked) {
  await chrome.storage.sync.set({ isFullBlocked: isFullBlocked }, function () {
    console.log("Value is set to " + isFullBlocked);
  });
}

function getDomain(inputString) {
  const regex = /https?:\/\/([^\/\s]+)(\/|\s|$)/;
  const match = inputString.match(regex);
  if (match && match[1]) {
    return match[1];
  } else {
    return null;
  }
}

function setChildDisplay(targetDiv, display) {
  targetDiv.childNodes.forEach(function (child) {
    child.style.display = display;
  });
}

function createBlockMessage(targetDiv, domain) {
  const container = document.createElement("div");
  const blockMessageContainer = document.createElement("div");
  const blockMessageTitle = document.createElement("div");
  const blockMessageUrl = document.createElement("div");
  const displayButton = document.createElement("button");
  const deblockButton = document.createElement("button");
  blockMessageContainer.style.display = "flex";
  blockMessageContainer.style.flexDirection = "column";
  blockMessageContainer.style.gap = "4px";
  blockMessageTitle.innerText = `一筆搜尋結果在封鎖名單之中 `;
  blockMessageUrl.innerText = domain;
  blockMessageContainer.appendChild(blockMessageTitle);
  blockMessageContainer.appendChild(blockMessageUrl);

  container.style.display = "flex";
  container.style.gap = "10px";
  container.style.alignItems = "center";
  container.className = "block-message";

  displayButton.innerText = "顯示該結果";
  displayButton.onclick = function () {
    setChildDisplay(targetDiv, "block");
    container.remove();
  };

  deblockButton.innerText = "解除封鎖";
  deblockButton.onclick = async function () {
    setChildDisplay(targetDiv, "block");
    container.remove();
    await removeBlockedDomain(domain);
    handleBlockedDomainsClock();
  };

  container.appendChild(blockMessageContainer);
  container.appendChild(displayButton);
  container.appendChild(deblockButton);

  return container;
}

function clearBlockNode(targetDiv) {
  targetDiv.querySelectorAll(".block-message").forEach(function (button) {
    button.remove();
  });
  targetDiv.querySelectorAll(".block-message-full").forEach(function (button) {
    button.remove();
  });
  targetDiv.querySelectorAll(".block-button").forEach(function (button) {
    button.remove();
  });
}

function createFullBlockMessage() {
  const container = document.createElement("div");
  container.classList.add("block-message-full");

  return container;
}

function blockResult(targetDiv, domain) {
  if (
    (!isFullBlocked && targetDiv.querySelector(".block-message")) ||
    (isFullBlocked && targetDiv.querySelector(".block-message-full"))
  ) {
    return;
  }
  setChildDisplay(targetDiv, "none");
  clearBlockNode(targetDiv);
  const blockMessage = isFullBlocked
    ? createFullBlockMessage()
    : createBlockMessage(targetDiv, domain);
  targetDiv.appendChild(blockMessage);
}

function formatSearchResult(targetDiv, domain) {
  if (blockedDomains.some((blockedDomain) => domain.includes(blockedDomain))) {
    return blockResult(targetDiv, domain);
  }
  if (targetDiv.querySelector(".block-button")) {
    return;
  }
  setChildDisplay(targetDiv, "block");
  const container = document.createElement("div");
  const blockButton = document.createElement("button");
  container.style.display = "flex";
  container.style.gap = "10px";
  container.style.alignItems = "center";
  container.className = "block-button";
  blockButton.innerText = "封鎖該結果";
  blockButton.onclick = async function () {
    await addBlockedDomain(domain);
    handleBlockedDomainsClock();
    container.remove();
  };
  container.appendChild(blockButton);
  clearBlockNode(targetDiv);
  targetDiv.appendChild(container);
}

async function handleBlockedDomains() {
  await Promise.all([loadIsFullBlocked(), loadBlockedDomains()]);
  var searchResults = document.querySelectorAll("cite");

  searchResults.forEach(function (result) {
    const tagetDomain = getDomain(result.innerText);
    if (!tagetDomain) {
      return;
    }

    formatSearchResult(
      result.parentElement.parentElement.parentElement.parentElement
        .parentElement.parentElement.parentElement.parentElement.parentElement,
      tagetDomain
    );
  });
}

function handleBlockedDomainsClock() {
  if (blockedDomainsClock) {
    return;
  }
  blockedDomainsClock = true;
  setTimeout(function () {
    handleBlockedDomains();
    blockedDomainsClock = false;
  }, 100);
}

function handleAutoBlock() {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.addedNodes.length) {
        handleBlockedDomainsClock();
      }
    });
  });

  observer.observe(document, { childList: true, subtree: true });

  chrome.runtime.onMessage.addListener(async (request) => {
    if (request.action === "refreshBlockedDomains") {
      await Promise.all([loadIsFullBlocked(true), loadBlockedDomains(true)]);
      handleBlockedDomainsClock();
    }
  });
}

handleBlockedDomains();
handleAutoBlock();
