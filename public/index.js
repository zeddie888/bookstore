"use strict";

(function () {
  const BASE_URL = "/bookstore/";

  window.addEventListener("load", init);

  function init() {
    //TODO: should actually call the login endpoint again?
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
    showElement("logout", "profile");
    // Add username and password to sessionStorage TODO
    window.sessionStorage.setItem("userID", user.id);
    window.sessionStorage.setItem("username", user.username);
    window.sessionStorage.setItem("password", user.password);
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
