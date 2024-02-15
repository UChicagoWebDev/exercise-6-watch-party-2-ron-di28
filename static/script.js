// Constants to easily refer to pages
const SPLASH = document.querySelector(".splash");
const PROFILE = document.querySelector(".profile");
const LOGIN = document.querySelector(".login");
const ROOM = document.querySelector(".room");

let isLoggedIn = false;
let CURRENT_ROOM = 0;
// let lastMessageIds = {};
let messagePollingInterval;

// Custom validation on the password reset fields
const passwordField = document.querySelector(".profile input[name=password]");
const repeatPasswordField = document.querySelector(".profile input[name=repeatPassword]");
const repeatPasswordMatches = () => {
  const p = document.querySelector(".profile input[name=password]").value;
  const r = repeatPassword.value;
  return p == r;
};

const checkPasswordRepeat = () => {
  const passwordField = document.querySelector(".profile input[name=password]");
  if(passwordField.value == repeatPasswordField.value) {
    repeatPasswordField.setCustomValidity("");
    return;
  } else {
    repeatPasswordField.setCustomValidity("Password doesn't match");
  }
}

passwordField.addEventListener("input", checkPasswordRepeat);
repeatPasswordField.addEventListener("input", checkPasswordRepeat);

// TODO:  On page load, read the path and whether the user has valid credentials:
//        - If they ask for the splash page ("/"), display it
//        - If they ask for the login page ("/login") and don't have credentials, display it
//        - If they ask for the login page ("/login") and have credentials, send them to "/"
//        - If they ask for any other valid page ("/profile" or "/room") and do have credentials,
//          show it to them
//        - If they ask for any other valid page ("/profile" or "/room") and don't have
//          credentials, send them to "/login", but remember where they were trying to go. If they
//          login successfully, send them to their original destination
//        - Hide all other pages

// TODO:  When displaying a page, update the DOM to show the appropriate content for any element
//        that currently contains a {{ }} placeholder. You do not have to parse variable names out
//        of the curly  braces—they are for illustration only. You can just replace the contents
//        of the parent element (and in fact can remove the {{}} from index.html if you want).

// TODO:  Handle clicks on the UI elements.
//        - Send API requests with fetch where appropriate.
//        - Parse the results and update the page.
//        - When the user goes to a new "page" ("/", "/login", "/profile", or "/room"), push it to
//          History

// TODO:  When a user enters a room, start a process that queries for new chat messages every 0.1
//        seconds. When the user leaves the room, cancel that process.
//        (Hint: https://developer.mozilla.org/en-US/docs/Web/API/setInterval#return_value)

// On page load, show the appropriate page and hide the others


// Helper function to show only the html for a particular page
let showOnly = (element) => {
  SPLASH.classList.add("hide")
  PROFILE.classList.add("hide");
  LOGIN.classList.add("hide");
  ROOM.classList.add("hide");

  element.classList.remove("hide");
}

// Show me a new "page" main logic
let router = () => {
  CURRENT_ROOM = 0;
  let path = window.location.pathname;
  
  if(path == "/") {
    getRooms();
    showOnly(SPLASH);
  }
  else if(path == "/profile"){
    if(isLoggedIn) {
      showOnly(PROFILE);
    }
    else {
      history.pushState({}, '', '/login');
      sessionStorage.setItem('redirectToAfterLogin', path);
      router();
    }
  } 
  else if(path.startsWith("/rooms/")) {
    if(isLoggedIn) {
      const roomId = path.split("/")[2]; 
      CURRENT_ROOM = roomId; 
      console.log(CURRENT_ROOM);
      loadRoom(roomId); 
      showOnly(ROOM);
    }
    else {
      history.pushState({}, '', '/login');
      sessionStorage.setItem('redirectToAfterLogin', path);
      router();
    }
    
  }
  else if(path == "/login") {
    if(isLoggedIn) {
      history.pushState({}, '', '/');
      router();
    }
    else {
      showOnly(LOGIN);
    }
  }
  else if(path == "/signup") {
    showOnly(PROFILE);
  }
  else {
    // show a 404?
    console.log("I don't know how we got to "+pathname+", but something has gone wrong");
  }
  // ..
}

// logout function
function logout() {
  localStorage.removeItem('api_key');
  // localStorage.removeItem('password');
  // localStorage.removeItem('username');
  // localStorage.removeItem('user_id');
  isLoggedIn = false;
  loginStateUpdateUI();
  window.location.reload();
}


// function to update ui across html for logged in / logged out status
function loginStateUpdateUI() {
  const createRoomButton = document.querySelector('.create');
  const signupButton = document.querySelector('.signup');
  const loggedOut = document.querySelector('.loggedOut'); 
  const loggedIn = document.querySelector('.loggedIn'); 
  const usernameSpans = document.querySelectorAll('.username');
  const usernameInput = document.querySelector('.profile input[name="username"]');
  const passwordInput = document.querySelector(".profile input[name=password]");
  const repeatPasswordInput = document.querySelector(".profile input[name=repeatPassword]");

  const username = sessionStorage.getItem('username');
  const password = sessionStorage.getItem('password');

  if(isLoggedIn) {
    createRoomButton.classList.remove('hide');
    loggedIn.classList.remove('hide');
    signupButton.classList.add('hide');
    loggedOut.classList.add('hide');
    usernameSpans.forEach(span => {
      span.textContent = `Welcome back, ${username}!`;
    });
    usernameInput.value = username;
    passwordInput.value = password;
    repeatPasswordInput.value = password;
  }
  else{
    createRoomButton.classList.add('hide');
    loggedIn.classList.add('hide');
    signupButton.classList.remove('hide');
    loggedOut.classList.remove('hide');
  }
}

// function for updating username of the user
async function updateUsername(username) {
  api_key = localStorage.getItem('api_key');
  try {
    const response = await fetch ('/api/user/username', {
      method: 'POST', 
      headers: {
        'Content-Type': 'application/json',
        'API-Key': api_key, 
      }, 
      body: JSON.stringify({ new_username: username })
    })
    const data = await response.json();
    const usernameSpans = document.querySelectorAll('.username');
    usernameSpans.forEach(span => {
      span.textContent = `Welcome back, ${username}!`;
    });
  } catch (error) {
    console.error('Error updating username:', error);
  }
}

// function for updating password of the user
async function updatePassword(password) {
  api_key = localStorage.getItem('api_key');
  try {
    const response = await fetch  ('/api/user/password', {
      method: 'POST', 
      headers: {
        'Content-Type': 'application/json',
        'API-Key': api_key, 
      }, 
      body: JSON.stringify({ new_password: password })
    })
    const data = await response.json();
  } catch (error) {
    console.error('Error updating password:', error);
  }
}

// checks the credentials of the user
async function checkCredentials() {
  api_key = localStorage.getItem('api_key');
  try {
    const response = await fetch ('/api/checkcredentials', {
      method: 'POST', 
      headers: {
        'Content-Type': 'application/json',
        'API-Key': api_key
      }
    })
    const data = await response.json();
    if (data.username && data.password) {
      isLoggedIn = true;
      sessionStorage.setItem('username', data.username);
      sessionStorage.setItem('password', data.password);
      // sessionStorage.setItem('user_id', data.user_id);
    } else {
      isLoggedIn = false;
    }
  } catch (error) {
    isLoggedIn = false; 
    console.error('Error checking credentials:', error);
  }
}

// signs the user up
async function oneClickSignup() {
  try { 
    const response = await fetch ('/api/signup', {
      method: 'POST'
    })
    const data = await response.json();
    localStorage.setItem('api_key', data.api_key);
    sessionStorage.setItem('username', data.username);
    sessionStorage.setItem('password', data.password);
    history.pushState({}, '', '/profile');
    isLoggedIn = true;
    loginStateUpdateUI();
    router();
  } catch (error) {
    console.error('Error during signup:', error);
  }
}


async function attemptLogin(username, password) {
  try {
    const response = await fetch('/api/getapikey', {
      method: 'GET', 
      headers: {
        'Content-Type': 'application/json', 
        'Username': username, 
        'Password': password
      }
    });

    if (response.status === 401) {
      console.error('Login failed: Unauthorized');
      document.querySelector('.failed').style.display = 'flex';
      createNewAccountButton = document.getElementById('createNewAccount')
      createNewAccountButton.addEventListener('click', function() {
        oneClickSignup();
      })
    } else if (response.ok) {
      const data = await response.json();
      document.querySelector('.failed').style.display = 'none';
      localStorage.setItem('api_key', data.api_key);
      sessionStorage.setItem('username', username);
      sessionStorage.setItem('password', password);
      isLoggedIn = true;
      const redirectTo = sessionStorage.getItem('redirectToAfterLogin') || '/';
      sessionStorage.removeItem('redirectToAfterLogin');
      history.pushState({}, '', redirectTo);
      loginStateUpdateUI();
      router();
      // console.log('Login successful:', data);
    } else {
      console.error(`Login failed with status: ${response.status}`);
    }
  } catch (error) {
    console.error('Error during login:', error);
  }
}


// function to create a room
async function createRoom() {
  api_key = localStorage.getItem('api_key');
  try { 
    const response = await fetch ('/api/rooms/new', {
      method: 'POST', 
      headers: {
        'Content-Type': 'application/json',
        'API-Key': api_key
      }
    })
    const data = await response.json();
    // console.log('Created Room with ID:', data.room_id);
    router();
  } catch (error) {
    console.error('Error creating room:', error);
  }
}

// function to get rooms to display on splash page
async function getRooms() {
  api_key = localStorage.getItem('api_key');
  try { 
    const response = await fetch ('/api/rooms/new', {
      method: 'GET', 
      headers: {
        'Content-Type': 'application/json',
        'API-Key': api_key
      }
    })
    const rooms = await response.json();
    // console.log("tried to get rooms")
    updateRoomsUI(rooms); 
    // router();
  } catch (error) {
    console.error('Error getting rooms:', error);
  }
}

// function to update rooms ui based on status of rooms
function updateRoomsUI(rooms) {
  const roomsContainer = document.querySelector('.roomList');
  const noRoomsMessage = document.querySelector('.noRooms');

  roomsContainer.innerHTML = '';

  if (rooms.length > 0) {
    rooms.forEach(room => {
      const roomElement = document.createElement('a');
      roomElement.textContent = `${room.id}: ${room.name}`;
      roomElement.classList.add('room-link');
      roomElement.addEventListener('click', (e) => {
        e.preventDefault(); 
        history.pushState({ roomId: room.id }, '', `/rooms/${room.id}`); 
        CURRENT_ROOM = room.id
        // loadRoom(room.id);
        router();
      });
      roomsContainer.appendChild(roomElement);
    });
    noRoomsMessage.classList.add('hide');
  } else {
    noRoomsMessage.classList.remove('hide');
  }
}

// function for loading a room
async function loadRoom(roomId) {
  try { 
    const response = await fetch(`/api/rooms/${roomId}`, {
      method: 'GET', 
      headers: {
        'Content-Type': 'application/json',
        'API-Key': api_key
      }
    })
    const roomDetails = await response.json();
    console.log("inside loadRoom" + CURRENT_ROOM)
    if(roomDetails) {
      const roomNameElement = document.querySelector('.displayRoomName strong');
      const editRoomNameSection = document.querySelector('.editRoomName');
      const inviteLink = document.getElementById('roomInviteLink');
      const editRoomNameIcon = document.getElementById('roomChangeIcon');
      const editRoomNameButton = document.getElementById('updateRoomName');
      const postButton = document.getElementById('postComment');
      let currentPostButtonClickHandler;

      editRoomNameSection.classList.add('hide');
      editRoomNameIcon.removeEventListener('click', toggleEditRoomSection);
      editRoomNameIcon.addEventListener('click', toggleEditRoomSection);

      editRoomNameButton.removeEventListener('click', handleEditRoomNameClick);
      editRoomNameButton.addEventListener('click', handleEditRoomNameClick);
      
      if (currentPostButtonClickHandler) {
        postButton.removeEventListener('click', currentPostButtonClickHandler);
      }
      currentPostButtonClickHandler = handlePostButtonClick(roomId);
      postButton.addEventListener('click', currentPostButtonClickHandler);

      roomNameElement.textContent = roomDetails.room_name;
      inviteLink.textContent = `/rooms/${roomId}`;
      loadRoomMessages(roomId);
      startMessagePolling(roomId);
    }
    // console.log("tried to load room")
  } catch (error) {
    console.error('Error loading rooms:', error);
  }
}


// helper function to toggle the edit button in a room
function toggleEditRoomSection(event) {
  event.preventDefault();
  document.querySelector('.editRoomName').classList.toggle('hide');
}


// helper function for room edit
function handleEditRoomNameClick() {
  const new_name = document.querySelector('.editRoomName input').value;
  updateRoomName(new_name);
}

// helper function
function handlePostButtonClick(roomId) {
  return async function() {
      const commentBox = document.getElementById('comment');
      const comment = commentBox.value.trim();
      if (comment) {
          await postMessage(comment, roomId);
          commentBox.value = ''; // Clear the textarea after posting
      } else {
          alert("Please enter a comment before posting.");
      }
  }
}

// function for updating room name
async function updateRoomName(new_name) {
  api_key = localStorage.getItem('api_key');
  try { 
    const response = await fetch(`/api/rooms/${CURRENT_ROOM}`, {
      method: 'POST', 
      headers: {
        'Content-Type': 'application/json',
        'API-Key': api_key
      },  
      body: JSON.stringify({ name: new_name })
    })
    const roomDetails = await response.json();
    const roomNameElement = document.querySelector('.displayRoomName strong');
    roomNameElement.textContent = roomDetails.room_name
  } catch (error) {
    console.error('Error updating room name:', error);
  }
}

// function for loading room messages
async function loadRoomMessages(roomId) {
  api_key = localStorage.getItem('api_key');
  const messagesContainer = document.querySelector('.messages');
  console.log("inside loadRoomMessages", CURRENT_ROOM);
  while (messagesContainer.firstChild) {
      messagesContainer.removeChild(messagesContainer.firstChild);
  }
  try { 
    const response = await fetch(`/api/rooms/${roomId}/messages`, {
      method: 'GET', 
      headers: {
        'Content-Type': 'application/json',
        'API-Key': api_key
      }
    })
    const messages = await response.json();
    messages.forEach(msg => {createMessageElement(msg);});    
  } catch (error) {
    console.error('Error getting chats:', error);
  }
}

// function for creating message elements
function createMessageElement(msg) {
  const messageElement = document.createElement('message');
  const authorElement = document.createElement('author');
  authorElement.textContent = msg.name;

  const contentElement = document.createElement('content');
  contentElement.textContent = msg.body;

  messageElement.appendChild(authorElement);
  messageElement.appendChild(contentElement);

  document.querySelector('.messages').appendChild(messageElement);
}

// function for posting messages
async function postMessage(message, room_id) {
  api_key = localStorage.getItem('api_key');
  try {
    const response = await fetch(`/api/rooms/${room_id}/messages`, {
      method: 'POST', 
      headers: {
        'Content-Type': 'application/json',
        'API-Key': api_key
      }, 
      body: JSON.stringify({ message: message })
    })
  } catch (error) {
    console.error('Error posting message:', error);
  }
}


// Add event listeners
document.addEventListener('DOMContentLoaded', async function() {
  await checkCredentials();
  loginStateUpdateUI();
  getRooms();
  router();

  window.addEventListener('popstate', (event) => {
    console.log("Popstate event triggered", event.state);
    router();
  });

  const signupButton = document.querySelector('.signup');
  const logoutButton = document.querySelector('.exit.logout');
  const createRoomButton = document.querySelector('.create');
  const updateUsernameButton = document.getElementById('updateUsername');
  const updatePasswordButton = document.getElementById('updatePassword');
  const goToSplashButton = document.querySelector('.exit.goToSplash');
  const loginButton = document.getElementById('loginButton');
  
  document.querySelector('.failed').style.display = 'none';

  signupButton.addEventListener('click', function() {
    oneClickSignup(); 
  });
  logoutButton.addEventListener('click', function() {
    logout();
  })
  createRoomButton.addEventListener('click', function() {
    createRoom(); 
  })
  updateUsernameButton.addEventListener('click', function() {
    const username = document.getElementById('updateUsernameInput').value;
    updateUsername(username);
  })
  updatePasswordButton.addEventListener('click', function() {
    const password = document.getElementById('updatePasswordInput').value;
    updatePassword(password);
  })
  goToSplashButton.addEventListener('click', function() {
    history.pushState({}, '', '/');
    router();
  });
  loginButton.addEventListener('click', function() {
    const login_username = document.getElementById('loginUsernameInput').value;
    const login_password = document.getElementById('loginPasswordInput').value;
    attemptLogin(login_username, login_password);
  })
});


function startMessagePolling() {
  // Clear any existing interval to avoid multiple intervals running for the same room
  if (messagePollingInterval) clearInterval(messagePollingInterval);

  messagePollingInterval = setInterval(() => {
    // If we're not in a room, don't query for messages
    if (CURRENT_ROOM == 0) return;

    loadRoomMessages(CURRENT_ROOM);
  }, 500); 
}



// 
//setInterval(500, () => {
  // If we're not in a room, don't query for messages
  //if (CURRENT_ROOM == 0) return;

  // fetch("/api/messages/room/"+CURRENT_ROOM)
//});