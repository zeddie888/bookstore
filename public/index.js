"use strict";

(function () {
  const BASE_URL = "/bookstore/";

  window.addEventListener("load", init);

  function init() {
    // If already logged in previously, login with sessionStorage items
    if (window.sessionStorage.getItem("userID")) {
      sendLoginRequest(true);
      console.log("already logged in");
    }

    id("login-form").addEventListener("submit", function (ev) {
      ev.preventDefault();
      sendLoginRequest(false);
      id("login-username").value = "";
      id("login-pw").value = "";
    });

    id("register-btn").addEventListener("click", () => {
      showElement("register", "profile");
      hideElement("login", "profile");
    });
    id("back-register-btn").addEventListener("click", () => {
      showElement("login", "profile");
      hideElement("register", "profile");
    });

    id("register-form").addEventListener("submit", function (ev) {
      ev.preventDefault();
      sendRegisterRequest();
      id("register-email").value = "";
      id("register-username").value = "";
      id("register-pw").value = "";
    });

    displayBooks("All");

    const subjectButtons = qsa(".shelf");
    for (let i = 0; i < subjectButtons.length; i++) {
      subjectButtons[i].addEventListener("click", addButtonFilter);
    }
  }

  function addButtonFilter() {
    let subject = this.id.replace(" Shelf", "");
    displayBooks(subject);
  }

  function displayBooks(subject) {
    id("shelf-display").innerHTML = "";
    fetch(BASE_URL + "inventory/" + subject)
      .then(statusCheck)
      .then((res) => res.json())
      .then((books) => {
        for (let book in books) {
          makeBookCard(books[book]);
        }
      })
      .catch((err) => handleMessage(err, "error"));
  }

  function makeBookCard(data) {
    let card = gen("article");
    card.classList.add("book");

    let cardInner = gen("div");
    cardInner.classList.add("book-inner");

    //Front
    let front = gen("div");
    front.classList.add("book-front");
    cardInner.appendChild(front);

    let back = gen("div");
    back.classList.add("book-back");
    cardInner.appendChild(back);

    let title = gen("h2");
    title.textContent = data.title;
    let author = gen("p");
    let authorText = data.author.replace(";", ", ");
    author.textContent = authorText;

    front.appendChild(title);
    front.appendChild(author);

    let description = gen("p");
    description.textContent = data.description;
    let sellerName = gen("p");
    sellerName.textContent = "Sold by: " + data.username;
    let price = gen("p");
    price.textContent = "Price: $" + data.price;
    let quantity = gen("p");
    quantity.textContent = "In stock: " + data.quantity;
    let addCartBtn = gen("button");
    addCartBtn.textContent = "Add to Cart";
    back.appendChild(description);
    back.appendChild(sellerName);
    back.appendChild(price);
    back.appendChild(quantity);
    back.appendChild(addCartBtn);

    card.appendChild(cardInner);
    id("shelf-display").appendChild(card);
  }

  function sendRegisterRequest() {
    let data = new FormData(id("register-form"));
    fetch(BASE_URL + "register", { method: "POST", body: data })
      .then(statusCheck)
      .then((res) => res.text())
      .then((msg) => {
        handleMessage(msg, "success");
        hideElement("register", "profile");
        showElement("login", "profile");
      })
      .catch((err) => handleMessage(err, "error"));
  }

  function logoutUser() {
    const userID = window.sessionStorage.getItem("userID");
    let data = new FormData();
    data.append("userID", userID);
    fetch(BASE_URL + "logout", { method: "POST", body: data })
      .then(statusCheck)
      .then((res) => res.text())
      .then((msg) => {
        handleMessage(msg, "success");
        hideElement("profile", "profile");
        showElement("login", "profile");
        window.sessionStorage.removeItem("userID");
        window.sessionStorage.removeItem("username");
        window.sessionStorage.removeItem("password");
      })
      .catch((err) => handleMessage(err, "error"));
  }

  function sendLoginRequest(alreadyLoggedIn) {
    let data;
    if (alreadyLoggedIn) {
      data = new FormData();
      data.append("username", window.sessionStorage.getItem("username"));
      data.append("password", window.sessionStorage.getItem("password"));
    } else {
      data = new FormData(id("login-form"));
    }

    fetch(BASE_URL + "login", { method: "POST", body: data })
      .then(statusCheck)
      .then((res) => res.json())
      .then(updateLoggedIn)
      .catch((err) => handleMessage(err, "error"));
  }

  function updateLoggedIn(user) {
    console.log("logged in");
    handleMessage("Welcome " + user.username, "success");
    // Hide login form and show logout
    hideElement("login", "profile");
    showElement("profile", "profile");
    // Add username and password to sessionStorage
    window.sessionStorage.setItem("userID", user.id);
    window.sessionStorage.setItem("username", user.username);
    window.sessionStorage.setItem("password", user.password);
    // Make the profile card
    makeProfileCard(user);
  }

  function makeProfileCard(user) {
    const profileCard = id("profile");
    profileCard.innerHTML = "";
    let name = gen("h2");
    name.textContent = user.username;
    let balance = gen("p");
    balance.textContent = "Balance: $" + user.credits;

    // Add links for History and Items Sold
    let histories = gen("p");
    let buyHistory = gen("a");
    buyHistory.textContent = "Purchase History";
    buyHistory.href = "history.html";
    let sellHistory = gen("a");
    sellHistory.textContent = "Items Sold";
    sellHistory.href = "sold.html";
    histories.appendChild(buyHistory);
    histories.appendChild(sellHistory);

    let logout = gen("button");
    logout.id = "logout-btn";
    logout.textContent = "Logout";
    logout.addEventListener("click", logoutUser);

    profileCard.appendChild(name);
    profileCard.appendChild(balance);
    profileCard.appendChild(histories);
    profileCard.appendChild(logout);
  }

  function handleMessage(message, msgType) {
    let messageBoard = id("message");
    messageBoard.value = "";
    messageBoard.classList.remove("error", "normal", "success");
    messageBoard.textContent = message;
    switch (msgType) {
      case "error":
        messageBoard.classList.add("error");
        break;
      case "success":
        messageBoard.classList.add("success");
        break;
    }
  }

  /** ------------------------------ Helper Functions  ------------------------------ */
  /**
   * Helper function to return the response's result text if successful, otherwise
   * returns the rejected Promise result with an error status and corresponding text
   * @param {object} res - response to check for success/error
   * @return {object} - valid response if response was successful, else rejected Promise result
   */
  async function statusCheck(res) {
    if (!res.ok) {
      throw new Error(await res.text());
    }
    return res;
  }

  function hideElement(elementID, className) {
    let element = id(elementID);
    element.classList.remove(className);
    element.classList.add("hidden");
  }

  function showElement(eleID, className) {
    let element = id(eleID);
    element.classList.add(className);
    element.classList.remove("hidden");
  }

  /**
   * Returns the element that has the ID attribute with the specified value.
   * @param {string} idName - element ID
   * @returns {object} DOM object associated with id.
   */
  function id(idName) {
    return document.getElementById(idName);
  }

  /**
   * Returns the first element that matches the given CSS selector.
   * @param {string} selector - CSS query selector.
   * @returns {object} The first DOM object matching the query.
   */
  function qs(selector) {
    return document.querySelector(selector);
  }

  /**
   * Returns the array of elements that match the given CSS selector.
   * @param {string} selector - CSS query selector
   * @returns {object[]} array of DOM objects matching the query.
   */
  function qsa(selector) {
    return document.querySelectorAll(selector);
  }

  /**
   * Returns a new element with the given tag name.
   * @param {string} tagName - HTML tag name for new DOM element.
   * @returns {object} New DOM object for given HTML tag.
   */
  function gen(tagName) {
    return document.createElement(tagName);
  }
})();
