"use strict";

(function () {
  const BASE_URL = "/bookstore/";
  let cart;
  let cartTotal;

  window.addEventListener("load", init);

  function init() {
    displayBooks("All");
    // If already logged in previously, login with sessionStorage items
    if (isLoggedIn()) {
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
    card.id = "book-" + data.id;
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
    if (!isLoggedIn() || data.quantity <= 0) {
      addCartBtn.disabled = true;
    }
    addCartBtn.classList.add("add-cart-btn");
    addCartBtn.textContent = "Add to Cart";
    addCartBtn.addEventListener("click", () => {
      addToCart(data.id);
    });

    back.appendChild(description);
    back.appendChild(sellerName);
    back.appendChild(price);
    back.appendChild(quantity);
    back.appendChild(addCartBtn);

    card.appendChild(cardInner);
    id("shelf-display").appendChild(card);
  }

  function addToCart(itemID) {
    if (itemID in cart) {
      cart[itemID]++;
    } else {
      cart[itemID] = 1;
    }
    saveCart();
  }

  function displayCart() {
    cartTotal = 0;
    id("cart-total").innerHTML = "";

    const cartItems = id("cart-items");
    cartItems.innerHTML = "";
    for (let itemID in cart) {
      getItemData(itemID);
    }
  }

  function getItemData(itemID) {
    fetch(BASE_URL + "itemInfo/" + itemID)
      .then(statusCheck)
      .then((res) => res.json())
      .then((data) => {
        makeCartCard(data, itemID);
        cartTotal += cart[itemID] * data.price;
        id("cart-total").textContent = "Cart Total: " + cartTotal;
      })
      .catch((err) => handleMessage(err, "error"));
  }

  function makeCartCard(data, itemID) {
    let card = gen("article");
    card.classList.add("cart-card");

    let title = gen("h3");
    title.textContent = "Item: " + data.title;
    let quantity = gen("p");
    quantity.textContent = "Quantity: " + cart[itemID];
    let cost = gen("p");
    cost.textContent = "Cost: " + cart[itemID] * data.price;

    let deleteBtn = gen("button");
    deleteBtn.textContent = "Remove from cart";
    deleteBtn.addEventListener("click", () => {
      removeCartItem(itemID);
    });

    card.appendChild(title);
    card.appendChild(quantity);
    card.appendChild(cost);
    card.appendChild(deleteBtn);
    // New appjs endpoint, give price for given item
    id("cart-items").appendChild(card);
  }

  function removeCartItem(itemID) {
    delete cart[itemID];
    saveCart();
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
        // window.sessionStorage.removeItem("userID");
        // window.sessionStorage.removeItem("username");
        // window.sessionStorage.removeItem("password");
        clearCart();
        window.sessionStorage.clear(); // includes cart

        displayBooks("All");
      })
      .catch((err) => handleMessage(err, "error"));
  }

  function sendLoginRequest(alreadyLoggedIn) {
    let data;
    if (alreadyLoggedIn) {
      // Get the stored cart
      cart = JSON.parse(window.sessionStorage.getItem("cart"));

      data = new FormData();
      data.append("username", window.sessionStorage.getItem("username"));
      data.append("password", window.sessionStorage.getItem("password"));
    } else {
      data = new FormData(id("login-form"));

      // Make and save new cart
      cart = {};
      // cart.total = 0;
    }
    saveCart();

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

    displayBooks("All");
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

  function isLoggedIn() {
    return window.sessionStorage.getItem("userID") !== null;
  }

  function freezeAllAddCartBtns() {
    const btns = qsa(".add-cart-btn");
    for (let btn of btns) {
      btn.disabled = true;
    }
  }

  function clearCart() {
    cart = {};
    // cart.total = 0;
    saveCart();
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

  function saveCart() {
    window.sessionStorage.setItem("cart", JSON.stringify(cart));
    displayCart();
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
