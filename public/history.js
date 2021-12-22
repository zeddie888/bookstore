"use strict";

(function () {
  const BASE_URL = "/bookstore/";

  window.addEventListener("load", init);

  function init() {
    if (window.sessionStorage.getItem("userID")) {
      makeHeading();
      displayAllPurchases();
    }
  }

  function displayAllPurchases() {
    const userID = window.sessionStorage.getItem("userID");
    let data = new FormData();
    data.append("userID", userID);
    fetch(BASE_URL + "viewBuyHistory/", { method: "POST", body: data })
      .then(statusCheck)
      .then((res) => res.json())
      .then((purchases) => {
        for (let i = 0; i < purchases.length; i++) {
          makePurchaseCard(purchases[i]);
        }
      })
      .catch((err) => handleMessage(err, "error"));
  }

  function makePurchaseCard(data) {
    let card = gen("article");
    card.classList.add("purchase");

    let cardInner = gen("div");
    cardInner.classList.add("purchase-inner");

    //Front
    let front = gen("div");
    front.classList.add("purchase-front");
    cardInner.appendChild(front);

    let back = gen("div");
    back.classList.add("purchase-back");
    cardInner.appendChild(back);

    let heading = gen("h2");
    let authorText = data.author.replace(";", ", ");
    heading.textContent = data.title + " by " + authorText;
    let datetime = gen("p");
    datetime.textContent = data.datetime_purchased;
    let quantity = gen("p");
    quantity.textContent = "Quantity: " + data.quantity;
    let cost = gen("p");
    cost.textContent = "Cost: $" + data.total_cost;
    front.appendChild(heading);
    front.appendChild(datetime);
    front.appendChild(quantity);
    front.appendChild(cost);

    let confirmation = gen("p");
    confirmation.textContent = "Confirmation Code: " + data.confirmation_code;
    let costPerBook = gen("p");
    costPerBook.textContent = "Price Per Book: $" + data.price_per_item;
    let sellerName = gen("p");
    sellerName.textContent = "Sold by: " + data.username;
    back.appendChild(confirmation);
    back.appendChild(costPerBook);
    back.appendChild(sellerName);

    card.appendChild(cardInner);
    id("history").appendChild(card);
  }

  function makeHeading() {
    let heading = gen("h1");
    const username = window.sessionStorage.getItem("username");
    heading.textContent = username + "'s Purchase History";
    qs("body").prepend(heading);
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
