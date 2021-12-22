"use strict";

(function () {
  const BASE_URL = "/bookstore/";

  window.addEventListener("load", init);

  function init() {
    if (window.sessionStorage.getItem("userID")) {
      makeHeading();
      displayAllItemsSold();
    }
  }

  function displayAllItemsSold() {
    const userID = window.sessionStorage.getItem("userID");
    let data = new FormData();
    data.append("sellerID", userID);
    fetch(BASE_URL + "viewSellHistory/", { method: "POST", body: data })
      .then(statusCheck)
      .then((res) => res.json())
      .then((itemsSold) => {
        for (let i = 0; i < itemsSold.length; i++) {
          makeSoldCard(itemsSold[i]);
        }
      })
      .catch((err) => handleMessage(err, "error"));
  }

  function makeSoldCard(sold) {
    let card = gen("article");
    card.classList.add("history");

    let heading = gen("p");
    let authorText = sold.author.replace(";", ", ");
    heading.textContent = "Item: " + sold.title + " by " + authorText;
    let quantity = gen("p");
    quantity.textContent = "Quantity: " + sold.quantity;
    let pricePerBook = gen("p");
    pricePerBook.textContent = "Price Per Item: " + sold.price_per_item;
    let totalCost = gen("p");
    totalCost.textContent = "Total Cost: " + sold.total_cost;
    let buyer = gen("p");
    buyer.textContent = "Sold to: " + sold.username;
    if (sold.username === window.sessionStorage.getItem("username")) {
      buyer.textContent += " (You)";
    }
    let whenPurchased = gen("p");
    whenPurchased.textContent = "Bought: " + sold.datetime_purchased;

    card.appendChild(heading);
    card.appendChild(quantity);
    card.appendChild(pricePerBook);
    card.appendChild(totalCost);
    card.appendChild(buyer);
    card.appendChild(whenPurchased);

    id("items-sold").appendChild(card);
  }

  function makeHeading() {
    let heading = gen("h1");
    const username = window.sessionStorage.getItem("username");
    heading.textContent = "Items sold by " + username;
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
