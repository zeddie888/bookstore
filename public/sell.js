"use strict";

(function () {
  const BASE_URL = "/bookstore/";

  window.addEventListener("load", init);

  function init() {
    if (window.sessionStorage.getItem("userID")) {
      id("sell-form").addEventListener("submit", function (ev) {
        ev.preventDefault();
        addNewItem();
      });
      qs("#sell-form button").disabled = false;
    } else {
      qs("#sell-form button").disabled = true;
    }
  }

  function addNewItem() {
    let data = new FormData(id("sell-form"));
    data.append("userID", window.sessionStorage.getItem("userID"));
    fetch(BASE_URL + "listNewItem", { method: "POST", body: data })
      .then(statusCheck)
      .then((res) => res.text())
      .then((res) => {
        let inputs = qsa("#sell-form input");
        for (let i = 0; i < inputs.length; i++) {
          inputs[i].value = "";
        }
        id("sell-descr").value = "";
        handleMessage(res, "success");
      })
      .catch((err) => handleMessage(err, "error"));
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
